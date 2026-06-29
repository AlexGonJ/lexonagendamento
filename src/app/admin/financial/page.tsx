import { getFinancialSummary } from "@/actions/financial";
import { getCurrentSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import FinancialClient from "./FinancialClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function AdminFinancialPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Apenas donos/admin podem ver a aba financeira
  if (!session.isAdmin) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
        Acesso negado. Apenas administradores do estabelecimento possuem acesso ao painel financeiro.
      </div>
    );
  }

  const params = await searchParams;

  // Obter mês e ano atual no fuso de SP
  const now = new Date();
  const spDateString = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
    year: "numeric",
  }).format(now);
  const [currentMonth, currentYear] = spDateString.split("/");

  const month = params.month ? parseInt(params.month) : parseInt(currentMonth);
  const year = params.year ? parseInt(params.year) : parseInt(currentYear);

  const summary = await getFinancialSummary(month, year);

  // Mapear para passar objetos limpos
  const mappedSummary = {
    regularBookingsRevenue: summary.regularBookingsRevenue,
    plansRevenue: summary.plansRevenue,
    totalRevenue: summary.totalRevenue,
    totalCommissions: summary.totalCommissions,
    totalExpenses: summary.totalExpenses,
    netProfit: summary.netProfit,
    averageTicket: summary.averageTicket,
    totalBookingsCount: summary.totalBookingsCount,
    expenses: summary.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      date: e.date.toISOString(),
      category: e.category,
    })),
    employeeSummaries: summary.employeeSummaries.map((emp) => ({
      employeeId: emp.employeeId,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      role: emp.role,
      commissionRate: emp.commissionRate,
      bookingsCount: emp.bookingsCount,
      totalServiceValue: emp.totalServiceValue,
      commissionEarned: emp.commissionEarned,
    })),
  };

  return (
    <FinancialClient
      initialMonth={month}
      initialYear={year}
      summary={mappedSummary}
    />
  );
}
