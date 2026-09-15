import prisma from "@/lib/prisma";
import BookingFlow from "@/components/BookingFlow";
import { notFound } from "next/navigation";
import { getCurrentClientSession } from "@/actions/auth";
import { publicEmployeeSelect, publicServiceSelect } from "@/lib/public-data";

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  // Busca o tenant no banco
  const tenantData = await prisma.tenant.findUnique({
    where: { slug: tenant },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { ...publicServiceSelect, employees: { where: { isActive: true }, select: publicEmployeeSelect } }
      },
      employees: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: publicEmployeeSelect,
      }
    }
  });

  if (!tenantData) {
    notFound(); // Mostra página 404 se a barbearia não existir
  }

  const clientSession = await getCurrentClientSession();
  const initialClient = clientSession ? { name: clientSession.name, phone: clientSession.phone } : null;

  return (
    <BookingFlow 
      tenantId={tenantData.id}
      tenantSlug={tenant} 
      services={tenantData.services} 
      employees={tenantData.employees} 
      initialClient={initialClient}
    />
  );
}
