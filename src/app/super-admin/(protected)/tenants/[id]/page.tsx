import { getTenantById, getPlans } from "@/actions/superadmin";
import { AVAILABLE_FEATURES } from "@/lib/features";
import { notFound } from "next/navigation";
import TenantDetailClient, { Tenant, Plan, Feature } from "./TenantDetailClient";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([getTenantById(id), getPlans()]);
  if (!tenant) notFound();

  return (
    <TenantDetailClient
      tenant={tenant as unknown as Tenant}
      plans={plans as unknown as Plan[]}
      features={AVAILABLE_FEATURES as unknown as Feature[]}
    />
  );
}