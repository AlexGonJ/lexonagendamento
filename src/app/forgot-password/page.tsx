"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/actions/password-reset";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><form className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5" onSubmit={(event) => { event.preventDefault(); const email = new FormData(event.currentTarget).get("email"); startTransition(async () => { const result = await requestPasswordReset(String(email || "")); setError(result.success ? null : result.error || "Não foi possível concluir a solicitação."); setMessage(result.success ? result.message || null : null); }); }}><h1 className="text-2xl font-bold text-white">Recuperar senha</h1><p className="text-sm text-slate-400">Informe seu e-mail comercial para receber um link seguro.</p><input name="email" type="email" required autoComplete="email" placeholder="seuemail@exemplo.com" className="w-full p-3 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg" />{message && <p className="text-sm text-emerald-400">{message}</p>}{error && <p className="text-sm text-red-400">{error}</p>}<button disabled={pending} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{pending ? "Enviando..." : "Enviar link"}</button><Link href="/login" className="block text-center text-sm text-blue-400">Voltar ao login</Link></form></main>;
}
