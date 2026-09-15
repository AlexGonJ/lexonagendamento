import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";

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

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: session.tenantId,
      ...(status && status !== "ALL" ? { status } : {}),
      ...(date ? {
        date: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
      } : {}),
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

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const lines = [
    ["Cliente", "Telefone", "Serviço", "Profissional", "Data e hora", "Status", "Valor"].map(csvCell).join(","),
    ...bookings.map((booking) => [
      booking.client.name,
      booking.client.phone,
      booking.service.name,
      booking.employee.name,
      formatter.format(booking.date),
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
