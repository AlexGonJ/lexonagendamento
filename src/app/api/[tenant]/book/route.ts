import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySignedToken } from "@/lib/session";
import { getAvailableSlots } from "@/actions/availability";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params;
    const { clientId, serviceId, employeeId, date, notes, captchaToken } = await request.json();

    if (!clientId || !serviceId || !employeeId || !date) {
      return NextResponse.json({ error: "Dados incompletos para o agendamento" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const clientSessionCookie = cookieStore.get("client_token");
    const clientSession = clientSessionCookie?.value
      ? verifySignedToken<{ clientId: string; phone: string }>(clientSessionCookie.value, "client-session")
      : null;

    if (!clientSession) {
      return NextResponse.json({ error: "Cliente não autenticado" }, { status: 401 });
    }

    if (clientSession.clientId !== clientId) {
      return NextResponse.json({ error: "Sessão do cliente inválida" }, { status: 403 });
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: "Estabelecimento não encontrado ou indisponível" }, { status: 404 });
    }

    const client = await db.client.findFirst({
      where: {
        id: clientId,
        phone: clientSession.phone,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 403 });
    }

    const ip = getRequestIp(request);
    const phoneLimit = await assertRateLimit(`booking:create:phone:${client.phone}:${tenant.id}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
      blockMs: 2 * 60 * 60 * 1000,
    });
    const ipLimit = await assertRateLimit(`booking:create:ip:${ip}:${tenant.id}`, {
      limit: 15,
      windowMs: 60 * 60 * 1000,
      blockMs: 2 * 60 * 60 * 1000,
    });

    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json({ error: "Muitas marcações em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
    }

    const captchaResult = await verifyTurnstileToken(captchaToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json({ error: captchaResult.error }, { status: 400 });
    }

    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const booking = await db.$transaction(async (tx) => {
      await acquireEmployeeDayLock(tx, `booking:${tenant.id}:${employeeId}:${bookingDate.toISOString().split("T")[0]}`);

      const service = await tx.service.findFirst({
        where: {
          id: serviceId,
          tenantId: tenant.id,
        },
        include: {
          employees: true,
        },
      });

      if (!service) {
        throw new Error("Serviço inválido para este estabelecimento");
      }

      const employee = await tx.employee.findFirst({
        where: {
          id: employeeId,
          tenantId: tenant.id,
        },
        include: {
          services: true,
        },
      });

      if (!employee) {
        throw new Error("Profissional inválido para este estabelecimento");
      }

      if (!employee.services.some((svc) => svc.id === service.id)) {
        throw new Error("Este profissional não atende o serviço selecionado");
      }

      const dateStr = bookingDate.toISOString().split("T")[0];
      const timeStr = bookingDate.toISOString().slice(11, 16);
      const availableSlots = await getAvailableSlots(employee.id, dateStr, service.duration, tx);

      if (!availableSlots.includes(timeStr)) {
        throw new Error("Horário indisponível");
      }

      return await tx.booking.create({
        data: {
          date: bookingDate,
          notes,
          tenantId: tenant.id,
          serviceId: service.id,
          employeeId: employee.id,
          clientId: client.id,
          status: "CONFIRMED",
        },
        include: {
          service: true,
          employee: true,
        },
      });
    });

    console.log(
      `[WHATSAPP NOTIFICATION] Enviado alerta de confirmação para o agendamento do cliente ${clientId} no serviço ${booking.service.name} no dia ${booking.date}`
    );

    return NextResponse.json({
      success: true,
      message: "Agendamento realizado com sucesso!",
      booking,
    });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
