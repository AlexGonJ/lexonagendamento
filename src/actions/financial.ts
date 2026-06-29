"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "./auth";
import { revalidatePath } from "next/cache";

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) throw new Error("Acesso não autorizado.");
  return session.tenantId;
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

  // 1. Definir o início e fim do mês correspondente
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 2. Buscar agendamentos CONFIRMED no mês
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      status: "CONFIRMED",
      date: {
        gte: startDate,
        lte: endDate,
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
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      plan: true,
    },
  });

  // 4. Buscar despesas (outros custos) do mês
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // 5. Cálculos Gerais
  // Faturamento de reservas avulsas (que não possuem plano)
  const regularBookingsRevenue = bookings
    .filter((b) => !b.customerSubscriptionId)
    .reduce((sum, b) => sum + b.service.price, 0);

  // Faturamento de assinaturas de planos vendidas no mês
  const plansRevenue = subscriptions.reduce((sum, sub) => sum + sub.plan.price, 0);

  // Faturamento total = avulsos + planos
  const totalRevenue = regularBookingsRevenue + plansRevenue;

  // Comissões pagas aos funcionários (calculada sobre o valor do serviço executado)
  const totalCommissions = bookings.reduce((sum, b) => {
    const rate = b.employee.commissionRate;
    return sum + (b.service.price * rate) / 100;
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
    const totalServiceValue = empBookings.reduce((sum, b) => sum + b.service.price, 0);
    const commissionEarned = empBookings.reduce((sum, b) => {
      return sum + (b.service.price * emp.commissionRate) / 100;
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
    totalCommissions,
    totalExpenses,
    netProfit,
    averageTicket,
    totalBookingsCount: bookings.length,
    expenses,
    employeeSummaries,
  };
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
