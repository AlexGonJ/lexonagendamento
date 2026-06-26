import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentClientSession } from "@/actions/auth";
import ClientPortal from "./ClientPortal";

export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;

  // 1. Buscar o estabelecimento
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  });

  if (!tenant) {
    notFound();
  }

  // 2. Buscar a sessão do cliente
  const clientSession = await getCurrentClientSession();

  // 3. Se estiver logado, buscar agendamentos dele específicos para este estabelecimento (tenant)
  let bookings: any[] = [];
  if (clientSession) {
    bookings = await prisma.booking.findMany({
      where: {
        clientId: clientSession.clientId,
        tenantId: tenant.id
      },
      include: {
        service: true,
        employee: true
      },
      orderBy: {
        date: "desc"
      }
    });
  }

  const logoUrl = tenant.logoUrl || 'https://images.unsplash.com/photo-1599305090598-fe179d501227?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';

  return (
    <ClientPortal
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      logoUrl={logoUrl}
      initialClient={clientSession}
      bookings={bookings}
    />
  );
}
