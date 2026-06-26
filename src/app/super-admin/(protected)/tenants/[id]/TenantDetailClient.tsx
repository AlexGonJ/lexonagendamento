"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTenantFeatures, toggleTenantStatus, assignPlanToTenant, createTenantEmployee } from "@/actions/superadmin";

type Feature = { slug: string; label: string; description: string };
type Plan = { id: string; name: string; price: number; features: string[] };
type Employee = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: Date;
};
type Tenant = {
  id: string; name: string; slug: string; description: string | null;
  isActive: boolean; features: string[]; createdAt: Date;
  tenantPlans: { id: string; status: string; startDate: Date; plan: Plan }[];
  employees: Employee[];
  _count: { employees: number; services: number; bookings: number };
};

export default function TenantDetailClient({ tenant, plans, features }: { tenant: Tenant; plans: Plan[]; features: Feature[] }) {
  const router = useRouter();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(tenant.features);
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Employee creation states
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empIsAdmin, setEmpIsAdmin] = useState(false);
  const [empMsg, setEmpMsg] = useState({ type: "", text: "" });
  const [creatingEmp, setCreatingEmp] = useState(false);

  const activePlan = tenant.tenantPlans.find((p) => p.status === "ACTIVE");

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empName || !empRole || !empEmail || !empPassword) {
      setEmpMsg({ type: "err", text: "Todos os campos são obrigatórios." });
      return;
    }
    setCreatingEmp(true);
    setEmpMsg({ type: "", text: "" });

    const result = await createTenantEmployee(tenant.id, {
      name: empName,
      role: empRole,
      email: empEmail,
      password: empPassword,
      isAdmin: empIsAdmin,
    });

    setCreatingEmp(false);
    if (result.success) {
      setEmpMsg({ type: "ok", text: "Usuário/Funcionário cadastrado com sucesso!" });
      setEmpName("");
      setEmpRole("");
      setEmpEmail("");
      setEmpPassword("");
      setEmpIsAdmin(false);
      // Limpar mensagem de sucesso após 4s
      setTimeout(() => setEmpMsg({ type: "", text: "" }), 4000);
      router.refresh();
    } else {
      setEmpMsg({ type: "err", text: result.error || "Erro ao cadastrar." });
    }
  }

  function toggleFeature(f: string) {
    setSelectedFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  async function handleSaveFeatures() {
    setSaving(true);
    const result = await updateTenantFeatures(tenant.id, selectedFeatures);
    setSaving(false);
    if (result.success) {
      setMsg({ type: "ok", text: "Features atualizadas!" });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      router.refresh();
    } else {
      setMsg({ type: "err", text: result.error || "Erro" });
    }
  }

  async function handleToggle() {
    setToggling(true);
    const result = await toggleTenantStatus(tenant.id, !isActive);
    if (result.success) { setIsActive(!isActive); router.refresh(); }
    setToggling(false);
  }

  async function handleAssignPlan() {
    if (!selectedPlan) return;
    setAssigning(true);
    const result = await assignPlanToTenant(tenant.id, selectedPlan);
    if (result.success) {
      setMsg({ type: "ok", text: "Plano atribuido com sucesso!" });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      router.refresh();
    } else {
      setMsg({ type: "err", text: result.error || "Erro" });
    }
    setAssigning(false);
  }

  const cardStyle = { background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "16px", padding: "24px" };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/tenants" className="text-sm transition-colors hover:text-white" style={{ color: "#6b7280" }}>
            Lojas
          </Link>
          <span style={{ color: "#374151" }}>/</span>
          <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
        </div>
        <button onClick={handleToggle} disabled={toggling} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 self-start" style={{ background: isActive ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: isActive ? "#ef4444" : "#10b981", border: `1px solid ${isActive ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}` }}>
          {toggling ? "..." : isActive ? "Desativar Loja" : "Ativar Loja"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Profissionais", value: tenant._count.employees }, { label: "Servicos", value: tenant._count.services }, { label: "Agendamentos", value: tenant._count.bookings }].map((s) => (
          <div key={s.label} style={cardStyle} className="text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div style={cardStyle} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Informacoes</h2>
          <div className="space-y-3">
            {[{ label: "Slug", value: `/${tenant.slug}` }, { label: "Status", value: isActive ? "Ativa" : "Inativa" }, { label: "Plano Atual", value: activePlan?.plan.name || "Sem plano" }, { label: "Descricao", value: tenant.description || "-" }, { label: "Cadastro", value: new Date(tenant.createdAt).toLocaleDateString("pt-BR") }].map((r) => (
              <div key={r.label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-xs font-medium" style={{ color: "#6b7280" }}>{r.label}</span>
                <span className="text-sm text-white font-mono">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Alterar Plano</h2>
          <div className="space-y-2">
            {plans.map((p) => (
              <button key={p.id} type="button" onClick={() => setSelectedPlan(p.id)} className="w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left" style={{ background: selectedPlan === p.id ? "rgba(124,58,237,0.15)" : activePlan?.plan.id === p.id ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: selectedPlan === p.id ? "1px solid rgba(168,85,247,0.4)" : activePlan?.plan.id === p.id ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div><p className="text-sm font-medium text-white">{p.name}</p><p className="text-xs" style={{ color: "#6b7280" }}>{p.features.length} features</p></div>
                <div className="text-right"><p className="text-sm font-bold" style={{ color: "#a855f7" }}>R$ {p.price.toFixed(2)}</p>{activePlan?.plan.id === p.id && <p className="text-xs mt-0.5" style={{ color: "#10b981" }}>Atual</p>}</div>
              </button>
            ))}
          </div>
          <button onClick={handleAssignPlan} disabled={!selectedPlan || assigning} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-40" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            {assigning ? "Atribuindo..." : "Confirmar Plano"}
          </button>
        </div>
      </div>

      {/* Funcionários & Usuários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listagem */}
        <div style={cardStyle} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Funcionários & Usuários</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {tenant.employees.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Nenhum funcionário ou usuário cadastrado.</p>
            ) : (
              tenant.employees.map((emp) => (
                <div key={emp.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{emp.name}</span>
                      {emp.isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{emp.role}</p>
                    {emp.email && <p className="text-[11px] text-gray-500 font-mono mt-0.5">{emp.email}</p>}
                  </div>
                  <span className="text-[10px] text-gray-600">
                    {new Date(emp.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cadastro */}
        <div style={cardStyle} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Cadastrar Usuário / Funcionário</h2>
          <form onSubmit={handleCreateEmployee} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Nome"
                  className="w-full bg-white/5 border border-purple-500/20 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Cargo *</label>
                <input
                  type="text"
                  required
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="Ex: Barbeiro"
                  className="w-full bg-white/5 border border-purple-500/20 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">E-mail Comercial *</label>
              <input
                type="email"
                required
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full bg-white/5 border border-purple-500/20 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Senha de Acesso *</label>
              <input
                type="password"
                required
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                placeholder="Defina a senha"
                className="w-full bg-white/5 border border-purple-500/20 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="empIsAdmin"
                checked={empIsAdmin}
                onChange={(e) => setEmpIsAdmin(e.target.checked)}
                className="rounded bg-white/5 border-purple-500/20 text-purple-600 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="empIsAdmin" className="text-xs text-gray-300 font-medium select-none cursor-pointer">
                Administrador (acesso total ao painel da loja)
              </label>
            </div>

            {empMsg.text && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: empMsg.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${empMsg.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: empMsg.type === "ok" ? "#6ee7b7" : "#fca5a5" }}>
                {empMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={creatingEmp}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {creatingEmp ? "Criando..." : "Criar Usuário"}
            </button>
          </form>
        </div>
      </div>

      <div style={cardStyle} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Features da Loja</h2>
          <span className="text-xs" style={{ color: "#6b7280" }}>{selectedFeatures.length} de {features.length} ativas</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => {
            const active = selectedFeatures.includes(f.slug);
            return (
              <button key={f.slug} type="button" onClick={() => toggleFeature(f.slug)} className="flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200" style={{ background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)", border: active ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all" style={{ background: active ? "#7c3aed" : "rgba(255,255,255,0.08)" }}>
                  {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: active ? "#e9d5ff" : "#6b7280" }}>{f.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: active ? "#7c3aed" : "#374151" }}>{f.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {msg.text && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: msg.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: msg.type === "ok" ? "#6ee7b7" : "#fca5a5" }}>
            {msg.text}
          </div>
        )}
        <button onClick={handleSaveFeatures} disabled={saving} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
          {saving ? "Salvando..." : "Salvar Features"}
        </button>
      </div>

      {tenant.tenantPlans.length > 0 && (
        <div style={cardStyle} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Historico de Planos</h2>
          <div className="space-y-2">
            {tenant.tenantPlans.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div><p className="text-sm font-medium text-white">{tp.plan.name}</p><p className="text-xs" style={{ color: "#6b7280" }}>Desde {new Date(tp.startDate).toLocaleDateString("pt-BR")}</p></div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: tp.status === "ACTIVE" ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)", color: tp.status === "ACTIVE" ? "#10b981" : "#6b7280", border: `1px solid ${tp.status === "ACTIVE" ? "rgba(16,185,129,0.2)" : "rgba(107,114,128,0.15)"}` }}>
                  {tp.status === "ACTIVE" ? "Ativo" : tp.status === "CANCELLED" ? "Cancelado" : "Expirado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}