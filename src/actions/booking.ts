"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentSession, getCurrentClientSession } from "@/actions/auth";
import { getAvailableSlots } from "@/actions/availability";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { recordAuditEvent } from "@/lib/audit";
import { refundSubscriptionCredit } from "@/lib/credit-ledger";
import { enqueueWhatsappMessage } from "@/lib/whatsapp-outbox";
import { createBookingForClient } from "@/lib/booking-service";
import { addScheduleCalendarDays, calendarDateString, formatScheduleDate, formatScheduleTime, scheduleDateTime, scheduleDayBounds, scheduleInstant, scheduleMonthBounds, scheduleParts, type BookingTimeMode } from "@/lib/schedule-time";

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

const bookingTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
};

function hasReceptionDeskAccess(session: { isAdmin: boolean; accessRole?: string }) {
  return session.isAdmin || session.accessRole === "RECEPTION";
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
        blockMs: 30 * 60 * 1000,
      }
    );

    if (!bookingRateLimit.allowed) {
      const minutes = Math.ceil(bookingRateLimit.retryAfterSeconds / 60);
      const timeMsg = minutes > 1 ? `${minutes} minutos` : `${bookingRateLimit.retryAfterSeconds} segundos`;
      throw new Error(`Muitas tentativas de agendamento em pouco tempo. Por favor, aguarde ${timeMsg} para tentar novamente.`);
    }

    const captchaResult = await verifyTurnstileToken(data.captchaToken);
    if (!captchaResult.success) {
      throw new Error(captchaResult.error);
    }

    const bookingResult = await createBookingForClient({
      tenantSlug: data.tenantSlug, serviceId: data.serviceId, employeeId: data.employeeId,
      dateStr: data.dateStr, timeStr: data.timeStr, clientId: clientSession.clientId,
      customerSubscriptionId: data.customerSubscriptionId,
    });

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
  const tenantSchedule = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenantSchedule) throw new Error("Estabelecimento não encontrado.");
  const timeZone = tenantSchedule.timezone;
  const bookingTimeMode = tenantSchedule.bookingTimeMode as BookingTimeMode;

  // Obter taxa de comissão se for colaborador
  let commissionRate = 50.0;
  if (!session.isAdmin) {
    const employee = await prisma.employee.findUnique({
      where: { id: session.userId }
    });
    commissionRate = employee?.commissionRate ?? 50.0;
  }

  // 1. Obter datas fundamentais no fuso configurado no estabelecimento
  const now = new Date();
  const dateStr = calendarDateString(now, timeZone);
  const todayBounds = scheduleDayBounds(dateStr, timeZone, bookingTimeMode);
  const { year, month } = scheduleParts(now, timeZone, "IANA_UTC");

  // Configurar intervalos com base no filtro selecionado (daily, weekly, monthly)
  let rangeStart = todayBounds.start;
  let rangeEnd = todayBounds.end;
  let createdAtRange = scheduleDayBounds(dateStr, timeZone, "IANA_UTC");

  if (view === "weekly") {
    const currentDayOfWeek = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
    const dayOffsetToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = addScheduleCalendarDays(dateStr, dayOffsetToMonday);
    const sunday = addScheduleCalendarDays(monday, 6);
    rangeStart = scheduleDayBounds(monday, timeZone, bookingTimeMode).start;
    rangeEnd = scheduleDayBounds(sunday, timeZone, bookingTimeMode).end;
    createdAtRange = { start: scheduleDayBounds(monday, timeZone, "IANA_UTC").start, end: scheduleDayBounds(sunday, timeZone, "IANA_UTC").end };
  } else if (view === "monthly") {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthSample = scheduleDateTime(firstDay, "12:00", timeZone, bookingTimeMode);
    ({ start: rangeStart, end: rangeEnd } = scheduleMonthBounds(monthSample, timeZone, bookingTimeMode));
    const actualMonthSample = scheduleDateTime(firstDay, "12:00", timeZone, "IANA_UTC");
    createdAtRange = scheduleMonthBounds(actualMonthSample, timeZone, "IANA_UTC");
  }

  // 2. Buscar agendamentos do intervalo selecionado
  const rangeWhereClause: Prisma.BookingWhereInput = {
    tenantId,
    date: {
      gte: rangeStart,
      lte: rangeEnd
    },
    ...( !hasReceptionDeskAccess(session) ? { employeeId: session.userId } : {} )
  };

  const rangeBookings = await prisma.booking.findMany({
    where: rangeWhereClause,
    include: {
      service: true
    }
  });

  const bookingsCount = rangeBookings.filter(b => b.status !== 'CANCELLED').length;
  const revenue = rangeBookings
    .filter(b => ["CONFIRMED", "COMPLETED"].includes(b.status))
    .reduce((sum, b) => sum + (session.isAdmin ? b.service.price : (b.service.price * commissionRate / 100)), 0);

  // Novos clientes no intervalo (removida a restrição de data do agendamento para contar corretamente clientes que agendam em outras datas)
  const clientRangeWhereClause: Prisma.ClientWhereInput = {
    createdAt: {
      gte: createdAtRange.start,
      lte: createdAtRange.end
    },
    bookings: {
      some: {
        tenantId,
        ...( !hasReceptionDeskAccess(session) ? { employeeId: session.userId } : {} )
      }
    }
  };
  const newClientsCount = await prisma.client.count({
    where: clientRangeWhereClause
  });

  // 3. Faturamento Hoje (sempre diário) - Requisitado: "Com o faturamento do dia"
  const todayWhereClause: Prisma.BookingWhereInput = {
    tenantId,
    status: { in: ["CONFIRMED", "COMPLETED"] },
    date: { gte: todayBounds.start, lte: todayBounds.end },
    ...( !hasReceptionDeskAccess(session) ? { employeeId: session.userId } : {} )
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
    date: { gte: todayBounds.start, lte: todayBounds.end },
    ...( !hasReceptionDeskAccess(session) ? { employeeId: session.userId } : {} )
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
    const d = new Date(Date.UTC(year, month - 1 - i, 1, 12));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const mStr = m.toString().padStart(2, "0");
    const label = `${monthNames[d.getUTCMonth()]}/${y.toString().slice(-2)}`;
    const monthSample = scheduleDateTime(`${y}-${mStr}-01`, "12:00", timeZone, bookingTimeMode);
    const { start: startM, end: endM } = scheduleMonthBounds(monthSample, timeZone, bookingTimeMode);

    const monthBookings = await prisma.booking.findMany({
      where: {
        tenantId,
        employeeId: !hasReceptionDeskAccess(session) ? session.userId : undefined,
        status: { in: ["CONFIRMED", "COMPLETED"] },
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
    lastMonthRevenue,
    timeZone,
    bookingTimeMode,
  };
}

export async function getBookings(filters?: { status?: string; date?: string; search?: string }) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado");
  const tenantId = session.tenantId;
  const tenantSchedule = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenantSchedule) throw new Error("Estabelecimento não encontrado.");
  const bookingTimeMode = tenantSchedule.bookingTimeMode as BookingTimeMode;
  const filterBounds = filters?.date ? scheduleDayBounds(filters.date, tenantSchedule.timezone, bookingTimeMode) : null;

  const whereClause: Prisma.BookingWhereInput = {
    tenantId,
    ...( !hasReceptionDeskAccess(session) ? { employeeId: session.userId } : {} ),
    ...( (filters?.status && filters.status !== 'ALL') ? { status: filters.status } : {} ),
    ...( filterBounds ? { date: { gte: filterBounds.start, lte: filterBounds.end } } : {} ),
    ...( filters?.search ? {
      client: {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } }
        ]
      }
    } : {} )
  };

  const bookings = await prisma.booking.findMany({
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
  return { bookings, timeZone: tenantSchedule.timezone, bookingTimeMode };
}

export async function updateBookingStatus(bookingId: string, status: string) {
  try {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autenticado");

    if (!['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(status)) {
      return { success: false, error: "Status de agendamento inválido." };
    }

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
    if (!hasReceptionDeskAccess(session) && booking.employeeId !== session.userId) {
      return { success: false, error: "Você só pode alterar seus próprios agendamentos." };
    }

    if (!bookingTransitions[booking.status]?.includes(status)) {
      return { success: false, error: "Essa alteração de status não é permitida." };
    }

    // Se estiver mudando para CANCELLED e ainda não estava CANCELLED, devolver créditos e notificar
    if (status === "CANCELLED" && booking.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        if (booking.customerSubscriptionId) {
          await refundSubscriptionCredit(tx, booking.customerSubscriptionId, booking.id);
        }
        if (booking.tenant.whatsappEnabled && booking.tenant.whatsappCancelNotifyEnabled && booking.employee.phone) {
          await enqueueWhatsappMessage(tx, {
            tenantId: booking.tenantId,
            eventKey: `booking:${booking.id}:cancel-notification`,
            bookingId: booking.id,
            recipient: booking.employee.phone,
            type: "CANCEL_NOTIFICATION",
            data: {
              clientName: booking.client.name,
              serviceName: booking.service.name,
              employeeName: booking.employee.name,
              dateStr: formatScheduleDate(booking.date, booking.tenant.timezone, booking.tenant.bookingTimeMode as BookingTimeMode),
              timeStr: formatScheduleTime(booking.date, booking.tenant.timezone, booking.tenant.bookingTimeMode as BookingTimeMode),
            },
          });
        }
        await tx.booking.update({ where: { id: bookingId }, data: { status, cancelledAt: new Date() } });
      });
      await recordAuditEvent({
        tenantId: booking.tenantId,
        actorId: session.userId,
        actorRole: session.isAdmin ? "ADMIN" : "EMPLOYEE",
        action: "BOOKING_CANCELLED",
        entityType: "BOOKING",
        entityId: booking.id,
      });

    }

    if (status !== "CANCELLED") {
      await prisma.booking.update({ where: { id: bookingId }, data: { status } });
      await recordAuditEvent({
        tenantId: booking.tenantId,
        actorId: session.userId,
        actorRole: session.isAdmin ? "ADMIN" : "EMPLOYEE",
        action: "BOOKING_STATUS_UPDATED",
        entityType: "BOOKING",
        entityId: booking.id,
        metadata: { status },
      });
    }
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
    return { success: false, error: message };
  }
}

export async function rescheduleBooking(bookingId: string, dateStr: string, timeStr: string) {
  try {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autenticado.");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.tenantId !== session.tenantId) {
      return { success: false, error: "Agendamento não encontrado." };
    }
    const tenantSchedule = await prisma.tenant.findUnique({ where: { id: booking.tenantId }, select: { timezone: true, bookingTimeMode: true, cancellationLeadMinutes: true } });
    if (!tenantSchedule) return { success: false, error: "Estabelecimento não encontrado." };
    const newDate = scheduleDateTime(dateStr, timeStr, tenantSchedule.timezone, tenantSchedule.bookingTimeMode as BookingTimeMode);
    const newBookingInstant = scheduleInstant(newDate, tenantSchedule.timezone, tenantSchedule.bookingTimeMode as BookingTimeMode);
    if (Number.isNaN(newBookingInstant.getTime()) || newBookingInstant.getTime() <= Date.now()) return { success: false, error: "Informe um horário futuro válido." };
    if (!hasReceptionDeskAccess(session) && booking.employeeId !== session.userId) {
      return { success: false, error: "Você só pode reagendar seus próprios atendimentos." };
    }
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return { success: false, error: "Este atendimento não pode ser reagendado." };
    }
    const currentBookingInstant = scheduleInstant(booking.date, tenantSchedule.timezone, tenantSchedule.bookingTimeMode as BookingTimeMode);
    if (currentBookingInstant.getTime() - Date.now() < tenantSchedule.cancellationLeadMinutes * 60_000) {
      return { success: false, error: "O prazo para cancelamento deste atendimento já expirou." };
    }

    const currentDate = currentBookingInstant.toISOString();
    if (currentDate === newBookingInstant.toISOString()) {
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      await acquireEmployeeDayLock(tx, `booking:${booking.id}`);
      await acquireEmployeeDayLock(tx, `booking:${booking.tenantId}:${booking.employeeId}:${dateStr}`);

      const slots = await getAvailableSlots(
        booking.employeeId,
        dateStr,
        booking.serviceDuration ?? booking.service.duration,
        tx
      );
      if (!slots.includes(timeStr)) {
        throw new Error("O novo horário não está mais disponível.");
      }

      await tx.booking.update({ where: { id: booking.id }, data: { date: newDate } });
    });

    await recordAuditEvent({
      tenantId: booking.tenantId,
      actorId: session.userId,
      actorRole: session.isAdmin ? "ADMIN" : "EMPLOYEE",
      action: "BOOKING_RESCHEDULED",
      entityType: "BOOKING",
      entityId: booking.id,
      metadata: { from: currentBookingInstant.toISOString(), to: newBookingInstant.toISOString() },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/weekly-schedule");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível reagendar.";
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
    if (!hasReceptionDeskAccess(session) && booking.employeeId !== session.userId) {
      return { success: false, error: "Você só pode excluir seus próprios agendamentos." };
    }

    // Devolver crédito de plano se deletar reserva ativa
    await prisma.$transaction(async (tx) => {
      if (booking.customerSubscriptionId && booking.status !== "CANCELLED") {
        await refundSubscriptionCredit(tx, booking.customerSubscriptionId, booking.id);
      }
      await tx.booking.delete({ where: { id: bookingId } });
    });
    await recordAuditEvent({
      tenantId: booking.tenantId,
      actorId: session.userId,
      actorRole: session.isAdmin ? "ADMIN" : "EMPLOYEE",
      action: "BOOKING_DELETED",
      entityType: "BOOKING",
      entityId: booking.id,
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

    const employeeSession = await getCurrentSession();
    const clientSession = await getCurrentClientSession();

    if (!employeeSession && !clientSession) {
      return { success: false, error: "Não autorizado. Faça login para cancelar." };
    }

    if (employeeSession && booking.tenantId !== employeeSession.tenantId) {
      return { success: false, error: "Você não tem permissão para cancelar este agendamento." };
    }
    if (employeeSession && !hasReceptionDeskAccess(employeeSession) && booking.employeeId !== employeeSession.userId) {
      return { success: false, error: "Você só pode cancelar seus próprios agendamentos." };
    }

    if (clientSession && !employeeSession) {
      if (booking.clientId !== clientSession.clientId) {
        return { success: false, error: "Você não tem permissão para cancelar este agendamento." };
      }
    }

    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return { success: false, error: "Este atendimento não pode mais ser cancelado." };
    }
    const bookingInstant = scheduleInstant(booking.date, booking.tenant.timezone, booking.tenant.bookingTimeMode as BookingTimeMode);
    if (bookingInstant.getTime() - Date.now() < booking.tenant.cancellationLeadMinutes * 60_000) {
      return { success: false, error: "O prazo para cancelamento deste atendimento já expirou." };
    }

    // Devolver crédito se estiver ativo
    if (booking.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        if (booking.customerSubscriptionId) {
          await refundSubscriptionCredit(tx, booking.customerSubscriptionId, booking.id);
        }
        if (booking.tenant.whatsappEnabled && booking.tenant.whatsappCancelNotifyEnabled && booking.employee.phone) {
          await enqueueWhatsappMessage(tx, {
            tenantId: booking.tenantId,
            eventKey: `booking:${booking.id}:cancel-notification`,
            bookingId: booking.id,
            recipient: booking.employee.phone,
            type: "CANCEL_NOTIFICATION",
            data: {
              clientName: booking.client.name,
              serviceName: booking.service.name,
              employeeName: booking.employee.name,
              dateStr: formatScheduleDate(booking.date, booking.tenant.timezone, booking.tenant.bookingTimeMode as BookingTimeMode),
              timeStr: formatScheduleTime(booking.date, booking.tenant.timezone, booking.tenant.bookingTimeMode as BookingTimeMode),
            },
          });
        }
        await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      });
      await recordAuditEvent({
        tenantId: booking.tenantId,
        actorId: employeeSession?.userId ?? clientSession?.clientId,
        actorRole: employeeSession ? (employeeSession.isAdmin ? "ADMIN" : "EMPLOYEE") : "CLIENT",
        action: "BOOKING_CANCELLED",
        entityType: "BOOKING",
        entityId: booking.id,
      });
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

