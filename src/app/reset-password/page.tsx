"use client";

import Link from "next/link";
import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/actions/password-reset";

function ResetPasswordForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const token = params.get("token") || "";
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><form className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") || ""); if (password !== form.get("confirmPassword")) { setError("As senhas não conferem."); return; } startTransition(async () => { const result = await resetPassword(token, password); setError(result.success ? null : result.error || "Não foi possível redefinir a senha."); setMessage(result.success ? "Senha redefinida. Faça login com sua nova senha." : null); }); }}><h1 className="text-2xl font-bold text-white">Criar nova senha</h1><p className="text-sm text-slate-400">Use pelo menos 8 caracteres.</p><input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Nova senha" className="w-full p-3 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg" /><input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="Repita a nova senha" className="w-full p-3 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg" />{message && <p className="text-sm text-emerald-400">{message}</p>}{error && <p className="text-sm text-red-400">{error}</p>}<button disabled={pending || !token} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{pending ? "Salvando..." : "Redefinir senha"}</button><Link href="/login" className="block text-center text-sm text-blue-400">Ir para o login</Link></form></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><ResetPasswordForm /></Suspense>;
}
