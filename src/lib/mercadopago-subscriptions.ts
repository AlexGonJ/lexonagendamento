type CheckoutOrderInput = { id: string; amount: number; billingPeriod: string; plan: { name: string } };

function appUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL deve ser configurada para criar o checkout.");
  const url = new URL(value);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("APP_URL deve usar HTTPS em produção.");
  return url;
}

export async function createMercadoPagoSubscription(order: CheckoutOrderInput, payerEmail: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não está configurado para receber pagamentos.");
  const baseUrl = appUrl();
  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `lexon-order-${order.id}` },
    body: JSON.stringify({
      reason: `Lexon Agenda — ${order.plan.name}`,
      external_reference: order.id,
      payer_email: payerEmail,
      auto_recurring: { frequency: order.billingPeriod === "annual" ? 12 : 1, frequency_type: "months", transaction_amount: order.amount, currency_id: "BRL" },
      back_url: new URL("/admin/subscription", baseUrl).toString(),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") throw new Error("Não foi possível iniciar o checkout do Mercado Pago.");
  const data = body as { id?: string; init_point?: string; sandbox_init_point?: string };
  const paymentUrl = process.env.MERCADOPAGO_USE_SANDBOX === "true" ? data.sandbox_init_point || data.init_point : data.init_point;
  if (!data.id || !paymentUrl) throw new Error("O Mercado Pago não retornou um checkout válido.");
  return { providerResourceId: data.id, paymentUrl };
}

export async function cancelMercadoPagoSubscription(providerResourceId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não está configurado para cancelar a renovação.");
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(providerResourceId)}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Não foi possível cancelar a renovação no Mercado Pago.");
}
