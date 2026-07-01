"use client";

import { useState, useTransition } from "react";
import { createCustomerPlan, deleteCustomerPlan, createSubscription, cancelSubscription } from "@/actions/plans";
import { Plus, Trash2, UserPlus } from "lucide-react";

interface CustomerPlan {
  id: string;
  name: string;
  price: number;
  slots: number;
  periodDays: number;
}

interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  remainingSlots: number;
  client: { name: string; phone: string };
  plan: { name: string; slots: number };
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface PlansClientProps {
  plans: CustomerPlan[];
  subscriptions: Subscription[];
  clients: Client[];
  employees: Employee[];
  services: Service[];
}

interface FixedSchedulePayload {
  employeeId: string;
  serviceId: string;
  dayOfWeek: number;
  timeStr: string;
}

interface CreateSubscriptionPayload {
  clientId: string;
  planId: string;
  startDateStr: string;
  fixedSchedule: FixedSchedulePayload | null;
}

export default function PlansClient({ plans, subscriptions, clients, employees, services }: PlansClientProps) {
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions">("subscriptions");
  const [isPending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());

  // Estados de Nova Assinatura
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDateStr, setStartDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [showFixedSchedule, setShowFixedSchedule] = useState(false);
  const [fixedEmployeeId, setFixedEmployeeId] = useState("");
  const [fixedServiceId, setFixedServiceId] = useState("");
  const [fixedDayOfWeek, setFixedDayOfWeek] = useState(1); // 1 = Segunda
  const [fixedTimeStr, setFixedTimeStr] = useState("10:00");
  const [subMsg, setSubMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const daysOfWeek = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
  ];

  async function handleCreateSubscription(e: React.FormEvent) {
    e.preventDefault();
    setSubMsg(null);

    if (!selectedClientId || !selectedPlanId || !startDateStr) {
      setSubMsg({ type: "err", text: "Selecione o cliente e o plano." });
      return;
    }

    const payload: CreateSubscriptionPayload = {
      clientId: selectedClientId,
      planId: selectedPlanId,
      startDateStr,
      fixedSchedule: null,
    };

    if (showFixedSchedule) {
      if (!fixedEmployeeId || !fixedServiceId || !fixedTimeStr) {
        setSubMsg({ type: "err", text: "Para horário fixo, selecione o profissional, serviço e horário." });
        return;
      }
      payload.fixedSchedule = {
        employeeId: fixedEmployeeId,
        serviceId: fixedServiceId,
        dayOfWeek: fixedDayOfWeek,
        timeStr: fixedTimeStr,
      };
    }

    startTransition(async () => {
      try {
        await createSubscription(payload);
        setSubMsg({ type: "ok", text: "Assinatura criada e horários fixos agendados!" });
        setSelectedClientId("");
        setSelectedPlanId("");
        setShowFixedSchedule(false);
        setTimeout(() => setSubMsg(null), 3000);
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Erro ao criar assinatura.";
        setSubMsg({ type: "err", text: errMessage });
      }
    });
  }

  async function handleCancelSubscription(id: string) {
    if (!confirm("Tem certeza que deseja cancelar esta assinatura? Agendamentos futuros permanecerão, mas o cliente perderá o benefício do plano.")) return;
    try {
      await cancelSubscription(id);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Erro ao cancelar assinatura.";
      alert(errMessage);
    }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("Tem certeza que deseja excluir este plano? Clientes com assinaturas ativas dele não serão afetados, mas novas assinaturas não poderão ser criadas.")) return;
    try {
      await deleteCustomerPlan(id);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Erro ao excluir plano.";
      alert(errMessage);
    }
  }

  const formatDateBR = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  return (
    <div className="space-y-6">
      {/* Header and Switch Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crie clubes de assinatura recorrentes e gerencie a fidelização de seus clientes.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-200/60 p-1 rounded-lg border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "subscriptions"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Assinaturas Ativas
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "plans"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Configurar Planos
          </button>
        </div>
      </div>

      {activeTab === "subscriptions" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Nova Assinatura Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" /> Assinar Cliente
              </h2>

              <form onSubmit={handleCreateSubscription} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Selecione o Cliente --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano Recorrente *</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Selecione o Plano --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.slots} créditos / {p.periodDays} dias (R$ {p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                    required
                  />
                </div>

                {/* Seção Opcional: Horário Fixo */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="toggle-fixed" className="text-sm font-bold text-gray-800 cursor-pointer">
                      Agendar Horário Fixo
                    </label>
                    <input
                      id="toggle-fixed"
                      type="checkbox"
                      checked={showFixedSchedule}
                      onChange={(e) => setShowFixedSchedule(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    O sistema irá pré-agendar automaticamente as sessões semanais para o cliente dentro dos próximos 30 dias.
                  </p>

                  {showFixedSchedule && (
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Profissional *</label>
                        <select
                          value={fixedEmployeeId}
                          onChange={(e) => setFixedEmployeeId(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
                          required={showFixedSchedule}
                        >
                          <option value="">Selecione...</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Serviço *</label>
                        <select
                          value={fixedServiceId}
                          onChange={(e) => setFixedServiceId(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
                          required={showFixedSchedule}
                        >
                          <option value="">Selecione...</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Dia da Semana *</label>
                          <select
                            value={fixedDayOfWeek}
                            onChange={(e) => setFixedDayOfWeek(parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
                          >
                            {daysOfWeek.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Horário *</label>
                          <input
                            type="text"
                            placeholder="Ex: 14:00"
                            value={fixedTimeStr}
                            onChange={(e) => setFixedTimeStr(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white text-center focus:outline-none"
                            required={showFixedSchedule}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {subMsg && (
                  <p className={`text-xs font-semibold ${subMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                    {subMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Confirmar Assinatura
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Assinaturas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-sm font-semibold text-gray-700">Cliente</th>
                      <th className="p-4 text-sm font-semibold text-gray-700">Plano</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-center">Créditos Restantes</th>
                      <th className="p-4 text-sm font-semibold text-gray-700">Vigência</th>
                      <th className="p-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 text-sm">
                          Nenhum cliente com plano assinado ainda.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => {
                        let statusBadge = "bg-green-50 text-green-700 border-green-200";
                        if (sub.status === "CANCELLED") {
                          statusBadge = "bg-red-50 text-red-700 border-red-200";
                        } else if (new Date(sub.endDate).getTime() < now) {
                          statusBadge = "bg-gray-100 text-gray-600 border-gray-200";
                        }

                        return (
                          <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="p-4">
                              <p className="font-semibold text-gray-900 text-sm">{sub.client.name}</p>
                              <p className="text-xs text-gray-400">{sub.client.phone}</p>
                            </td>
                            <td className="p-4 text-sm text-gray-800 font-medium">
                              {sub.plan.name}
                            </td>
                            <td className="p-4 text-center font-bold text-gray-900 text-sm">
                              {sub.remainingSlots} / {sub.plan.slots}
                            </td>
                            <td className="p-4 text-xs text-gray-600">
                              <div>De: {formatDateBR(sub.startDate)}</div>
                              <div className="mt-0.5">Até: {formatDateBR(sub.endDate)}</div>
                            </td>
                            <td className="p-4 text-xs">
                              <span className={`px-2 py-0.5 font-bold border rounded-full ${statusBadge}`}>
                                {sub.status === "ACTIVE" && new Date(sub.endDate).getTime() >= now
                                  ? "Ativo"
                                  : sub.status === "CANCELLED"
                                  ? "Cancelado"
                                  : "Expirado"}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {sub.status === "ACTIVE" && new Date(sub.endDate).getTime() >= now && (
                                <button
                                  onClick={() => handleCancelSubscription(sub.id)}
                                  className="px-2.5 py-1 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-block"
                                >
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Criar Template de Plano */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Criar Novo Plano
              </h2>

              <form action={createCustomerPlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ex: Clube 4 Cortes de Cabelo"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Mensal (R$) *</label>
                    <input
                      type="number"
                      name="price"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd de Créditos *</label>
                    <input
                      type="number"
                      name="slots"
                      placeholder="Ex: 4"
                      min="1"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validade do Crédito (Dias)</label>
                  <input
                    type="number"
                    name="periodDays"
                    defaultValue={30}
                    min="1"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Créditos expiram após este período e não acumulam.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Salvar Plano
                </button>
              </form>
            </div>
          </div>

          {/* Listar Templates de Planos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-sm font-semibold text-gray-700">Nome do Plano</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-right">Preço</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-center">Sessões Inclusas</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-center">Período de Validade</th>
                      <th className="p-4 text-sm font-semibold text-gray-700 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                          Nenhum plano configurado. Crie um no formulário ao lado.
                        </td>
                      </tr>
                    ) : (
                      plans.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 text-sm font-bold text-gray-900">{p.name}</td>
                          <td className="p-4 text-sm font-bold text-gray-900 text-right">
                            R$ {p.price.toFixed(2)}
                          </td>
                          <td className="p-4 text-center text-sm font-semibold text-gray-700">
                            {p.slots} créditos
                          </td>
                          <td className="p-4 text-center text-sm text-gray-700">
                            {p.periodDays} dias
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeletePlan(p.id)}
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
      )}
    </div>
  );
}
