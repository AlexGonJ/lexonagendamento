"use client";

import { useState, useTransition, useEffect } from "react";
import { registerTenant } from "@/actions/checkout";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight, ShieldCheck, CreditCard, Building2, User, Mail, Lock } from "lucide-react";

interface PlanDetails {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

const planDetailsMap: Record<string, PlanDetails> = {
  starter: {
    name: "Starter",
    monthlyPrice: 99,
    annualPrice: 73,
    features: [
      "Até 1 profissional",
      "200 agendamentos/mês",
      "WhatsApp automático (30 dias grátis)",
      "Página de agendamento básica",
      "Suporte por email",
    ],
  },
  profissional: {
    name: "Profissional",
    monthlyPrice: 179,
    annualPrice: 149,
    features: [
      "Até 3 profissionais",
      "Agendamentos ilimitados",
      "WhatsApp automático",
      "Página personalizada completa",
      "Suporte prioritário",
      "CRM completo",
    ],
  },
  escala: {
    name: "Escala",
    monthlyPrice: 359,
    annualPrice: 299,
    features: [
      "Profissionais ilimitados",
      "Agendamentos ilimitados",
      "WhatsApp automático",
      "Página completa + domínio próprio",
      "Suporte dedicado",
      "Integração com Google Calendar",
      "CRM completo + relatórios avançados",
    ],
  },
};

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan")?.toLowerCase() || "profissional";

  const [selectedPlanId, setSelectedPlanId] = useState(
    planDetailsMap[initialPlan] ? initialPlan : "profissional"
  );
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(null);

  const plan = planDetailsMap[selectedPlanId] || planDetailsMap.profissional;
  const currentPrice = billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;

  // Auto-generate slug from store name
  useEffect(() => {
    const auto = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(auto);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await registerTenant({
        name,
        slug,
        email,
        password,
        planId: selectedPlanId,
        billingPeriod,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Cadastro realizado com sucesso!");
        if (res.paymentUrl) {
          setPaymentRedirectUrl(res.paymentUrl);
          // Redirect to Mercado Pago after 3 seconds
          setTimeout(() => {
            window.location.href = res.paymentUrl!;
          }, 2500);
        } else {
          // If no payment URL is configured, let them go to the dashboard
          setTimeout(() => {
            router.push("/admin");
          }, 3500);
        }
      } else {
        setError(res.error || "Ocorreu um erro no cadastro.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 w-full flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
            L
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Lexon Agenda
          </span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
          Já tem conta? Entrar
        </Link>
      </header>

      {/* Main Grid */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Signup Form */}
        <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Crie a sua <span className="text-gradient-brand">assinatura</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Insira os dados do seu estabelecimento para começar a automatizar sua agenda.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
              {paymentRedirectUrl ? (
                <p className="text-xs text-emerald-400/80 animate-pulse mt-1">
                  Redirecionando para o Mercado Pago em instantes...
                </p>
              ) : (
                <p className="text-xs text-emerald-400/80 animate-pulse mt-1">
                  Direcionando para o painel de administração em instantes...
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nome do Estabelecimento *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    disabled={isPending || !!successMsg}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Barbearia Brutus"
                    className="w-full pl-10 pr-4 py-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Endereço da Web (URL) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-slate-500 font-medium font-mono select-none">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isPending || !!successMsg}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="barbearia-brutus"
                    className="w-full pl-7 pr-4 py-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600 disabled:opacity-50 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                E-mail Comercial (Acesso) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  disabled={isPending || !!successMsg}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Senha de Acesso *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  disabled={isPending || !!successMsg}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina sua senha"
                  className="w-full pl-10 pr-4 py-3 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !!successMsg}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm py-4 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando estabelecimento...
                </>
              ) : (
                <>
                  Criar Estabelecimento & Pagar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {paymentRedirectUrl && (
            <div className="pt-4 border-t border-white/5 text-center">
              <a
                href={paymentRedirectUrl}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
              >
                Clique aqui se não for redirecionado automaticamente
              </a>
            </div>
          )}
        </div>

        {/* Right Side: Order Summary & Toggle */}
        <div className="lg:col-span-5 bg-slate-900/30 border border-white/5 rounded-3xl p-7 space-y-6">
          <h2 className="text-lg font-bold">Resumo da Assinatura</h2>

          {/* Plan Selector inside Summary */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
            {Object.keys(planDetailsMap).map((planId) => {
              const active = selectedPlanId === planId;
              return (
                <button
                  key={planId}
                  type="button"
                  disabled={isPending || !!successMsg}
                  onClick={() => setSelectedPlanId(planId)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {planDetailsMap[planId].name}
                </button>
              );
            })}
          </div>

          {/* Billing Period Selector */}
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Período</p>
              <p className="text-sm font-bold mt-0.5">{billingPeriod === "annual" ? "Plano Anual" : "Plano Mensal"}</p>
            </div>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                disabled={isPending || !!successMsg}
                onClick={() => setBillingPeriod("monthly")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  billingPeriod === "monthly" ? "bg-slate-800 text-white" : "text-slate-500"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                disabled={isPending || !!successMsg}
                onClick={() => setBillingPeriod("annual")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  billingPeriod === "annual" ? "bg-slate-800 text-white" : "text-slate-500"
                }`}
              >
                Anual
                <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Price details */}
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/5 text-center space-y-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Valor total recorrente</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-extrabold">R$ {currentPrice}</span>
              <span className="text-slate-400 text-xs font-medium">/mês</span>
            </div>
            <p className="text-xs text-slate-500">
              {billingPeriod === "annual"
                ? `Cobrado anualmente (R$ ${currentPrice * 12}/ano)`
                : "Cobrado mensalmente"}
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">O que está incluso:</p>
            <div className="space-y-2.5">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="pt-4 border-t border-white/5 flex flex-col gap-2 text-xs text-slate-500 text-center">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Garantia de 7 dias ou cancelamento sem custos</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span>Pagamento processado via Mercado Pago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
