"use client";

import { useState, useTransition } from "react";
import { createExpense, deleteExpense } from "@/actions/financial";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DollarSign, ShoppingBag, Plus, Trash2, FileText, TrendingUp, TrendingDown, Users } from "lucide-react";

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface EmployeeSummary {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  commissionRate: number;
  bookingsCount: number;
  totalServiceValue: number;
  commissionEarned: number;
}

interface FinancialClientProps {
  initialMonth: number;
  initialYear: number;
  summary: {
    regularBookingsRevenue: number;
    plansRevenue: number;
    totalRevenue: number;
    totalCommissions: number;
    totalExpenses: number;
    netProfit: number;
    averageTicket: number;
    totalBookingsCount: number;
    expenses: ExpenseData[];
    employeeSummaries: EmployeeSummary[];
  };
}

export default function FinancialClient({ initialMonth, initialYear, summary }: FinancialClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Estados do formulário de despesa
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Aluguel");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const categories = ["Aluguel", "Energia", "Água", "Produtos", "Marketing", "Outros"];

  function handleFilterChange(month: number, year: number) {
    const params = new URLSearchParams(searchParams);
    params.set("month", month.toString());
    params.set("year", year.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!description || !amount || !dateStr || !category) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    startTransition(async () => {
      try {
        await createExpense({
          description,
          amount: parseFloat(amount),
          dateStr,
          category,
        });
        setFormSuccess(true);
        setDescription("");
        setAmount("");
        setTimeout(() => setFormSuccess(false), 2000);
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Erro ao adicionar despesa.";
        setFormError(errMessage);
      }
    });
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Deseja realmente excluir esta despesa?")) return;
    try {
      await deleteExpense(id);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Erro ao excluir despesa.";
      alert(errMessage);
    }
  }

  const profitPercentage = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Acompanhe o faturamento, comissões, custos e lucros da sua empresa.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              const m = parseInt(e.target.value);
              setSelectedMonth(m);
              handleFilterChange(m, selectedYear);
            }}
            className="p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => {
              const y = parseInt(e.target.value);
              setSelectedYear(y);
              handleFilterChange(selectedMonth, y);
            }}
            className="p-2 w-20 border border-gray-300 rounded-lg text-sm bg-white text-center focus:outline-none"
            min="2020"
            max="2035"
          />
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Faturamento */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faturamento Total</span>
            <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign size={16} /></span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            R$ {summary.totalRevenue.toFixed(2).replace(".", ",")}
          </span>
          <div className="mt-2 text-xs text-gray-400">
            <span className="text-gray-600 font-semibold">R$ {summary.regularBookingsRevenue.toFixed(2)}</span> avulso | <span className="text-gray-600 font-semibold">R$ {summary.plansRevenue.toFixed(2)}</span> planos
          </div>
        </div>

        {/* Card 2: Comissões */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comissões Pagas</span>
            <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><Users size={16} /></span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            R$ {summary.totalCommissions.toFixed(2).replace(".", ",")}
          </span>
          <p className="mt-2 text-xs text-gray-400">Calculadas sobre a taxa de cada profissional</p>
        </div>

        {/* Card 3: Custos Operacionais */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custos Adicionais</span>
            <span className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><ShoppingBag size={16} /></span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            R$ {summary.totalExpenses.toFixed(2).replace(".", ",")}
          </span>
          <p className="mt-2 text-xs text-gray-400">Custos operacionais inseridos abaixo</p>
        </div>

        {/* Card 4: Lucro Líquido */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lucro Líquido</span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {summary.netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
          </div>
          <span className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            R$ {summary.netProfit.toFixed(2).replace(".", ",")}
          </span>
          <div className="mt-2 text-xs text-gray-400">
            Retorno sobre faturamento: <span className={`font-semibold ${summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{profitPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Expenses vs Collaborators Commission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna da Esquerda: Comissionamento por profissional */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="text-gray-400" size={18} /> Comissão por Colaborador
            </h2>
            <div className="space-y-4">
              {summary.employeeSummaries.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">Nenhum profissional cadastrado.</p>
              ) : (
                summary.employeeSummaries.map((emp) => (
                  <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`}
                        alt={emp.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.role} • {emp.commissionRate}% comissão</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">R$ {emp.commissionEarned.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">{emp.bookingsCount} atendimentos</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Outras Estimativas */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Métricas e Estimativas</h2>
            <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Tíquete Médio (Avulsos)</span>
              <span className="font-semibold text-gray-800">R$ {summary.averageTicket.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Total de Atendimentos</span>
              <span className="font-semibold text-gray-800">{summary.totalBookingsCount} sessões</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-gray-500">Custo Percentual Operacional</span>
              <span className="font-semibold text-gray-800">
                {summary.totalRevenue > 0 ? ((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Registro e Lista de Despesas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Adicionar Despesa */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="text-blue-500" size={18} /> Inserir Novo Custo / Despesa
            </h2>

            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do Custo</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel do Mês, Conta de Luz, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="md:col-span-3">
                {formError && <p className="text-red-600 text-xs">{formError}</p>}
                {formSuccess && <p className="text-green-600 text-xs">Custo registrado com sucesso!</p>}
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition-colors cursor-pointer w-full flex items-center justify-center gap-1.5"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Despesas */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-gray-400" size={16} /> Custos do Mês Selecionado
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200">
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Categoria</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase text-right">Valor</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase text-center">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                        Nenhum custo registrado para este mês.
                      </td>
                    </tr>
                  ) : (
                    summary.expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm text-gray-700">
                          {new Date(exp.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-900">{exp.description}</td>
                        <td className="p-4 text-sm">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-900 text-right">
                          R$ {exp.amount.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-block"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
