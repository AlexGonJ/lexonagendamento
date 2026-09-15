"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { cancelMercadoPagoSubscription, createMercadoPagoSubscription } from "@/lib/mercadopago-subscriptions";
import { recordAuditEvent } from "@/lib/audit";

async function requireBillingAdmin() {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Apenas administradores podem acessar a assinatura.");
  return session;
}

export async function getTenantBilling() {
  const session = await requireBillingAdmin();
  const [activePlan, orders] = await Promise.all([
    prisma.tenantPlan.findFirst({ where: { tenantId: session.tenantId, status: "ACTIVE" }, include: { plan: { select: { name: true, features: true, maxEmployees: true } }, }, orderBy: { startDate: "desc" } }),
    prisma.checkoutOrder.findMany({ where: { tenantId: session.tenantId }, include: { plan: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { activePlan, orders };
}

export async function retryCheckout(orderId: string) {
  const session = await requireBillingAdmin();
  const order = await prisma.checkoutOrder.findFirst({
    where: { id: orderId, tenantId: session.tenantId, status: { in: ["PENDING", "REJECTED", "CANCELLED", "CHECKOUT_FAILED"] } },
    include: { plan: { select: { name: true } }, tenant: { select: { employees: { where: { isAdmin: true }, select: { email: true }, take: 1 } } } },
  });
  if (!order) throw new Error("Pedido pendente não encontrado.");
  const email = order.tenant.employees[0]?.email;
  if (!email) throw new Error("A conta não possui um e-mail administrativo para o checkout.");
  const checkout = await createMercadoPagoSubscription(order, email);
  await prisma.checkoutOrder.update({ where: { id: order.id }, data: { status: "PENDING", providerResourceId: checkout.providerResourceId } });
  return { paymentUrl: checkout.paymentUrl };
}

export async function cancelRenewalAtPeriodEnd() {
  const session = await requireBillingAdmin();
  const activePlan = await prisma.tenantPlan.findFirst({ where: { tenantId: session.tenantId, status: "ACTIVE", cancelAtPeriodEnd: false }, orderBy: { startDate: "desc" } });
  if (!activePlan) throw new Error("Não há uma assinatura ativa disponível para cancelamento.");
  if (activePlan.providerResourceId) await cancelMercadoPagoSubscription(activePlan.providerResourceId);
  await prisma.tenantPlan.update({ where: { id: activePlan.id }, data: { cancelAtPeriodEnd: true, cancelledAt: new Date() } });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "TENANT_PLAN_CANCELLATION_REQUESTED", entityType: "TENANT_PLAN", entityId: activePlan.id, metadata: { endDate: activePlan.endDate?.toISOString() ?? null } });
  return { success: true, endDate: activePlan.endDate };
}
