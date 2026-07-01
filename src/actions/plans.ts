"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "./auth";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
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
  const tenantId = await getActiveTenantId();

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
  const tenantId = await getActiveTenantId();

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

    const cleanPhone = clientPhone.replace(/\D/g, "");
    const client = await prisma.client.findUnique({
      where: { phone: cleanPhone }
    });
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
  const tenantId = await getActiveTenantId();

  const plan = await prisma.customerPlan.findUnique({
    where: { id: data.planId },
  });

  if (!plan) throw new Error("Plano não encontrado.");

  const startDate = data.startDateStr ? new Date(`${data.startDateStr}T12:00:00.000Z`) : new Date();
  const endDate = addDays(startDate, plan.periodDays);

  // Cria a assinatura inicial
  const subscription = await prisma.customerSubscription.create({
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

  // Se tiver horário fixo pré-configurado, agenda os horários para os próximos 30 dias
  if (data.fixedSchedule) {
    const { employeeId, serviceId, dayOfWeek, timeStr } = data.fixedSchedule;
    let slotsUsed = 0;
    
    // Iterar sobre os dias do ciclo do plano (periodDays, ex: 30)
    for (let offset = 0; offset < plan.periodDays; offset++) {
      const currentDay = addDays(startDate, offset);
      
      // Se o dia da semana bater e ainda tiver slots disponíveis no plano
      if (currentDay.getDay() === dayOfWeek && slotsUsed < plan.slots) {
        const dateStr = currentDay.toISOString().split("T")[0];
        const bookingDate = new Date(`${dateStr}T${timeStr}:00.000Z`);

        // Cria o agendamento associado à assinatura
        await prisma.booking.create({
          data: {
            date: bookingDate,
            status: "CONFIRMED",
            tenantId,
            employeeId,
            serviceId,
            clientId: data.clientId,
            customerSubscriptionId: subscription.id,
          },
        });

        slotsUsed++;
      }
    }

    // Atualiza os slots restantes com o que sobrou após pré-agendar
    await prisma.customerSubscription.update({
      where: { id: subscription.id },
      data: {
        remainingSlots: plan.slots - slotsUsed,
      },
    });
  }

  revalidatePath("/admin/plans");
  revalidatePath("/admin/bookings");
}

export async function cancelSubscription(id: string) {
  const tenantId = await getActiveTenantId();

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
