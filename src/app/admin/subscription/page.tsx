import { getTenantBilling } from "@/actions/billing";
import SubscriptionClient from "./SubscriptionClient";

export default async function SubscriptionPage() {
  const billing = await getTenantBilling();
  return <SubscriptionClient billing={billing} />;
}
