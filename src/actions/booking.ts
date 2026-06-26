"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/actions/auth";

interface CreateBookingParams {
  tenantSlug: string;
  serviceId: string;
  employeeId: string;
  dateStr: string; // "YYYY-MM-DD"
  timeStr: string; // "HH:MM"
  clientName: string;
  clientPhone: string;
}

export async function createBooking(data: CreateBookingParams) {
  try {
    // 1. Encontrar o Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug }
    });

    if (!tenant) {
      throw new Error("Barbearia não encontrada.");
    }

    // 2. Lidar com o Cliente (Buscar por telefone ou criar novo)
    // Em um cenário real mais robusto, aqui teríamos validação por OTP
    let client = await prisma.client.findUnique({
      where: { phone: data.clientPhone }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: data.clientName,
          phone: data.clientPhone,
        }
      });
    }

    // 3. Montar o objeto de Data final (Date + Time)
    const bookingDate = new Date(`${data.dateStr}T${data.timeStr}:00.000Z`);

    // 4. Criar o Agendamento
    const newBooking = await prisma.booking.create({
      data: {
        date: bookingDate,
        status: "CONFIRMED", // MVP: Confirmação direta sem OTP
        tenantId: tenant.id,
        serviceId: data.serviceId,
        employeeId: data.employeeId,
        clientId: client.id,
      }
    });

    // Revalidar páginas de admin e reserva
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath(`/${data.tenantSlug}/book`);

    return { success: true, bookingId: newBooking.id };

  } catch (error: any) {
    console.error("Erro ao criar agendamento:", error);
    return { success: false, error: error.message || "Ocorreu um erro ao salvar o agendamento." };
  }
}

async function getDefaultTenant() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Brutus Barbearia",
        slug: "brutusbarbearia",
        description: "A melhor barbearia da região.",
      }
    });
  }
  return tenant.id;
}

export async function getDashboardStats(view: string = "daily") {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado");
  const tenantId = session.tenantId;

  // 1. Obter datas fundamentais no fuso de SP
  const now = new Date();
  const dateInBr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  const [day, month, year] = dateInBr.split('/');
  
  const todayMidday = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  const dateStr = `${year}-${month}-${day}`;

  const startOfToday = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfToday = new Date(`${dateStr}T23:59:59.999Z`);

  // Configurar intervalos com base no filtro selecionado (daily, weekly, monthly)
  let rangeStart = startOfToday;
  let rangeEnd = endOfToday;

  if (view === "weekly") {
    const currentDayOfWeek = todayMidday.getUTCDay();
    const dayOffsetToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(todayMidday);
    monday.setUTCDate(todayMidday.getUTCDate() + dayOffsetToMonday);
    
    rangeStart = new Date(`${monday.toISOString().split('T')[0]}T00:00:00.000Z`);
    
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    rangeEnd = new Date(`${sunday.toISOString().split('T')[0]}T23:59:59.999Z`);
  } else if (view === "monthly") {
    rangeStart = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    rangeEnd = new Date(`${year}-${month}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`);
  }

  // 2. Buscar agendamentos do intervalo selecionado
  const rangeWhereClause: any = {
    tenantId,
    date: {
      gte: rangeStart,
      lte: rangeEnd
    }
  };
  if (!session.isAdmin) {
    rangeWhereClause.employeeId = session.userId;
  }

  const rangeBookings = await prisma.booking.findMany({
    where: rangeWhereClause,
    include: {
      service: true
    }
  });

  const bookingsCount = rangeBookings.filter(b => b.status !== 'CANCELLED').length;
  const revenue = rangeBookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.service.price, 0);

  // Novos clientes no intervalo
  const clientRangeWhereClause: any = {
    createdAt: {
      gte: rangeStart,
      lte: rangeEnd
    }
  };
  if (!session.isAdmin) {
    clientRangeWhereClause.bookings = {
      some: {
        employeeId: session.userId,
        date: {
          gte: rangeStart,
          lte: rangeEnd
        }
      }
    };
  }
  const newClientsCount = await prisma.client.count({
    where: clientRangeWhereClause
  });

  // 3. Faturamento Hoje (sempre diário) - Requisitado: "Com o faturamento do dia"
  const todayWhereClause: any = {
    tenantId,
    status: 'CONFIRMED',
    date: {
      gte: startOfToday,
      lte: endOfToday
    }
  };
  if (!session.isAdmin) {
    todayWhereClause.employeeId = session.userId;
  }
  const todayBookings = await prisma.booking.findMany({
    where: todayWhereClause,
    include: {
      service: true
    }
  });
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.service.price, 0);

  // 4. Próximos horários hoje (todos os ativos hoje)
  const upcomingWhereClause: any = {
    tenantId,
    date: {
      gte: startOfToday,
      lte: endOfToday
    }
  };
  if (!session.isAdmin) {
    upcomingWhereClause.employeeId = session.userId;
  }
  const todayAllBookings = await prisma.booking.findMany({
    where: upcomingWhereClause,
    include: {
      service: true,
      employee: true,
      client: true
    },
    orderBy: {
      date: 'asc'
    }
  });
  const upcomingBookings = todayAllBookings.filter(b => b.status !== 'CANCELLED');

  // 5. Histórico de faturamento dos últimos 6 meses para tendência mensal
  const chartData = [];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(todayMidday);
    d.setUTCMonth(todayMidday.getUTCMonth() - i);
    d.setUTCDate(1);

    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const mStr = m.toString().padStart(2, '0');
    const label = `${monthNames[d.getUTCMonth()]}/${y.toString().slice(-2)}`;

    const startM = new Date(`${y}-${mStr}-01T00:00:00.000Z`);
    const lastDayM = new Date(y, m, 0).getDate();
    const endM = new Date(`${y}-${mStr}-${lastDayM.toString().padStart(2, '0')}T23:59:59.999Z`);

    const monthBookings = await prisma.booking.findMany({
      where: {
        tenantId,
        employeeId: !session.isAdmin ? session.userId : undefined,
        status: 'CONFIRMED',
        date: {
          gte: startM,
          lte: endM
        }
      },
      include: {
        service: true
      }
    });

    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.service.price, 0);
    chartData.push({ monthLabel: label, revenue: monthRevenue });
  }

  // Comparação de faturamento com o mês anterior
  const thisMonthRevenue = chartData[5].revenue;
  const lastMonthRevenue = chartData[4].revenue;
  let percentageChange = 0;
  if (lastMonthRevenue > 0) {
    percentageChange = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  } else if (thisMonthRevenue > 0) {
    percentageChange = 100;
  }

  return {
    bookingsCount,
    revenue,
    newClientsCount,
    todayRevenue,
    upcomingBookings,
    chartData,
    percentageChange,
    thisMonthRevenue,
    lastMonthRevenue
  };
}

export async function getBookings(filters?: { status?: string; date?: string; search?: string }) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado");
  const tenantId = session.tenantId;

  const whereClause: any = {
    tenantId
  };

  // Se não for admin, filtra os agendamentos pelo profissional logado
  if (!session.isAdmin) {
    whereClause.employeeId = session.userId;
  }

  if (filters?.status && filters.status !== 'ALL') {
    whereClause.status = filters.status;
  }

  if (filters?.date) {
    const startOfDay = new Date(`${filters.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${filters.date}T23:59:59.999Z`);
    whereClause.date = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (filters?.search) {
    whereClause.client = {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } }
      ]
    };
  }

  return await prisma.booking.findMany({
    where: whereClause,
    include: {
      client: true,
      service: true,
      employee: true
    },
    orderBy: {
      date: 'desc'
    }
  });
}

export async function updateBookingStatus(bookingId: string, status: string) {
  try {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autenticado");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    if (booking.tenantId !== session.tenantId) {
      return { success: false, error: "Acesso negado a este estabelecimento." };
    }

    // Se não for admin, só pode alterar se for o próprio profissional
    if (!session.isAdmin && booking.employeeId !== session.userId) {
      return { success: false, error: "Você só pode alterar seus próprios agendamentos." };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao atualizar status do agendamento:", error);
    return { success: false, error: error.message || "Erro ao atualizar status." };
  }
}

export async function deleteBooking(bookingId: string) {
  try {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autenticado");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    if (booking.tenantId !== session.tenantId) {
      return { success: false, error: "Acesso negado a este estabelecimento." };
    }

    // Se não for admin, só pode excluir se for o próprio profissional
    if (!session.isAdmin && booking.employeeId !== session.userId) {
      return { success: false, error: "Você só pode excluir seus próprios agendamentos." };
    }

    await prisma.booking.delete({
      where: { id: bookingId }
    });
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao deletar agendamento:", error);
    return { success: false, error: error.message || "Erro ao deletar agendamento." };
  }
}
