import { getCustomerPlans, getSubscriptions, getTenantClients } from "@/actions/plans";
import { getEmployees } from "@/actions/employees";
import { getCurrentSession } from "@/actions/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import PlansClient from "./PlansClient";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Apenas donos/admin podem ver a aba de planos
  if (!session.isAdmin) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
        Acesso negado. Apenas administradores do estabelecimento possuem acesso à aba de planos.
      </div>
    );
  }

  const tenantId = session.tenantId;

  const plans = await getCustomerPlans();
  const subscriptions = await getSubscriptions();
  const clients = await getTenantClients();
  const employees = await getEmployees();
  const services = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });

  const mappedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    slots: p.slots,
    periodDays: p.periodDays,
  }));

  const mappedSubscriptions = subscriptions.map((sub) => ({
    id: sub.id,
    startDate: sub.startDate.toISOString(),
    endDate: sub.endDate.toISOString(),
    status: sub.status,
    remainingSlots: sub.remainingSlots,
    client: {
      name: sub.client.name,
      phone: sub.client.phone,
    },
    plan: {
      name: sub.plan.name,
      slots: sub.plan.slots,
    },
  }));

  const mappedClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  const mappedEmployees = employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
  }));

  const mappedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <PlansClient
      plans={mappedPlans}
      subscriptions={mappedSubscriptions}
      clients={mappedClients}
      employees={mappedEmployees}
      services={mappedServices}
    />
  );
}
