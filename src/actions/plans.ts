"use server";

import prisma from "@/lib/prisma";
import { getCurrentClientSession, getCurrentSession } from "./auth";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { getAvailableSlots } from "./availability";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  return session.tenantId;
}

async function requireAdminTenantId() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) throw new Error("Apenas administradores podem executar esta ação.");
  return session.tenantId;
}

// ── CUSTOMER PLANS (TEMPLATES) ───────────────────────────────────────────

export async function getCustomerPlans() {
  const tenantId = await getActiveTenantId();
  return await prisma.customerPlan.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomerPlan(formData: FormData) {
  const tenantId = await requireAdminTenantId();

  const name = formData.get("name") as string;
  const priceStr = formData.get("price") as string;
  const slotsStr = formData.get("slots") as string;
  const periodDaysStr = formData.get("periodDays") as string;

  if (!name || !priceStr || !slotsStr) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const price = parseFloat(priceStr);
  const slots = parseInt(slotsStr);
  const periodDays = periodDaysStr ? parseInt(periodDaysStr) : 30;

  await prisma.customerPlan.create({
    data: {
      name,
      price,
      slots,
      periodDays,
      tenantId,
    },
  });

  revalidatePath("/admin/plans");
}

export async function deleteCustomerPlan(id: string) {
  const tenantId = await requireAdminTenantId();

  await prisma.customerPlan.update({
    where: { id, tenantId },
    data: { isActive: false },
  });

  revalidatePath("/admin/plans");
}

// ── CUSTOMER SUBSCRIPTIONS (CLIENTS) ──────────────────────────────────────

export async function getSubscriptions() {
  const tenantId = await getActiveTenantId();
  return await prisma.customerSubscription.findMany({
    where: { tenantId },
    include: {
      client: true,
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Serves the public booking flow: checks if a client has an active subscription with slots remaining
export async function getActiveSubscription(clientPhone: string, tenantSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });
    if (!tenant) return null;

    const session = await getCurrentClientSession();
    if (!session) return null;
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const client = await prisma.client.findFirst({ where: { id: session.clientId, phone: cleanPhone } });
    if (!client) return null;

    const now = new Date();
    const subscription = await prisma.customerSubscription.findFirst({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
        status: "ACTIVE",
        endDate: { gte: now },
        remainingSlots: { gt: 0 }
      },
      include: {
        plan: true
      }
    });

    return subscription;
  } catch (error) {
    console.error("Erro ao buscar assinatura ativa:", error);
    return null;
  }
}

export async function createSubscription(data: {
  clientId: string;
  planId: string;
  startDateStr: string;
  fixedSchedule?: {
    employeeId: string;
    serviceId: string;
    dayOfWeek: number; // 0 = Domingo, 1 = Segunda, etc.
    timeStr: string; // "HH:MM"
  } | null;
}) {
  const tenantId = await requireAdminTenantId();

  const plan = await prisma.customerPlan.findUnique({
    where: { id: data.planId, tenantId },
  });

  const client = await prisma.client.findFirst({ where: { id: data.clientId, bookings: { some: { tenantId } } }, select: { id: true } });
  if (!plan || !client) throw new Error("Plano ou cliente não encontrado para este estabelecimento.");

  const startDate = data.startDateStr ? new Date(`${data.startDateStr}T12:00:00.000Z`) : new Date();
  const endDate = addDays(startDate, plan.periodDays);

  await prisma.$transaction(async (tx) => {
    const created = await tx.customerSubscription.create({
      data: {
        clientId: data.clientId,
        planId: data.planId,
        tenantId,
        startDate,
        endDate,
        remainingSlots: plan.slots,
        status: "ACTIVE",
      },
    });

    if (!data.fixedSchedule) return created;

    const { employeeId, serviceId, dayOfWeek, timeStr } = data.fixedSchedule;
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
    const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId, employees: { some: { id: employeeId } } }, select: { id: true } });
    if (!employee || !service || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Agendamento fixo inválido para este estabelecimento.");
    }
    const serviceRecord = await tx.service.findFirst({ where: { id: serviceId, tenantId }, select: { price: true, duration: true } });
    const employeeRecord = await tx.employee.findFirst({ where: { id: employeeId, tenantId }, select: { commissionRate: true } });
    if (!serviceRecord || !employeeRecord) throw new Error("Dados do agendamento fixo não encontrados.");
    let slotsUsed = 0;
    
    // Iterar sobre os dias do ciclo do plano (periodDays, ex: 30)
    for (let offset = 0; offset < plan.periodDays; offset++) {
      const currentDay = addDays(startDate, offset);
      
      // Se o dia da semana bater e ainda tiver slots disponíveis no plano
      if (currentDay.getDay() === dayOfWeek && slotsUsed < plan.slots) {
        const dateStr = currentDay.toISOString().split("T")[0];
        const bookingDate = new Date(`${dateStr}T${timeStr}:00.000Z`);

        if (bookingDate.getTime() <= Date.now()) continue;
        await acquireEmployeeDayLock(tx, `booking:${tenantId}:${employeeId}:${dateStr}`);
        const availableSlots = await getAvailableSlots(employeeId, dateStr, serviceRecord.duration, tx);
        if (!availableSlots.includes(timeStr)) {
          throw new Error(`O horário fixo ${dateStr} às ${timeStr} não está disponível.`);
        }

        await tx.booking.create({
          data: {
            date: bookingDate,
            status: "CONFIRMED",
            tenantId,
            employeeId,
            serviceId,
            clientId: data.clientId,
            customerSubscriptionId: created.id,
            servicePrice: serviceRecord.price,
            serviceDuration: serviceRecord.duration,
            commissionRate: employeeRecord.commissionRate,
          },
        });

        slotsUsed++;
      }
    }

    await tx.customerSubscription.update({
      where: { id: created.id },
      data: {
        remainingSlots: plan.slots - slotsUsed,
      },
    });
    return created;
  });

  revalidatePath("/admin/plans");
  revalidatePath("/admin/bookings");
}

export async function cancelSubscription(id: string) {
  const tenantId = await requireAdminTenantId();

  await prisma.customerSubscription.update({
    where: { id, tenantId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/admin/plans");
}

// Retorna todos os clientes do Tenant (para preencher o dropdown de nova assinatura)
export async function getTenantClients() {
  const tenantId = await getActiveTenantId();
  // Clientes que têm pelo menos um agendamento neste Tenant
  return await prisma.client.findMany({
    where: {
      bookings: {
        some: { tenantId }
      }
    },
    orderBy: { name: "asc" }
  });
}
