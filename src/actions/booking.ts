"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentSession, getCurrentClientSession } from "@/actions/auth";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { getAvailableSlots } from "@/actions/availability";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

interface CreateBookingParams {
  tenantSlug: string;
  serviceId: string;
  employeeId: string;
  dateStr: string; // "YYYY-MM-DD"
  timeStr: string; // "HH:MM"
  clientName: string;
  clientPhone: string;
  customerSubscriptionId?: string;
  captchaToken?: string;
}

export async function createBooking(data: CreateBookingParams) {
  try {
    const clientSession = await getCurrentClientSession();
    if (!clientSession) {
      throw new Error("Cliente não autenticado. Verifique seu telefone antes de agendar.");
    }

    // 1. Encontrar o Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug }
    });

    if (!tenant) {
      throw new Error("Barbearia não encontrada.");
    }

    if (!tenant.isActive) {
      throw new Error("Este estabelecimento está indisponível no momento.");
    }

    // 2. Garantir que o cliente da sessão é o mesmo que está tentando agendar
    const cleanPhone = data.clientPhone.replace(/\D/g, "");
    if (clientSession.clientId !== undefined) {
      const currentClient = await prisma.client.findUnique({
        where: { id: clientSession.clientId },
      });

      if (!currentClient) {
        throw new Error("Sessão do cliente inválida. Faça login novamente.");
      }

      if (currentClient.phone.replace(/\D/g, "") !== cleanPhone) {
        throw new Error("O telefone informado não corresponde à sessão autenticada.");
      }
    }

    const bookingRateLimit = await assertRateLimit(
      `booking:create:phone:${cleanPhone}:${tenant.slug}`,
      {
        limit: 5,
        windowMs: 60 * 60 * 1000,
        blockMs: 2 * 60 * 60 * 1000,
      }
    );

    if (!bookingRateLimit.allowed) {
      throw new Error("Muitas marcações em pouco tempo. Tente novamente mais tarde.");
    }

    const captchaResult = await verifyTurnstileToken(data.captchaToken);
    if (!captchaResult.success) {
      throw new Error(captchaResult.error);
    }

    // 3. Montar o objeto de Data final (Date + Time)
    const bookingDate = new Date(`${data.dateStr}T${data.timeStr}:00.000Z`);
    if (Number.isNaN(bookingDate.getTime())) {
      throw new Error("Data ou horário inválidos.");
    }

    const bookingResult = await prisma.$transaction(async (tx) => {
      await acquireEmployeeDayLock(tx, `booking:${tenant.id}:${data.employeeId}:${data.dateStr}`);

      const serviceRecord = await tx.service.findFirst({
        where: {
          id: data.serviceId,
          tenantId: tenant.id,
        },
        include: {
          employees: true,
        },
      });

      if (!serviceRecord) {
        throw new Error("Serviço inválido para este estabelecimento.");
      }

      const employeeRecord = await tx.employee.findFirst({
        where: {
          id: data.employeeId,
          tenantId: tenant.id,
        },
        include: {
          services: true,
        },
      });

      if (!employeeRecord) {
        throw new Error("Profissional inválido para este estabelecimento.");
      }

      if (!employeeRecord.services.some((svc) => svc.id === serviceRecord.id)) {
        throw new Error("Este profissional não atende o serviço selecionado.");
      }

      const availableSlots = await getAvailableSlots(employeeRecord.id, data.dateStr, serviceRecord.duration, tx);
      if (!availableSlots.includes(data.timeStr)) {
        throw new Error("O horário selecionado não está mais disponível.");
      }

      const client = await tx.client.findUnique({
        where: { id: clientSession.clientId },
      });

      if (!client) {
        throw new Error("Cliente não encontrado.");
      }

      let customerSubscription: { id: string } | null = null;
      if (data.customerSubscriptionId) {
        customerSubscription = await tx.customerSubscription.findFirst({
          where: {
            id: data.customerSubscriptionId,
            tenantId: tenant.id,
            clientId: client.id,
            status: "ACTIVE",
            remainingSlots: { gt: 0 },
          },
          select: { id: true },
        });

        if (!customerSubscription) {
          throw new Error("A assinatura informada está inválida ou sem créditos.");
        }
      }

      const newBooking = await tx.booking.create({
        data: {
          date: bookingDate,
          status: "CONFIRMED",
          tenantId: tenant.id,
          serviceId: serviceRecord.id,
          employeeId: employeeRecord.id,
          clientId: client.id,
          customerSubscriptionId: customerSubscription?.id || null,
        },
      });

      if (customerSubscription) {
        await tx.customerSubscription.update({
          where: { id: customerSubscription.id },
          data: { remainingSlots: { decrement: 1 } },
        });
      }

      return {
        bookingId: newBooking.id,
        serviceName: serviceRecord.name,
        employeeName: employeeRecord.name,
        clientName: client.name,
        clientPhone: client.phone,
      };
    });

    // Trigger WhatsApp Confirmation
    try {
      const formatDateBR = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(date);
      };
      const formatTimeBR = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(date);
      };

      await sendWhatsappMessage({
        tenantId: tenant.id,
        recipient: bookingResult.clientPhone,
        type: "CONFIRMATION",
        data: {
          clientName: bookingResult.clientName,
          serviceName: bookingResult.serviceName,
          employeeName: bookingResult.employeeName,
          dateStr: formatDateBR(bookingDate),
          timeStr: formatTimeBR(bookingDate)
        }
      });
    } catch (err) {
      console.error("Falha ao disparar whatsapp de confirmação:", err);
    }

    // Revalidar páginas de admin e reserva
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath(`/${data.tenantSlug}/book`);

    return { success: true, bookingId: bookingResult.bookingId };

  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    const message = error instanceof Error ? error.message : "Ocorreu um erro ao salvar o agendamento.";
    return { success: false, error: message };
  }
}

export async function getDashboardStats(view: string = "daily") {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado");
  const tenantId = session.tenantId;

  // Obter taxa de comissão se for colaborador
  let commissionRate = 50.0;
  if (!session.isAdmin) {
    const employee = await prisma.employee.findUnique({
      where: { id: session.userId }
    });
    commissionRate = employee?.commissionRate ?? 50.0;
  }

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
  const rangeWhereClause: Prisma.BookingWhereInput = {
    tenantId,
    date: {
      gte: rangeStart,
      lte: rangeEnd
    },
    ...( !session.isAdmin ? { employeeId: session.userId } : {} )
  };

  const rangeBookings = await prisma.booking.findMany({
    where: rangeWhereClause,
    include: {
      service: true
    }
  });

  const bookingsCount = rangeBookings.filter(b => b.status !== 'CANCELLED').length;
  const revenue = rangeBookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (session.isAdmin ? b.service.price : (b.service.price * commissionRate / 100)), 0);

  // Novos clientes no intervalo (removida a restrição de data do agendamento para contar corretamente clientes que agendam em outras datas)
  const clientRangeWhereClause: Prisma.ClientWhereInput = {
    createdAt: {
      gte: rangeStart,
      lte: rangeEnd
    },
    bookings: {
      some: {
        tenantId,
        ...( !session.isAdmin ? { employeeId: session.userId } : {} )
      }
    }
  };
  const newClientsCount = await prisma.client.count({
    where: clientRangeWhereClause
  });

  // 3. Faturamento Hoje (sempre diário) - Requisitado: "Com o faturamento do dia"
  const todayWhereClause: Prisma.BookingWhereInput = {
    tenantId,
    status: 'CONFIRMED',
    date: {
      gte: startOfToday,
      lte: endOfToday
    },
    ...( !session.isAdmin ? { employeeId: session.userId } : {} )
  };
  const todayBookings = await prisma.booking.findMany({
    where: todayWhereClause,
    include: {
      service: true
    }
  });
  const todayRevenue = todayBookings.reduce((sum, b) => sum + (session.isAdmin ? b.service.price : (b.service.price * commissionRate / 100)), 0);

  // 4. Próximos horários hoje (todos os ativos hoje)
  const upcomingWhereClause: Prisma.BookingWhereInput = {
    tenantId,
    date: {
      gte: startOfToday,
      lte: endOfToday
    },
    ...( !session.isAdmin ? { employeeId: session.userId } : {} )
  };
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
    d.setUTCDate(1); // Ajusta o dia para 1 primeiro para evitar problemas de virada de mês com durações diferentes (ex: Fev 29)
    d.setUTCMonth(d.getUTCMonth() - i);

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

    const monthRevenue = monthBookings.reduce((sum, b) => sum + (session.isAdmin ? b.service.price : (b.service.price * commissionRate / 100)), 0);
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

  const whereClause: Prisma.BookingWhereInput = {
    tenantId,
    ...( !session.isAdmin ? { employeeId: session.userId } : {} ),
    ...( (filters?.status && filters.status !== 'ALL') ? { status: filters.status } : {} ),
    ...( filters?.date ? {
      date: {
        gte: new Date(`${filters.date}T00:00:00.000Z`),
        lte: new Date(`${filters.date}T23:59:59.999Z`)
      }
    } : {} ),
    ...( filters?.search ? {
      client: {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } }
        ]
      }
    } : {} )
  };

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
      where: { id: bookingId },
      include: {
        client: true,
        employee: true,
        service: true,
        tenant: true
      }
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

    // Se estiver mudando para CANCELLED e ainda não estava CANCELLED, devolver créditos e notificar
    if (status === "CANCELLED" && booking.status !== "CANCELLED") {
      if (booking.customerSubscriptionId) {
        await prisma.customerSubscription.update({
          where: { id: booking.customerSubscriptionId },
          data: { remainingSlots: { increment: 1 } }
        });
      }

      if (booking.tenant.whatsappEnabled && booking.tenant.whatsappCancelNotifyEnabled && booking.employee.phone) {
        try {
          const formatDateBR = (date: Date) => {
            return new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }).format(date);
          };
          const formatTimeBR = (date: Date) => {
            return new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).format(date);
          };

          await sendWhatsappMessage({
            tenantId: booking.tenantId,
            recipient: booking.employee.phone,
            type: "CANCEL_NOTIFICATION",
            data: {
              clientName: booking.client.name,
              serviceName: booking.service.name,
              employeeName: booking.employee.name,
              dateStr: formatDateBR(booking.date),
              timeStr: formatTimeBR(booking.date)
            }
          });
        } catch (err) {
          console.error("Falha ao enviar notificação de cancelamento ao profissional:", err);
        }
      }
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
    return { success: false, error: message };
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

    // Devolver crédito de plano se deletar reserva ativa
    if (booking.customerSubscriptionId && booking.status !== "CANCELLED") {
      await prisma.customerSubscription.update({
        where: { id: booking.customerSubscriptionId },
        data: { remainingSlots: { increment: 1 } }
      });
    }

    await prisma.booking.delete({
      where: { id: bookingId }
    });
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    const message = error instanceof Error ? error.message : "Erro ao deletar agendamento.";
    return { success: false, error: message };
  }
}

export async function cancelBooking(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        employee: true,
        service: true,
        tenant: true
      }
    });

    if (!booking) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    // Devolver crédito se estiver ativo
    if (booking.customerSubscriptionId && booking.status !== "CANCELLED") {
      await prisma.customerSubscription.update({
        where: { id: booking.customerSubscriptionId },
        data: { remainingSlots: { increment: 1 } }
      });
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });

    // Notificar profissional
    if (booking.tenant.whatsappEnabled && booking.tenant.whatsappCancelNotifyEnabled && booking.employee.phone) {
      try {
        const formatDateBR = (date: Date) => {
          return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).format(date);
        };
        const formatTimeBR = (date: Date) => {
          return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(date);
        };

        await sendWhatsappMessage({
          tenantId: booking.tenantId,
          recipient: booking.employee.phone,
          type: "CANCEL_NOTIFICATION",
          data: {
            clientName: booking.client.name,
            serviceName: booking.service.name,
            employeeName: booking.employee.name,
            dateStr: formatDateBR(booking.date),
            timeStr: formatTimeBR(booking.date)
          }
        });
      } catch (err) {
        console.error("Falha ao enviar notificação de cancelamento ao profissional:", err);
      }
    }
    
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath(`/${booking.tenant.slug}/perfil`);
    revalidatePath(`/${booking.tenant.slug}/book`);
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return { success: false, error: "Erro ao cancelar agendamento." };
  }
}
