"use client";

import { useState } from "react";
import { createTenant } from "@/actions/superadmin";
import { useRouter } from "next/navigation";

export type Feature = { slug: string; label: string; description: string };
export type Plan = { id: string; name: string; price: number; features: string[] };

export default function NewTenantForm({ plans, features }: { plans: Plan[]; features: Feature[] }) {
  const router = useRouter();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["booking"]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState("");

  function handlePlanChange(planId: string) {
    setSelectedPlan(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) setSelectedFeatures(plan.features);
  }

  function toggleFeature(f: string) {
    setSelectedFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  function handleNameChange(name: string) {
    const auto = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setSlug(auto);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("features", selectedFeatures.join(","));
    if (selectedPlan) fd.set("planId", selectedPlan);
    const result = await createTenant(fd);
    if (result.success) {
      router.push("/super-admin/tenants");
      router.refresh();
    } else {
      setError(result.error || "Erro desconhecido");
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(139,92,246,0.2)",
    color: "white",
    borderRadius: "12px",
    padding: "12px 16px",
    width: "100%",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  } as React.CSSProperties;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Informacoes da Loja</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Nome da Loja *</label>
            <input
              name="name"
              required
              placeholder="Ex: Barbearia do Silva"
              style={inputStyle}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Slug (URL) *</label>
            <input
              name="slug"
              required
              placeholder="barbearia-do-silva"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; e.target.style.boxShadow = "none"; }}
            />
            <p className="text-xs mt-1" style={{ color: "#4b5563" }}>Acesso: seusite.com/{slug || "..."}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>Descricao</label>
          <textarea
            name="description"
            placeholder="Descricao do estabelecimento..."
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Plan Selection */}
      {plans.length > 0 && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Plano Inicial</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePlanChange(p.id)}
                className="text-left p-4 rounded-xl transition-all duration-200"
                style={{
                  background: selectedPlan === p.id ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                  border: selectedPlan === p.id ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <span className="text-sm font-bold" style={{ color: "#a855f7" }}>R$ {p.price.toFixed(2)}/mes</span>
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>{p.features.length} features incluidas</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Features Habilitadas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => {
            const active = selectedFeatures.includes(f.slug);
            return (
              <button
                key={f.slug}
                type="button"
                onClick={() => toggleFeature(f.slug)}
                className="flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)",
                  border: active ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
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
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
        >
          {loading ? "Criando..." : "Criar Loja"}
        </button>
      </div>
    </form>
  );
}
