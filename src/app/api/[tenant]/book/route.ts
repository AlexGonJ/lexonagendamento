import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySignedToken } from "@/lib/session";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createBookingForClient } from "@/lib/booking-service";

function getRequestIp(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; }

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: tenantSlug } = await params;
    const body = await request.json();
    const { clientId, serviceId, employeeId, date, notes, captchaToken } = body;
    if (![clientId, serviceId, employeeId, date].every((value) => typeof value === "string" && value.length > 0)) return NextResponse.json({ error: "Dados incompletos para o agendamento" }, { status: 400 });
    const sessionCookie = (await cookies()).get("client_token")?.value;
    const session = sessionCookie ? await verifySignedToken<{ clientId: string; phone: string }>(sessionCookie, "client-session") : null;
    if (!session) return NextResponse.json({ error: "Cliente não autenticado" }, { status: 401 });
    if (session.clientId !== clientId) return NextResponse.json({ error: "Sessão do cliente inválida" }, { status: 403 });
    const [tenant, client] = await Promise.all([db.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, isActive: true } }), db.client.findFirst({ where: { id: clientId, phone: session.phone } })]);
    if (!tenant?.isActive) return NextResponse.json({ error: "Estabelecimento não encontrado ou indisponível" }, { status: 404 });
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 403 });
    const [phoneLimit, ipLimit] = await Promise.all([
      assertRateLimit(`booking:create:phone:${client.phone}:${tenant.id}`, { limit: 5, windowMs: 60 * 60 * 1000, blockMs: 2 * 60 * 60 * 1000 }),
      assertRateLimit(`booking:create:ip:${getRequestIp(request)}:${tenant.id}`, { limit: 15, windowMs: 60 * 60 * 1000, blockMs: 2 * 60 * 60 * 1000 }),
    ]);
    if (!phoneLimit.allowed || !ipLimit.allowed) return NextResponse.json({ error: "Muitas marcações em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
    const captcha = await verifyTurnstileToken(captchaToken, getRequestIp(request));
    if (!captcha.success) return NextResponse.json({ error: captcha.error }, { status: 400 });
    const legacyDate = new Date(date);
    if (Number.isNaN(legacyDate.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    const result = await createBookingForClient({ tenantSlug, serviceId, employeeId, clientId, notes: typeof notes === "string" ? notes : undefined, dateStr: legacyDate.toISOString().slice(0, 10), timeStr: legacyDate.toISOString().slice(11, 16) });
    return NextResponse.json({ success: true, message: "Agendamento realizado com sucesso!", booking: { id: result.bookingId, date: result.bookingDate } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
