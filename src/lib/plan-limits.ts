import { Prisma } from "@prisma/client";
import { scheduleMonthBounds, scheduleParts, type BookingTimeMode } from "@/lib/schedule-time";

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

export async function assertMonthlyBookingCapacity(
  tx: Prisma.TransactionClient,
  tenantId: string,
  bookingDate: Date,
  timeZone: string,
  mode: BookingTimeMode,
) {
  const localDate = scheduleParts(bookingDate, timeZone, mode);
  const monthKey = `${localDate.year}-${String(localDate.month).padStart(2, "0")}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`tenant-booking-capacity:${tenantId}:${monthKey}`}))`;
  const activePlan = await tx.tenantPlan.findFirst({
    where: { tenantId, status: "ACTIVE", plan: { isActive: true } },
    include: { plan: { select: { maxBookingsPerMonth: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  if (!activePlan) return;
  const limit = activePlan.plan.maxBookingsPerMonth;
  if (limit === null) return;
  const { start: monthStart, end: monthEnd } = scheduleMonthBounds(bookingDate, timeZone, mode);
  const count = await tx.booking.count({ where: { tenantId, date: { gte: monthStart, lte: monthEnd }, status: { not: "CANCELLED" } } });
  if (count >= limit) throw new Error(`O plano ${activePlan.plan.name} atingiu o limite mensal de ${limit} agendamentos.`);
}
