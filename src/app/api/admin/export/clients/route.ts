import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
const cell = (value: unknown) => `"${String(value ?? "").replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
export async function GET() {
  const session = await getCurrentSession(); if (!session || !session.isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const clients = await prisma.client.findMany({ where: { bookings: { some: { tenantId: session.tenantId } } }, select: { name: true, phone: true, email: true, createdAt: true }, take: 10000, orderBy: { createdAt: "desc" } });
  const csv = [ ["Nome", "Telefone", "E-mail", "Cadastro"].map(cell).join(","), ...clients.map((client) => [client.name, client.phone, client.email, client.createdAt.toISOString()].map(cell).join(",")) ].join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clientes.csv"', "Cache-Control": "no-store" } });
}
