"use client";

import { login } from "@/actions/auth";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result.success) {
        router.refresh();
        router.push("/admin");
      } else {
        setError(result.error || "Ocorreu um erro ao fazer login.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Logo" width={200} height={200} />
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Acesso</h1>
          <p className="text-sm text-slate-400 mt-1">Lexon Digital Agendamentos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              E-mail Comercial
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="seuemail@exemplo.com"
              className="w-full p-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full p-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm py-3 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Autenticando...
              </>
            ) : (
              "Entrar no Painel"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
          <p className="text-xs text-slate-500">
            Dificuldades de acesso? Contate o gerente ou o suporte do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
