import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { formatScheduleDateTime, scheduleDayBounds, type BookingTimeMode } from "@/lib/schedule-time";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const date = url.searchParams.get("date");
  const search = url.searchParams.get("search")?.trim();
  const tenantSchedule = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenantSchedule) return NextResponse.json({ error: "Estabelecimento não encontrado." }, { status: 404 });
  const bookingTimeMode = tenantSchedule.bookingTimeMode as BookingTimeMode;
  const dateBounds = date ? scheduleDayBounds(date, tenantSchedule.timezone, bookingTimeMode) : null;

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: session.tenantId,
      ...(status && status !== "ALL" ? { status } : {}),
      ...(dateBounds ? { date: { gte: dateBounds.start, lte: dateBounds.end } } : {}),
      ...(search ? {
        OR: [
          { client: { name: { contains: search, mode: "insensitive" } } },
          { client: { phone: { contains: search } } },
        ],
      } : {}),
    },
    include: { client: true, service: true, employee: true },
    orderBy: { date: "desc" },
    take: 10000,
  });

  const lines = [
    ["Cliente", "Telefone", "Serviço", "Profissional", "Data e hora", "Status", "Valor"].map(csvCell).join(","),
    ...bookings.map((booking) => [
      booking.client.name,
      booking.client.phone,
      booking.service.name,
      booking.employee.name,
      formatScheduleDateTime(booking.date, tenantSchedule.timezone, bookingTimeMode),
      booking.status,
      (booking.servicePrice ?? booking.service.price).toFixed(2),
    ].map(csvCell).join(",")),
  ];

  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agendamentos.csv"',
      "Cache-Control": "no-store",
    },
  });
}
