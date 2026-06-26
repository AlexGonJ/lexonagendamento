import { getPlans } from "@/actions/superadmin";
import { AVAILABLE_FEATURES } from "@/lib/features";
import PlansClient from "./PlansClient";

export default async function PlansPage() {
  const plans = await getPlans();
  return <PlansClient plans={plans as any} features={AVAILABLE_FEATURES as any} />;
}