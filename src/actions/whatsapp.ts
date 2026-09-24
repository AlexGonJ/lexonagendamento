"use server";

import prisma from "@/lib/prisma";
import { getCurrentClientSession, getCurrentSession } from "@/actions/auth";
import { 
  sendWhatsappMessage, 
  verifyWhatsappConnection,
  getSafeEvolutionApiUrl,
} from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { recordAuditEvent } from "@/lib/audit";
import { enqueueWhatsappMessage } from "@/lib/whatsapp-outbox";
import { addScheduleCalendarDays, calendarDateString, calendarTimeString, formatScheduleDate, formatScheduleTime, scheduleDateTime, scheduleDayBounds, scheduleInstant, type BookingTimeMode } from "@/lib/schedule-time";

function hasValidCronSecret(providedSecret?: string) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret) return false;

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// Formats a real instant for a tenant's configured timezone.
function formatInstantDateBR(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatInstantTimeBR(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

export async function getWhatsappSettings() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      whatsappEnabled: true,
      whatsappProvider: true,
      whatsappApiUrl: true,
      whatsappNumber: true,
      whatsappWabaId: true,
      whatsappConfirmEnabled: true,
      whatsappConfirmTemplate: true,
      whatsappReminderEnabled: true,
      whatsappReminderHours: true,
      whatsappReminderTemplate: true,
      whatsappInactiveEnabled: true,
      whatsappInactiveDays: true,
      whatsappInactiveTemplate: true,
      whatsappCancelNotifyEnabled: true,
      whatsappCancelNotifyTemplate: true,
    }
  });

  if (!tenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  return { ...tenant, whatsappTokenConfigured: Boolean((await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { whatsappToken: true } }))?.whatsappToken) };
}

interface UpdateWhatsappSettingsData {
  whatsappEnabled: boolean;
  whatsappProvider: string;
  whatsappApiUrl?: string | null;
  whatsappToken?: string | null;
  whatsappNumber?: string | null;
  whatsappWabaId?: string | null;
  whatsappConfirmEnabled: boolean;
  whatsappConfirmTemplate?: string | null;
  whatsappReminderEnabled: boolean;
  whatsappReminderHours: string | number;
  whatsappReminderTemplate?: string | null;
  whatsappInactiveEnabled: boolean;
  whatsappInactiveDays: string | number;
  whatsappInactiveTemplate?: string | null;
  whatsappCancelNotifyEnabled: boolean;
  whatsappCancelNotifyTemplate?: string | null;
}

export async function updateWhatsappSettings(data: UpdateWhatsappSettingsData) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.tenantId;
  const existingToken = (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { whatsappToken: true } }))?.whatsappToken;

  if (!["simulador", "evolution", "meta"].includes(data.whatsappProvider)) {
    throw new Error("Provedor de WhatsApp inválido.");
  }

  if (data.whatsappProvider === "evolution") {
    if (!data.whatsappApiUrl) {
      throw new Error("Informe a URL da Evolution API.");
    }
    await getSafeEvolutionApiUrl(data.whatsappApiUrl);
  }
  if (data.whatsappProvider === "meta") {
    if (!(data.whatsappToken || existingToken) || !data.whatsappNumber) throw new Error("Informe o token e o Phone Number ID da Meta.");
    const activeTemplates = [data.whatsappConfirmEnabled && data.whatsappConfirmTemplate, data.whatsappReminderEnabled && data.whatsappReminderTemplate, data.whatsappInactiveEnabled && data.whatsappInactiveTemplate, data.whatsappCancelNotifyEnabled && data.whatsappCancelNotifyTemplate].filter(Boolean) as string[];
    if (activeTemplates.some((name) => !/^[a-z0-9_]{1,512}$/i.test(name))) throw new Error("Os nomes de templates Meta devem usar apenas letras, números e sublinhado.");
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      whatsappEnabled: data.whatsappEnabled,
      whatsappProvider: data.whatsappProvider,
      whatsappApiUrl: data.whatsappApiUrl || null,
      ...(data.whatsappToken ? { whatsappToken: data.whatsappToken } : {}),
      whatsappNumber: data.whatsappNumber || null,
      whatsappWabaId: data.whatsappWabaId || null,
      whatsappConfirmEnabled: data.whatsappConfirmEnabled,
      whatsappConfirmTemplate: data.whatsappConfirmTemplate,
      whatsappReminderEnabled: data.whatsappReminderEnabled,
      whatsappReminderHours: typeof data.whatsappReminderHours === "string" ? parseInt(data.whatsappReminderHours, 10) || 2 : data.whatsappReminderHours,
      whatsappReminderTemplate: data.whatsappReminderTemplate,
      whatsappInactiveEnabled: data.whatsappInactiveEnabled,
      whatsappInactiveDays: typeof data.whatsappInactiveDays === "string" ? parseInt(data.whatsappInactiveDays, 10) || 30 : data.whatsappInactiveDays,
      whatsappInactiveTemplate: data.whatsappInactiveTemplate,
      whatsappCancelNotifyEnabled: data.whatsappCancelNotifyEnabled,
      whatsappCancelNotifyTemplate: data.whatsappCancelNotifyTemplate,
    }
  });

  await recordAuditEvent({
    tenantId,
    actorId: session.userId,
    actorRole: "ADMIN",
    action: "WHATSAPP_SETTINGS_UPDATED",
    entityType: "TENANT",
    entityId: tenantId,
    metadata: {
      provider: data.whatsappProvider,
      enabled: data.whatsappEnabled,
      tokenChanged: Boolean(data.whatsappToken),
    },
  });

  revalidatePath("/admin/whatsapp");
  return { success: true };
}

export async function checkWhatsappConnection() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      whatsappProvider: true,
      whatsappApiUrl: true,
      whatsappToken: true,
      whatsappNumber: true,
    }
  });

  if (!tenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  const result = await verifyWhatsappConnection({
    provider: tenant.whatsappProvider,
    apiUrl: tenant.whatsappApiUrl,
    token: tenant.whatsappToken,
    number: tenant.whatsappNumber,
  });

  return result;
}

export async function sendTestWhatsappMessage(phone: string, text: string) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  const now = new Date();

  const result = await sendWhatsappMessage({
    tenantId,
    recipient: phone,
    type: "TEST",
    data: {
      clientName: "Cliente Teste",
      serviceName: "Corte de Cabelo (Teste)",
      employeeName: "Profissional Teste",
      dateStr: formatInstantDateBR(now, tenant.timezone),
      timeStr: formatInstantTimeBR(now, tenant.timezone),
      inactiveDays: 30,
    },
    overrideMessage: text,
  });

  revalidatePath("/admin/whatsapp");
  return result;
}

export async function getWhatsappLogs() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const logs = await prisma.whatsappLog.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs;
}

export async function retryWhatsappOutboxMessage(id: string) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  const message = await prisma.whatsappOutbox.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!message || message.status !== "FAILED") throw new Error("Mensagem não disponível para reenvio.");
  await prisma.whatsappOutbox.update({ where: { id }, data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lockedAt: null, lastError: null } });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "WHATSAPP_OUTBOX_RETRIED", entityType: "WhatsappOutbox", entityId: id });
  revalidatePath("/admin/whatsapp");
  return { success: true };
}

export async function getFailedWhatsappOutboxMessages() {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  return prisma.whatsappOutbox.findMany({ where: { tenantId: session.tenantId, status: "FAILED" }, orderBy: { updatedAt: "desc" }, take: 25 });
}

export async function setPromotionalWhatsappOptOut(tenantId: string, optedOut: boolean) {
  const session = await getCurrentClientSession();
  if (!session) throw new Error("Faça login para alterar a preferência.");
  const hasRelationship = await prisma.booking.findFirst({ where: { tenantId, clientId: session.clientId }, select: { id: true } });
  if (!hasRelationship) throw new Error("Cliente não pertence a este estabelecimento.");
  await prisma.clientCommunicationPreference.upsert({ where: { tenantId_clientId: { tenantId, clientId: session.clientId } }, create: { tenantId, clientId: session.clientId, promotionalOptOut: optedOut }, update: { promotionalOptOut: optedOut } });
  revalidatePath("/[tenant]/perfil", "page");
  return { success: true };
}

// Job/Automation: Check bookings and send reminders (Hours before)
export async function runAppointmentRemindersJob(manualTenantId?: string, cronSecret?: string) {
  let tenantId = manualTenantId;
  
  if (tenantId && !hasValidCronSecret(cronSecret)) {
    throw new Error("Não autorizado.");
  }

  if (!tenantId) {
    const session = await getCurrentSession();
    if (!session || !session.isAdmin) throw new Error("Não autorizado.");
    tenantId = session.tenantId;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || !tenant.whatsappEnabled || !tenant.whatsappReminderEnabled) {
    return { success: false, message: "Lembretes desativados ou estabelecimento não encontrado." };
  }

  const now = new Date();
  // Limite de tempo de antecedência configurado (ex: 2 horas)
  const hoursConfig = tenant.whatsappReminderHours;
  const timeLimit = new Date(now.getTime() + hoursConfig * 60 * 60 * 1000);

  // Busca agendamentos confirmados futuros que estejam dentro do intervalo e não tenham recebido o lembrete
  // Adiciona um buffer inferior (ex: agendamentos a partir de agora) para não pegar agendamentos passados
  const bookingTimeMode = tenant.bookingTimeMode as BookingTimeMode;
  const firstCandidateDay = addScheduleCalendarDays(calendarDateString(now, tenant.timezone), -1);
  const lastCandidateDay = addScheduleCalendarDays(calendarDateString(timeLimit, tenant.timezone), 1);
  const candidateStart = scheduleDayBounds(firstCandidateDay, tenant.timezone, bookingTimeMode).start;
  const candidateEnd = scheduleDayBounds(lastCandidateDay, tenant.timezone, bookingTimeMode).end;
  const candidateBookings = await prisma.booking.findMany({
    where: {
      tenantId: tenant.id,
      status: "CONFIRMED",
      whatsappReminderSent: false,
      date: { gte: candidateStart, lte: candidateEnd },
    },
    include: {
      client: true,
      service: true,
      employee: true,
    },
  });
  const bookings = candidateBookings.filter((booking) => {
    const instant = scheduleInstant(booking.date, tenant.timezone, bookingTimeMode).getTime();
    return instant >= now.getTime() && instant <= timeLimit.getTime();
  });

  let queuedCount = 0;

  for (const booking of bookings) {
    await prisma.$transaction((tx) => enqueueWhatsappMessage(tx, {
      tenantId: tenant.id,
      eventKey: `booking:${booking.id}:reminder`,
      bookingId: booking.id,
      recipient: booking.client.phone,
      type: "REMINDER",
      data: {
        clientName: booking.client.name,
        serviceName: booking.service.name,
        employeeName: booking.employee.name,
        dateStr: formatScheduleDate(booking.date, tenant.timezone, bookingTimeMode),
        timeStr: formatScheduleTime(booking.date, tenant.timezone, bookingTimeMode),
      },
    }));
    queuedCount++;
  }

  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/bookings");

  return {
    success: true,
    totalProcessed: bookings.length,
    queuedCount,
  };
}

// Job/Automation: Check clients inactive for X days (e.g. 30 days)
export async function runInactiveClientRemindersJob(manualTenantId?: string, cronSecret?: string) {
  let tenantId = manualTenantId;
  
  if (tenantId && !hasValidCronSecret(cronSecret)) {
    throw new Error("Não autorizado.");
  }

  if (!tenantId) {
    const session = await getCurrentSession();
    if (!session || !session.isAdmin) throw new Error("Não autorizado.");
    tenantId = session.tenantId;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || !tenant.whatsappEnabled || !tenant.whatsappInactiveEnabled) {
    return { success: false, message: "Lembretes de inatividade desativados ou estabelecimento não encontrado." };
  }

  const now = new Date();
  const bookingTimeMode = tenant.bookingTimeMode as BookingTimeMode;
  const inactiveDays = tenant.whatsappInactiveDays;
  
  // Limiar de dias atrás (ex: 30 dias atrás)
  const thresholdDate = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

  // Buscar clientes do tenant
  // Para fins práticos de multi-tenant, buscamos clientes que tenham feito agendamentos neste tenant
  const clients = await prisma.client.findMany({
    where: {
      bookings: {
        some: {
          tenantId: tenant.id,
          status: "CONFIRMED",
        }
      }
    },
    include: {
      communicationPreferences: { where: { tenantId: tenant.id } },
      bookings: {
        where: {
          tenantId: tenant.id,
          status: "CONFIRMED",
        },
        orderBy: {
          date: "desc",
        },
        take: 1,
      }
    }
  });

  let queuedCount = 0;

  for (const client of clients) {
    const lastBooking = client.bookings[0];
    if (!lastBooking) continue;

    const lastBookingDate = scheduleInstant(lastBooking.date, tenant.timezone, bookingTimeMode);

    // Se o último agendamento foi antes do limiar (há mais de 30 dias)
    // E o cliente não recebeu um lembrete de inatividade desde o seu último agendamento
    const isInactive = lastBookingDate.getTime() <= thresholdDate.getTime();
    const optedOut = client.communicationPreferences[0]?.promotionalOptOut === true;

    // Adicionalmente, verificamos se o cliente tem algum agendamento futuro agendado
    const nowStorage = scheduleDateTime(calendarDateString(now, tenant.timezone), calendarTimeString(now, tenant.timezone), tenant.timezone, bookingTimeMode);
    const futureBooking = await prisma.booking.findFirst({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
        status: "CONFIRMED",
        date: {
          gt: nowStorage,
        }
      }
    });

    if (isInactive && !optedOut && !futureBooking) {
      const service = lastBooking.serviceId ? await prisma.service.findUnique({ where: { id: lastBooking.serviceId }, select: { name: true } }) : null;
      const employee = lastBooking.employeeId ? await prisma.employee.findUnique({ where: { id: lastBooking.employeeId }, select: { name: true } }) : null;
      await prisma.$transaction((tx) => enqueueWhatsappMessage(tx, {
        tenantId: tenant.id,
        eventKey: `client:${client.id}:inactive:${lastBooking.id}`,
        recipient: client.phone,
        type: "INACTIVE",
        data: {
          clientName: client.name,
          serviceName: service?.name || "Serviço",
          employeeName: employee?.name || "Profissional",
          dateStr: formatScheduleDate(lastBooking.date, tenant.timezone, bookingTimeMode),
          timeStr: formatScheduleTime(lastBooking.date, tenant.timezone, bookingTimeMode),
          inactiveDays: inactiveDays,
        },
      }));
      queuedCount++;
    }
  }

  revalidatePath("/admin/whatsapp");

  return {
    success: true,
    queuedCount,
  };
}
