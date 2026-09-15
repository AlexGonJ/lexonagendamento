import { Prisma } from "@prisma/client";

export async function assertEmployeeCapacity(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`tenant-employee-capacity:${tenantId}`}))`;
  const activeSubscription = await tx.tenantPlan.findFirst({
    where: { tenantId, status: "ACTIVE", plan: { isActive: true } },
    include: { plan: { select: { maxEmployees: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  if (!activeSubscription) throw new Error("Este estabelecimento não possui um plano ativo.");

  const activeEmployees = await tx.employee.count({ where: { tenantId, isActive: true } });
  if (activeEmployees >= activeSubscription.plan.maxEmployees) {
    throw new Error(`O plano ${activeSubscription.plan.name} permite até ${activeSubscription.plan.maxEmployees} profissional(is) ativo(s).`);
  }
}

export async function assertMonthlyBookingCapacity(tx: Prisma.TransactionClient, tenantId: string, bookingDate: Date) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`tenant-booking-capacity:${tenantId}:${bookingDate.getUTCFullYear()}-${bookingDate.getUTCMonth() + 1}`}))`;
  const activePlan = await tx.tenantPlan.findFirst({
    where: { tenantId, status: "ACTIVE", plan: { isActive: true } },
    include: { plan: { select: { maxBookingsPerMonth: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  if (!activePlan) return;
  const limit = activePlan.plan.maxBookingsPerMonth;
  if (limit === null) return;
  const monthStart = new Date(Date.UTC(bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(bookingDate.getUTCFullYear(), bookingDate.getUTCMonth() + 1, 1));
  const count = await tx.booking.count({ where: { tenantId, date: { gte: monthStart, lt: monthEnd }, status: { not: "CANCELLED" } } });
  if (count >= limit) throw new Error(`O plano ${activePlan.plan.name} atingiu o limite mensal de ${limit} agendamentos.`);
}
