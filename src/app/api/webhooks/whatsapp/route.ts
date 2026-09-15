import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function validSignature(raw: string, signature: string | null) {
  const secret = process.env.META_WEBHOOK_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (url.searchParams.get("hub.mode") === "subscribe" && token && url.searchParams.get("hub.verify_token") === token) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) return Response.json({ error: "Assinatura inválida" }, { status: 401 });
  try {
    const body = JSON.parse(raw) as { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string; timestamp?: string }> } }> }> };
    const statuses = body.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.statuses || []) || []) || [];
    await Promise.all(statuses.map(async (item) => {
      if (!item.id || !item.status) return;
      const normalized = item.status.toUpperCase();
      const deliveredAt = normalized === "DELIVERED" || normalized === "READ" ? new Date(Number(item.timestamp || "0") * 1000 || Date.now()) : undefined;
      await prisma.$transaction([
        prisma.whatsappLog.updateMany({ where: { providerMessageId: item.id }, data: { status: normalized, ...(deliveredAt ? { deliveredAt } : {}), ...(normalized === "FAILED" ? { failedAt: new Date() } : {}) } }),
        prisma.whatsappOutbox.updateMany({ where: { providerMessageId: item.id }, data: { ...(deliveredAt ? { deliveredAt } : {}), ...(normalized === "FAILED" ? { status: "FAILED", lastError: "Meta informou falha de entrega" } : {}) } }),
      ]);
    }));
    return Response.json({ received: true });
  } catch { return Response.json({ error: "Payload inválido" }, { status: 400 }); }
}
