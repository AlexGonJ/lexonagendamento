import prisma from "@/lib/prisma";
import BookingFlow from "@/components/BookingFlow";
import { notFound } from "next/navigation";

export default async function BookingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  // Busca o tenant no banco
  const tenantData = await prisma.tenant.findUnique({
    where: { slug: tenant },
    include: {
      services: {
        orderBy: { createdAt: 'desc' },
        include: { employees: true }
      },
      employees: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenantData) {
    notFound(); // Mostra página 404 se a barbearia não existir
  }

  return (
    <BookingFlow 
      tenantSlug={tenant} 
      services={tenantData.services} 
      employees={tenantData.employees} 
    />
  );
}
