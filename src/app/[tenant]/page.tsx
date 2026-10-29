import prisma from "@/lib/prisma";
import BookingFlow from "@/components/BookingFlow";
import { notFound } from "next/navigation";
import { getCurrentClientSession } from "@/actions/auth";
import { publicEmployeeSelect, publicServiceSelect } from "@/lib/public-data";
import { calendarDateString } from "@/lib/schedule-time";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  // Busca os dados do tenant, serviços e profissionais ativos
  const tenantData = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          ...publicServiceSelect,
          employees: {
            where: { isActive: true },
            select: publicEmployeeSelect,
          },
        },
      },
      employees: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: publicEmployeeSelect,
      },
    },
  });

  if (!tenantData) {
    notFound();
  }

  const clientSession = await getCurrentClientSession();
  const initialClient = clientSession
    ? { name: clientSession.name, phone: clientSession.phone }
    : null;

  return (
    <BookingFlow
      tenantId={tenantData.id}
      tenantSlug={tenantSlug}
      tenantName={tenantData.name}
      tenantLogoUrl={tenantData.logoUrl}
      tenantCoverUrl={tenantData.coverUrl}
      tenantDescription={tenantData.description}
      tenantTimeZone={tenantData.timezone}
      bookingTimeMode={tenantData.bookingTimeMode}
      initialDateStr={calendarDateString(new Date(), tenantData.timezone)}
      services={tenantData.services}
      employees={tenantData.employees}
      initialClient={initialClient}
    />
  );
}
