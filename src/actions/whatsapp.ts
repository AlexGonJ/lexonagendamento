"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { 
  sendWhatsappMessage, 
  verifyWhatsappConnection, 
  replaceMessagePlaceholders 
} from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

// Format date to DD/MM/YYYY in SP timezone
function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

// Format time to HH:MM in SP timezone
function formatTimeBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

export async function getWhatsappSettings() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      whatsappEnabled: true,
      whatsappProvider: true,
      whatsappApiUrl: true,
      whatsappToken: true,
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

  return tenant;
}

export async function updateWhatsappSettings(data: any) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.tenantId;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      whatsappEnabled: data.whatsappEnabled,
      whatsappProvider: data.whatsappProvider,
      whatsappApiUrl: data.whatsappApiUrl || null,
      whatsappToken: data.whatsappToken || null,
      whatsappNumber: data.whatsappNumber || null,
      whatsappWabaId: data.whatsappWabaId || null,
      whatsappConfirmEnabled: data.whatsappConfirmEnabled,
      whatsappConfirmTemplate: data.whatsappConfirmTemplate,
      whatsappReminderEnabled: data.whatsappReminderEnabled,
      whatsappReminderHours: parseInt(data.whatsappReminderHours) || 2,
      whatsappReminderTemplate: data.whatsappReminderTemplate,
      whatsappInactiveEnabled: data.whatsappInactiveEnabled,
      whatsappInactiveDays: parseInt(data.whatsappInactiveDays) || 30,
      whatsappInactiveTemplate: data.whatsappInactiveTemplate,
      whatsappCancelNotifyEnabled: data.whatsappCancelNotifyEnabled,
      whatsappCancelNotifyTemplate: data.whatsappCancelNotifyTemplate,
    }
  });

  revalidatePath("/admin/whatsapp");
  return { success: true };
}

export async function checkWhatsappConnection() {
  const session = await getCurrentSession();
  if (!session) {
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
  if (!session) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.tenantId;

  const result = await sendWhatsappMessage({
    tenantId,
    recipient: phone,
    type: "TEST",
    data: {
      clientName: "Cliente Teste",
      serviceName: "Corte de Cabelo (Teste)",
      employeeName: "Profissional Teste",
      dateStr: formatDateBR(new Date()),
      timeStr: formatTimeBR(new Date()),
      inactiveDays: 30,
    },
    overrideMessage: text,
  });

  revalidatePath("/admin/whatsapp");
  return result;
}

export async function getWhatsappLogs() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Não autorizado.");
  }

  const logs = await prisma.whatsappLog.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs;
}

// Job/Automation: Check bookings and send reminders (Hours before)
export async function runAppointmentRemindersJob(manualTenantId?: string) {
  // If manualTenantId is passed (e.g. from CRON endpoint or manual execution), use it.
  // Otherwise, use the session tenant.
  let tenantId = manualTenantId;
  
  if (!tenantId) {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autorizado.");
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
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: tenant.id,
      status: "CONFIRMED",
      whatsappReminderSent: false,
      date: {
        gte: now,
        lte: timeLimit,
      },
    },
    include: {
      client: true,
      service: true,
      employee: true,
    },
  });

  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;

  for (const booking of bookings) {
    const res = await sendWhatsappMessage({
      tenantId: tenant.id,
      recipient: booking.client.phone,
      type: "REMINDER",
      data: {
        clientName: booking.client.name,
        serviceName: booking.service.name,
        employeeName: booking.employee.name,
        dateStr: formatDateBR(booking.date),
        timeStr: formatTimeBR(booking.date),
      },
    });

    if (res.success) {
      if (res.status === "SIMULATED") {
        simulatedCount++;
      } else {
        sentCount++;
      }
      // Marca como enviado no banco
      await prisma.booking.update({
        where: { id: booking.id },
        data: { whatsappReminderSent: true },
      });
    } else {
      failedCount++;
    }
  }

  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/bookings");

  return {
    success: true,
    totalProcessed: bookings.length,
    sentCount,
    simulatedCount,
    failedCount,
  };
}

// Job/Automation: Check clients inactive for X days (e.g. 30 days)
export async function runInactiveClientRemindersJob(manualTenantId?: string) {
  let tenantId = manualTenantId;
  
  if (!tenantId) {
    const session = await getCurrentSession();
    if (!session) throw new Error("Não autorizado.");
    tenantId = session.tenantId;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || !tenant.whatsappEnabled || !tenant.whatsappInactiveEnabled) {
    return { success: false, message: "Lembretes de inatividade desativados ou estabelecimento não encontrado." };
  }

  const now = new Date();
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

  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;

  for (const client of clients) {
    const lastBooking = client.bookings[0];
    if (!lastBooking) continue;

    const lastBookingDate = new Date(lastBooking.date);

    // Se o último agendamento foi antes do limiar (há mais de 30 dias)
    // E o cliente não recebeu um lembrete de inatividade desde o seu último agendamento
    const isInactive = lastBookingDate.getTime() <= thresholdDate.getTime();
    const alreadySentForThisBooking = client.whatsappInactiveSentAt && new Date(client.whatsappInactiveSentAt).getTime() >= lastBookingDate.getTime();

    // Adicionalmente, verificamos se o cliente tem algum agendamento futuro agendado
    const futureBooking = await prisma.booking.findFirst({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
        status: "CONFIRMED",
        date: {
          gt: now,
        }
      }
    });

    if (isInactive && !alreadySentForThisBooking && !futureBooking) {
      const res = await sendWhatsappMessage({
        tenantId: tenant.id,
        recipient: client.phone,
        type: "INACTIVE",
        data: {
          clientName: client.name,
          serviceName: lastBooking.serviceId ? (await prisma.service.findUnique({ where: { id: lastBooking.serviceId } }))?.name || "Serviço" : "Serviço",
          employeeName: lastBooking.employeeId ? (await prisma.employee.findUnique({ where: { id: lastBooking.employeeId } }))?.name || "Profissional" : "Profissional",
          dateStr: formatDateBR(lastBookingDate),
          timeStr: formatTimeBR(lastBookingDate),
          inactiveDays: inactiveDays,
        },
      });

      if (res.success) {
        if (res.status === "SIMULATED") {
          simulatedCount++;
        } else {
          sentCount++;
        }

        // Atualiza a data de envio no cliente
        await prisma.client.update({
          where: { id: client.id },
          data: { whatsappInactiveSentAt: new Date() },
        });
      } else {
        failedCount++;
      }
    }
  }

  revalidatePath("/admin/whatsapp");

  return {
    success: true,
    sentCount,
    simulatedCount,
    failedCount,
  };
}
