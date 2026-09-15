import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";

type MercadoPagoWebhookBody = {
  data?: { id?: string | number };
  id?: string | number;
  type?: string;
  action?: string;
};

function endOfPaidPeriod(startDate: Date, billingPeriod: string) {
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + (billingPeriod === "annual" ? 12 : 1));
  return endDate;
}

function isValidSignature(request: Request, resourceId: string | number) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;

  const values = new Map(signature.split(",").map((part) => {
    const [key, value] = part.trim().split("=", 2);
    return [key, value];
  }));
  const timestamp = values.get("ts");
  const receivedHash = values.get("v1");
  if (!timestamp || !receivedHash) return false;

  const signedPayload = `id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Mercado Pago passes parameters either in query string or in POST body
    const queryId = url.searchParams.get("id") || url.searchParams.get("data.id");
    const queryTopic = url.searchParams.get("topic") || url.searchParams.get("type");

    let body: MercadoPagoWebhookBody = {};
    try {
      const rawBody = await req.text();
      const parsed: unknown = rawBody ? JSON.parse(rawBody) : {};
      if (parsed && typeof parsed === "object") {
        body = parsed as MercadoPagoWebhookBody;
      }
    } catch {
      // Body might be empty or not JSON
    }

    const resourceId = queryId || body.data?.id || body.id;
    // Map topics/types: "preapproval" (subscription), "payment" etc.
    const resourceType = queryTopic || body.type || (body.action && body.action.startsWith("payment.") ? "payment" : undefined) || (body.action && body.action.startsWith("preapproval.") ? "preapproval" : undefined);

    console.log(`[MERCADO PAGO WEBHOOK] Evento recebido: tipo ${resourceType}.`);

    if (!resourceId || !resourceType) {
      return NextResponse.json({ error: "Missing resource ID or type" }, { status: 200 });
    }

    if (!isValidSignature(req, resourceId)) {
      console.warn("[MERCADO PAGO WEBHOOK] Assinatura inválida ou ausente.");
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      console.error("[MERCADO PAGO WEBHOOK] ERROR: MERCADOPAGO_ACCESS_TOKEN is not configured in environment variables.");
      return NextResponse.json({ error: "Mercado Pago token not configured" }, { status: 200 });
    }

    // Fetch resource details from Mercado Pago API
    let fetchUrl = "";
    if (resourceType === "preapproval" || resourceType === "subscription") {
      fetchUrl = `https://api.mercadopago.com/preapproval/${resourceId}`;
    } else if (resourceType === "payment") {
      fetchUrl = `https://api.mercadopago.com/v1/payments/${resourceId}`;
    } else {
      console.log(`[MERCADO PAGO WEBHOOK] Unhandled resource type: ${resourceType}`);
      return NextResponse.json({ message: "Unhandled resource type" }, { status: 200 });
    }

    const mpResponse = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!mpResponse.ok) {
      console.error(`[MERCADO PAGO WEBHOOK] Failed to fetch resource from Mercado Pago. Status: ${mpResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch resource details" }, { status: 200 });
    }

    const resource = await mpResponse.json();

    let externalReference = "";
    let status = "";
    let amount = 0;

    if (resourceType === "preapproval" || resourceType === "subscription") {
      externalReference = resource.external_reference || "";
      status = resource.status || ""; // pending, authorized, paused, cancelled
      amount = resource.auto_recurring?.transaction_amount || 0;
    } else {
      externalReference = resource.external_reference || "";
      status = resource.status || ""; // pending, approved, in_process, rejected, cancelled
      amount = resource.transaction_amount || 0;
    }

    // Only a server-created order can associate a provider resource to a tenant
    // and plan. E-mail, description and price are not trusted identifiers.
    if (!externalReference) return NextResponse.json({ received: true, mapped: false }, { status: 200 });
    const order = await prisma.checkoutOrder.findUnique({
      where: { id: externalReference },
      include: { tenant: true, plan: true },
    });
    if (!order || order.provider !== "mercadopago" || Math.abs(order.amount - Number(amount)) > 0.01) {
      console.warn("[MERCADO PAGO WEBHOOK] Pedido não encontrado ou valor divergente.");
      return NextResponse.json({ received: true, mapped: false }, { status: 200 });
    }

    const isSuccess = (resourceType === "payment" && status === "approved") || ((resourceType === "preapproval" || resourceType === "subscription") && (status === "authorized" || status === "active"));
    const orderStatus = isSuccess ? "PAID" : status === "rejected" ? "REJECTED" : status === "cancelled" ? "CANCELLED" : status === "paused" ? "PAUSED" : "PENDING";

    const duplicate = await prisma.$transaction(async (tx) => {
      await acquireEmployeeDayLock(tx, `mercadopago:${resourceType}:${resourceId}:${status}`);
      const existingEvent = await tx.paymentWebhookEvent.findUnique({
        where: {
          provider_resourceType_resourceId_status: {
            provider: "mercadopago",
            resourceType,
            resourceId: String(resourceId),
            status,
          },
        },
      });
      if (existingEvent) return true;

      await tx.paymentWebhookEvent.create({
        data: { provider: "mercadopago", resourceType, resourceId: String(resourceId), status, tenantId: order.tenantId },
      });
      // A rejected, paused or cancelled event changes only the pending order.
      // A paid period remains readable/active until its own end date policy is applied.
      await tx.checkoutOrder.update({
        where: { id: order.id },
        data: { status: orderStatus, providerResourceId: String(resourceId), ...(isSuccess ? { paidAt: new Date() } : {}) },
      });
      if (!isSuccess) return false;
      const startedAt = new Date();
      await tx.tenantPlan.updateMany({
        where: { tenantId: order.tenantId, status: { in: ["ACTIVE", "PENDING"] } },
        data: { status: "CANCELLED", endDate: startedAt, cancelledAt: startedAt },
      });
      await tx.tenantPlan.create({
        data: { tenantId: order.tenantId, planId: order.planId, status: "ACTIVE", startDate: startedAt, endDate: endOfPaidPeriod(startedAt, order.billingPeriod), billingPeriod: order.billingPeriod, providerResourceId: String(resourceId) },
      });
      await tx.tenant.update({
        where: { id: order.tenantId },
        data: { isActive: true, features: order.plan.features },
      });
      return false;
    });

    if (duplicate) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    console.log(`[MERCADO PAGO WEBHOOK] Evento ${orderStatus} processado com sucesso.`);
    return NextResponse.json({ 
      received: true, 
      mapped: true, 
      message: isSuccess ? "Pedido ativado." : `Pedido atualizado para ${orderStatus}.`
    }, { status: 200 });

  } catch (error) {
    console.error("[MERCADO PAGO WEBHOOK] Unexpected error processing webhook:", error);
    // Return 200 to Mercado Pago to stop retrying but log the error
    return NextResponse.json({ error: "Internal server error" }, { status: 200 });
  }
}
