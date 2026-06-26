import { getTenants } from "@/actions/superadmin";
import Link from "next/link";
import TenantToggleButton from "./TenantToggleButton";

export default async function TenantsPage() {
  const tenants = await getTenants();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lojas</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{tenants.length} loja{tenants.length !== 1 ? "s" : ""} cadastrada{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 self-start"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Loja
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(19,19,31,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
        {tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#7c3aed"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
            </div>
            <p className="text-white font-semibold">Nenhuma loja cadastrada</p>
            <Link href="/super-admin/tenants/new" className="text-sm font-semibold" style={{ color: "#a855f7" }}>Criar primeira loja →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
                  {["Loja", "Slug", "Plano", "Features", "Status", "Acoes"].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const activePlan = t.tenantPlans[0]?.plan;
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors duration-150 hover:bg-violet-500/5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{t.name}</p>
                            <p className="text-xs" style={{ color: "#6b7280" }}>{t._count.bookings} agendamentos</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono" style={{ color: "#9ca3af" }}>/{t.slug}</span>
                      </td>
                      <td className="px-6 py-4">
                        {activePlan ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                            {activePlan.name}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#4b5563" }}>Sem plano</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {t.features.slice(0, 3).map((f) => (
                            <span key={f} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                              {f.replace("_", " ")}
                            </span>
                          ))}
                          {t.features.length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                              +{t.features.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <TenantToggleButton id={t.id} isActive={t.isActive} />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/super-admin/tenants/${t.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:text-purple-300"
                          style={{ color: "#a855f7", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
                        >
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
