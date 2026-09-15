export function getMercadoPagoCheckoutUrl(planId: string, billingPeriod: "monthly" | "annual", orderId: string) {
  const key = `MERCADOPAGO_PLAN_${planId}_${billingPeriod.toUpperCase()}_URL`;
  const configured = process.env[key];
  if (!configured) return null;
  try {
    const url = new URL(configured);
    url.searchParams.set("external_reference", orderId);
    return url.toString();
  } catch {
    return null;
  }
}
