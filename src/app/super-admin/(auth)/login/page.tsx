"use client";

import { useActionState } from "react";
import { superAdminLogin } from "@/actions/superadmin";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const initialState = { success: false, error: "" };

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await superAdminLogin(formData);
      return result;
    },
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.push("/super-admin");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0f0f17 0%, #13111f 50%, #0f0f17 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(19,19,31,0.9)",
            border: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.05) inset",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-1">Super Admin</h1>
          <p className="text-sm text-center mb-8" style={{ color: "#6b7280" }}>
            Acesso restrito ao painel de controle global
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "#9ca3af" }}>
                SENHA DE ACESSO
              </label>
              <input
                type="password"
                name="secret"
                placeholder="••••••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {state.error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 cursor-pointer disabled:opacity-60"
              style={{
                background: isPending ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: isPending ? "none" : "0 4px 15px rgba(124,58,237,0.4)",
              }}
            >
              {isPending ? "Verificando..." : "Acessar Painel"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#374151" }}>
          Acesso exclusivo para administradores do sistema
        </p>
      </div>
    </div>
  );
}
