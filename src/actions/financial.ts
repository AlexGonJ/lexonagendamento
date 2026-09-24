"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "./auth";
import { revalidatePath } from "next/cache";
import { recordAuditEvent } from "@/lib/audit";
import { calendarDateString, scheduleDayBounds, scheduleMonthBounds, type BookingTimeMode } from "@/lib/schedule-time";

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) throw new Error("Acesso não autorizado.");
  return session.tenantId;
}

function toCents(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor positivo válido.");
  return Math.round(amount * 100);
}

async function getTenantSchedule(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  return { timeZone: tenant.timezone, bookingTimeMode: tenant.bookingTimeMode as BookingTimeMode };
}

function businessDate(date: Date, timeZone: string) {
  return new Date(`${calendarDateString(date, timeZone)}T12:00:00.000Z`);
}

export interface EmployeeFinancialSummary {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  commissionRate: number;
  bookingsCount: number;
  totalServiceValue: number;
  commissionEarned: number;
}

export async function getFinancialSummary(month: number, year: number) {
  const tenantId = await getActiveTenantId();
  const { timeZone, bookingTimeMode } = await getTenantSchedule(tenantId);

  // Agendamentos seguem a compatibilidade do modo de armazenamento; os demais
  // eventos financeiros são instantes reais e usam os limites do calendário local.
  const monthAnchor = new Date(Date.UTC(year, month - 1, 1, 12));
  const bookingBounds = scheduleMonthBounds(monthAnchor, timeZone, bookingTimeMode);
  const financialBounds = scheduleMonthBounds(monthAnchor, timeZone, "IANA_UTC");

  // 2. Buscar agendamentos confirmados ou concluídos no mês
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      date: {
        gte: bookingBounds.start,
        lte: bookingBounds.end,
      },
    },
    include: {
      service: true,
      employee: true,
    },
  });

  // 3. Buscar assinaturas ativas vendidas/iniciadas no mês
  const subscriptions = await prisma.customerSubscription.findMany({
    where: {
      tenantId,
      startDate: {
        gte: financialBounds.start,
        lte: financialBounds.end,
      },
    },
    include: {
      plan: true,
    },
  });

  // 4. Buscar despesas (outros custos) do mês
  const [expenses, receipts] = await Promise.all([prisma.expense.findMany({
    where: {
      tenantId,
      date: {
        gte: financialBounds.start,
        lte: financialBounds.end,
      },
    },
    orderBy: {
      date: "desc",
    },
  }), prisma.receipt.findMany({ where: { tenantId, receivedAt: { gte: financialBounds.start, lte: financialBounds.end } } })]);

  // 5. Cálculos Gerais
  // Faturamento de reservas avulsas (que não possuem plano)
  const regularBookingsRevenue = bookings
    .filter((b) => !b.customerSubscriptionId)
    .reduce((sum, b) => sum + (b.servicePrice ?? b.service.price), 0);

  // Faturamento de assinaturas de planos vendidas no mês
  const plansRevenue = subscriptions.reduce((sum, sub) => sum + sub.plan.price, 0);

  // Faturamento total = avulsos + planos
  const totalRevenue = regularBookingsRevenue + plansRevenue;
  const totalReceived = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  // Comissões pagas aos funcionários (calculada sobre o valor do serviço executado)
  const totalCommissions = bookings.reduce((sum, b) => {
    const rate = b.employee.commissionRate;
    return sum + ((b.servicePrice ?? b.service.price) * (b.commissionRate ?? rate)) / 100;
  }, 0);

  // Custos Operacionais = Total de despesas inseridas
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Lucro Líquido
  const netProfit = totalRevenue - totalCommissions - totalExpenses;

  // Tíquete Médio das reservas avulsas
  const confirmedRegularCount = bookings.filter((b) => !b.customerSubscriptionId).length;
  const averageTicket = confirmedRegularCount > 0 ? regularBookingsRevenue / confirmedRegularCount : 0;

  // 6. Resumo por Funcionário (Comissão e faturamento gerado)
  const employees = await prisma.employee.findMany({
    where: { tenantId },
  });

  const employeeSummaries: EmployeeFinancialSummary[] = employees.map((emp) => {
    const empBookings = bookings.filter((b) => b.employeeId === emp.id);
    const bookingsCount = empBookings.length;
    const totalServiceValue = empBookings.reduce((sum, b) => sum + (b.servicePrice ?? b.service.price), 0);
    const commissionEarned = empBookings.reduce((sum, b) => {
      return sum + ((b.servicePrice ?? b.service.price) * (b.commissionRate ?? emp.commissionRate)) / 100;
    }, 0);

    return {
      employeeId: emp.id,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      role: emp.role,
      commissionRate: emp.commissionRate,
      bookingsCount,
      totalServiceValue,
      commissionEarned,
    };
  });

  return {
    regularBookingsRevenue,
    plansRevenue,
    totalRevenue,
    totalReceived,
    totalCommissions,
    totalExpenses,
    netProfit,
    averageTicket,
    totalBookingsCount: bookings.length,
    expenses,
    employeeSummaries,
  };
}

export async function createReceipt(data: { amount: number; method: string; dateStr: string; note?: string; bookingId?: string }) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Acesso não autorizado.");
  if (!Number.isFinite(data.amount) || data.amount <= 0 || !data.method || !data.dateStr) throw new Error("Informe valor, método e data válidos.");
  if (data.bookingId) {
    const booking = await prisma.booking.findFirst({ where: { id: data.bookingId, tenantId: session.tenantId }, select: { id: true } });
    if (!booking) throw new Error("Atendimento inválido para este estabelecimento.");
  }
  const cents = toCents(data.amount);
  const receipt = await prisma.receipt.create({ data: { tenantId: session.tenantId, bookingId: data.bookingId || null, amount: cents / 100, amountCents: cents, method: data.method.trim().slice(0, 40), receivedAt: new Date(`${data.dateStr}T12:00:00.000Z`), note: data.note?.trim().slice(0, 500) || null, recordedById: session.userId } });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "RECEIPT_CREATED", entityType: "RECEIPT", entityId: receipt.id, metadata: { method: data.method, bookingId: data.bookingId || null } });
  revalidatePath("/admin/financial");
  return { success: true, id: receipt.id };
}

export async function openCashSession(openingAmount: number, note?: string) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Apenas administradores podem abrir o caixa.");
  const { timeZone } = await getTenantSchedule(session.tenantId);
  const date = businessDate(new Date(), timeZone); const openingCents = Math.round(openingAmount * 100);
  if (!Number.isFinite(openingCents) || openingCents < 0) throw new Error("Informe uma abertura válida.");
  const cash = await prisma.cashSession.upsert({ where: { tenantId_businessDate: { tenantId: session.tenantId, businessDate: date } }, create: { tenantId: session.tenantId, businessDate: date, openedById: session.userId, openingCents, note: note?.trim().slice(0, 500) || null }, update: {} });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "CASH_SESSION_OPENED", entityType: "CASH_SESSION", entityId: cash.id });
  revalidatePath("/admin/financial"); return { success: true, id: cash.id };
}

export async function closeCashSession(countedAmount: number, note?: string) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Apenas administradores podem fechar o caixa.");
  const { timeZone } = await getTenantSchedule(session.tenantId);
  const date = businessDate(new Date(), timeZone); const countedCents = Math.round(countedAmount * 100);
  if (!Number.isFinite(countedCents) || countedCents < 0) throw new Error("Informe uma contagem válida.");
  const cash = await prisma.cashSession.findUnique({ where: { tenantId_businessDate: { tenantId: session.tenantId, businessDate: date } } });
  if (!cash || cash.closedAt) throw new Error("Não há caixa aberto para fechar hoje.");
  const receiptDay = scheduleDayBounds(calendarDateString(new Date(), timeZone), timeZone, "IANA_UTC");
  const receipts = await prisma.receipt.aggregate({ where: { tenantId: session.tenantId, receivedAt: { gte: receiptDay.start, lte: receiptDay.end }, method: { equals: "DINHEIRO", mode: "insensitive" } }, _sum: { amountCents: true, amount: true } });
  const expectedCents = cash.openingCents + (receipts._sum.amountCents ?? Math.round((receipts._sum.amount ?? 0) * 100));
  const updated = await prisma.cashSession.update({ where: { id: cash.id }, data: { closedById: session.userId, closedAt: new Date(), countedCents, expectedCents, differenceCents: countedCents - expectedCents, note: note?.trim().slice(0, 500) || cash.note } });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "CASH_SESSION_CLOSED", entityType: "CASH_SESSION", entityId: updated.id, metadata: { differenceCents: updated.differenceCents } });
  revalidatePath("/admin/financial"); return { success: true, differenceCents: updated.differenceCents };
}

export async function getTodayCashSession() {
  const tenantId = await getActiveTenantId();
  const { timeZone } = await getTenantSchedule(tenantId);
  return prisma.cashSession.findUnique({ where: { tenantId_businessDate: { tenantId, businessDate: businessDate(new Date(), timeZone) } } });
}

export async function createExpense(data: {
  description: string;
  amount: number;
  dateStr: string;
  category: string;
}) {
  const tenantId = await getActiveTenantId();

  if (!data.description || !data.amount || !data.dateStr || !data.category) {
    throw new Error("Preencha todos os campos da despesa.");
  }

  const date = new Date(`${data.dateStr}T12:00:00.000Z`);

  await prisma.expense.create({
    data: {
      description: data.description,
      amount: data.amount,
      date,
      category: data.category,
      tenantId,
    },
  });

  revalidatePath("/admin/financial");
}

export async function deleteExpense(id: string) {
  const tenantId = await getActiveTenantId();

  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense || expense.tenantId !== tenantId) {
    throw new Error("Despesa não encontrada.");
  }

  await prisma.expense.delete({
    where: { id },
  });

  revalidatePath("/admin/financial");
}
