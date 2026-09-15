"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";

export async function getOnboardingChecklist() {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Apenas administradores podem consultar a ativação.");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, include: { services: { where: { isActive: true }, select: { id: true } }, employees: { where: { isActive: true }, select: { id: true, schedules: { select: { id: true } } } } } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  const hasEmployeeSchedule = tenant.employees.some((employee) => employee.schedules.length > 0);
  const items = [
    { id: "business", label: "Dados do estabelecimento", complete: Boolean(tenant.name.trim()) },
    { id: "service", label: "Ao menos um serviço ativo", complete: tenant.services.length > 0 },
    { id: "employee", label: "Ao menos um profissional ativo", complete: tenant.employees.length > 0 },
    { id: "schedule", label: "Expediente de profissional configurado", complete: hasEmployeeSchedule },
    { id: "messages", label: "Canal de mensagens revisado", complete: !tenant.whatsappEnabled || Boolean(tenant.whatsappProvider && tenant.whatsappNumber) },
    { id: "public", label: "Link público revisado", complete: Boolean(tenant.slug) },
  ];
  return { tenant: { name: tenant.name, slug: tenant.slug }, items, ready: items.every((item) => item.complete) };
}
