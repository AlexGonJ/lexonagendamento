import { getTenantById, getPlans } from "@/actions/superadmin";
import { AVAILABLE_FEATURES } from "@/lib/features";
import { notFound } from "next/navigation";
import TenantDetailClient from "./TenantDetailClient";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([getTenantById(id), getPlans()]);
  if (!tenant) notFound();

  return (
    <TenantDetailClient
      tenant={tenant as any}
      plans={plans as any}
      features={AVAILABLE_FEATURES as any}
    />
  );
}