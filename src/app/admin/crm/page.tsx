import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import CRMClient from "./CRMClient";

export const dynamic = "force-dynamic";

export default async function AdminCRMPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Se o profissional não for admin, ele não tem acesso ao CRM completo
  if (!session.isAdmin) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
        Acesso negado. Apenas administradores podem acessar o CRM de clientes.
      </div>
    );
  }

  // Buscar clientes do Tenant
  const clients = await prisma.client.findMany({
    where: {
      bookings: {
        some: { tenantId: session.tenantId },
      },
    },
    include: {
      bookings: {
        where: { tenantId: session.tenantId },
        include: {
          service: true,
          employee: true,
        },
        orderBy: { date: "desc" },
      },
      customerSubscriptions: {
        where: {
          tenantId: session.tenantId,
          status: "ACTIVE",
          endDate: { gte: new Date() },
        },
        include: {
          plan: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Mapear para passar dados limpos
  const mappedClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    createdAt: c.createdAt.toISOString(),
    bookings: c.bookings.map((b) => ({
      id: b.id,
      date: b.date.toISOString(),
      status: b.status,
      service: {
        name: b.service.name,
        price: b.service.price,
      },
      employee: {
        name: b.employee.name,
      },
    })),
    customerSubscriptions: c.customerSubscriptions.map((sub) => ({
      id: sub.id,
      remainingSlots: sub.remainingSlots,
      endDate: sub.endDate.toISOString(),
      plan: {
        name: sub.plan.name,
        slots: sub.plan.slots,
      },
    })),
  }));

  return <CRMClient clients={mappedClients} />;
}
