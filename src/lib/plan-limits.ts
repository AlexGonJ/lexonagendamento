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
