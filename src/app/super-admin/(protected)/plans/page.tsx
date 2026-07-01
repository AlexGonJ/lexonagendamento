import { getPlans } from "@/actions/superadmin";
import { AVAILABLE_FEATURES } from "@/lib/features";
import PlansClient, { Plan, Feature } from "./PlansClient";

export default async function PlansPage() {
  const plans = await getPlans();
  return <PlansClient plans={plans as unknown as Plan[]} features={AVAILABLE_FEATURES as unknown as Feature[]} />;
}