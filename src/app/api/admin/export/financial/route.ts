import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
const cell = (value: unknown) => `"${String(value ?? "").replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
export async function GET() {
  const session = await getCurrentSession(); if (!session || !session.isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const [receipts, expenses] = await Promise.all([prisma.receipt.findMany({ where: { tenantId: session.tenantId }, orderBy: { receivedAt: "desc" }, take: 10000 }), prisma.expense.findMany({ where: { tenantId: session.tenantId }, orderBy: { date: "desc" }, take: 10000 })]);
  const rows = [["Tipo", "Data", "Descrição", "Método/Categoria", "Valor"]]; rows.push(...receipts.map((item) => [item.kind === "REFUND" ? "Estorno" : "Recebimento", item.receivedAt.toISOString(), item.note || "", item.method, item.amount.toFixed(2)]), ...expenses.map((item) => ["Despesa", item.date.toISOString(), item.description, item.category, (-item.amount).toFixed(2)]));
  return new NextResponse(`\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="financeiro.csv"', "Cache-Control": "no-store" } });
}
