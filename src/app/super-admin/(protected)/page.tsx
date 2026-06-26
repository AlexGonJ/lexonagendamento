import { getSuperAdminStats } from "@/actions/superadmin";
import Link from "next/link";

export default async function SuperAdminDashboard() {
  const { totalTenants, activeTenants, inactiveTenants, totalPlans, recentTenants, planDistribution } =
    await getSuperAdminStats();

  const stats = [
    { label: "Total de Lojas", value: totalTenants, icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)" },
    { label: "Lojas Ativas", value: activeTenants, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
    { label: "Lojas Inativas", value: inactiveTenants, icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
    { label: "Planos Ativos", value: totalPlans, icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Visao geral do ecossistema de lojas</p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Loja
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ background: "rgba(19,19,31,0.8)", border: `1px solid ${s.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={s.color} strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: "#6b7280" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Lojas Recentes</h2>
            <Link href="/super-admin/tenants" className="text-xs font-medium transition-colors hover:text-purple-300" style={{ color: "#a855f7" }}>
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTenants.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#4b5563" }}>Nenhuma loja cadastrada.</p>
            ) : (
              recentTenants.map((t) => {
                const activePlan = t.tenantPlans[0]?.plan;
                return (
                  <Link
                    key={t.id}
                    href={`/super-admin/tenants/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>/{t.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activePlan && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                          {activePlan.name}
                        </span>
                      )}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: t.isActive ? "#10b981" : "#ef4444" }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Distribuicao por Plano</h2>
            <Link href="/super-admin/plans" className="text-xs font-medium transition-colors hover:text-purple-300" style={{ color: "#a855f7" }}>
              Gerenciar →
            </Link>
          </div>
          {planDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#7c3aed"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <p className="text-sm" style={{ color: "#4b5563" }}>Nenhum plano criado ainda.</p>
              <Link href="/super-admin/plans" className="text-xs font-semibold" style={{ color: "#a855f7" }}>
                Criar planos →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {planDistribution.map((p, i) => {
                const pct = totalTenants > 0 ? Math.round((p.count / totalTenants) * 100) : 0;
                const colors = ["#7c3aed", "#a855f7", "#ec4899", "#f59e0b"];
                const c = colors[i % colors.length];
                return (
                  <div key={p.planName}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-white">{p.planName}</span>
                      <span className="text-xs font-semibold" style={{ color: c }}>{p.count} lojas ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}, ${c}88)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
