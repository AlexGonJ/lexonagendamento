"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan, updatePlan } from "@/actions/superadmin";

type Feature = { slug: string; label: string; description: string };
type Plan = { id: string; name: string; price: number; maxEmployees: number; features: string[]; isActive: boolean; _count: { tenantPlans: number } };

export default function PlansClient({ plans: initialPlans, features }: { plans: Plan[]; features: Feature[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", maxEmployees: "1", features: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  function toggleFeature(slug: string) {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(slug) ? prev.features.filter((f) => f !== slug) : [...prev.features, slug],
    }));
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setFormData({ name: plan.name, price: plan.price.toString(), maxEmployees: plan.maxEmployees.toString(), features: plan.features });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({ name: "", price: "", maxEmployees: "1", features: [] });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      maxEmployees: parseInt(formData.maxEmployees, 10),
      features: formData.features,
    };
    let result;
    if (editingId) {
      result = await updatePlan(editingId, payload);
    } else {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.set(k, Array.isArray(v) ? v.join(",") : String(v)));
      const { createPlan } = await import("@/actions/superadmin");
      result = await createPlan(fd);
    }
    setSaving(false);
    if (result.success) {
      setMsg({ type: "ok", text: editingId ? "Plano atualizado!" : "Plano criado!" });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      resetForm();
      router.refresh();
    } else {
      setMsg({ type: "err", text: (result as any).error || "Erro" });
    }
  }

  async function handleToggleActive(plan: Plan) {
    await updatePlan(plan.id, { isActive: !plan.isActive });
    router.refresh();
  }

  const planColors = ["from-purple-600 to-violet-500", "from-pink-500 to-rose-500", "from-amber-500 to-orange-500", "from-blue-500 to-cyan-500"];

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(139,92,246,0.2)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "14px",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gerencie os planos de assinatura do sistema</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all self-start cursor-pointer"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Plano
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(19,19,31,0.9)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 0 1px rgba(124,58,237,0.05) inset" }}>
          <h2 className="text-base font-semibold text-white">{editingId ? "Editar Plano" : "Criar Novo Plano"}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Nome do Plano *</label>
                <input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required placeholder="Ex: Pro" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Preco Mensal (R$) *</label>
                <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} required placeholder="99.90" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Max. Profissionais *</label>
                <input type="number" min="1" value={formData.maxEmployees} onChange={(e) => setFormData((p) => ({ ...p, maxEmployees: e.target.value }))} required style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-3" style={{ color: "#9ca3af" }}>Features Incluidas</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {features.map((f) => {
                  const active = formData.features.includes(f.slug);
                  return (
                    <button key={f.slug} type="button" onClick={() => toggleFeature(f.slug)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200" style={{ background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)", border: active ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: active ? "#7c3aed" : "rgba(255,255,255,0.08)" }}>
                        {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: active ? "#e9d5ff" : "#6b7280" }}>{f.label}</p>
                        <p className="text-xs" style={{ color: active ? "#7c3aed" : "#374151" }}>{f.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {msg.text && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: msg.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: msg.type === "ok" ? "#6ee7b7" : "#fca5a5" }}>
                {msg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                {saving ? "Salvando..." : editingId ? "Atualizar Plano" : "Criar Plano"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans Grid */}
      {initialPlans.length === 0 && !showForm ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="text-white font-semibold">Nenhum plano criado ainda</p>
          <button onClick={() => setShowForm(true)} className="text-sm font-semibold cursor-pointer" style={{ color: "#a855f7" }}>Criar primeiro plano →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {initialPlans.map((plan, i) => (
            <div key={plan.id} className="rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02]" style={{ background: "rgba(19,19,31,0.8)", border: plan.isActive ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(255,255,255,0.06)", opacity: plan.isActive ? 1 : 0.6 }}>
              {/* Plan header with gradient */}
              <div className={`p-5 bg-gradient-to-br ${planColors[i % planColors.length]}`} style={{ opacity: plan.isActive ? 1 : 0.5 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-sm text-white/70 mt-0.5">ate {plan.maxEmployees} profissiona{plan.maxEmployees > 1 ? "is" : "l"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">R$ {plan.price.toFixed(2)}</p>
                    <p className="text-xs text-white/60">/mes</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  {features.map((f) => {
                    const included = plan.features.includes(f.slug);
                    return (
                      <div key={f.slug} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: included ? "rgba(124,58,237,0.15)" : "transparent" }}>
                          {included ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#a855f7"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#374151"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: included ? "#d8b4fe" : "#4b5563" }}>{f.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xs" style={{ color: "#6b7280" }}>{plan._count.tenantPlans} loja{plan._count.tenantPlans !== 1 ? "s" : ""}</span>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(plan)} className="text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "#a855f7", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      Editar
                    </button>
                    <button onClick={() => handleToggleActive(plan)} className="text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: plan.isActive ? "#ef4444" : "#10b981", background: plan.isActive ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${plan.isActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
                      {plan.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}