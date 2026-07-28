"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, Crown, Zap, Building2 } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    description: "Para quem está começando e quer profissionalizar a agenda.",
    monthlyPrice: 99,
    annualPrice: 73,
    cta: "Entre em contato",
    ctaStyle: "secondary",
    features: [
      { label: "Até 1 profissional", included: true },
      { label: "200 agendamentos/mês", included: true },
      { label: "WhatsApp automático*", included: true },
      { label: "Página de agendamento básica", included: true },
      { label: "Suporte por email", included: true },
      { label: "Google Calendar", included: false },
      { label: "CRM completo", included: false },
      { label: "Relatórios avançados", included: false },
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    icon: Crown,
    description: "O plano mais escolhido. Tudo que você precisa para crescer.",
    monthlyPrice: 179,
    annualPrice: 149,
    cta: "Entre em contato",
    ctaStyle: "primary",
    popular: true,
    features: [
      { label: "Até 3 profissionais", included: true },
      { label: "Agendamentos ilimitados", included: true },
      { label: "WhatsApp automático*", included: true },
      { label: "Página personalizada completa", included: true },
      { label: "Suporte prioritário", included: true },
      { label: "CRM completo", included: true },
      { label: "Integração com Google Calendar", included: false },
      { label: "Relatórios avançados", included: false },
    ],
  },
  {
    id: "escala",
    name: "Escala",
    icon: Building2,
    description: "Para negócios que estão consolidados e querem escalar.",
    monthlyPrice: 359,
    annualPrice: 299,
    cta: "Entre em contato",
    ctaStyle: "slate",
    features: [
      { label: "Profissionais ilimitados", included: true },
      { label: "Agendamentos ilimitados", included: true },
      { label: "WhatsApp automático*", included: true },
      { label: "Página completa + domínio próprio", included: true },
      { label: "Suporte dedicado", included: true },
      { label: "Integração com Google Calendar", included: true },
      { label: "CRM completo", included: true },
      { label: "Relatórios avançados", included: true },
    ],
  },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="planos" className="py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-50/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-5">
            Planos & Preços
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-landing-text mb-5 leading-[1.15]">
            Invista no crescimento{" "}
            <span className="text-gradient-brand">do seu negócio</span>
          </h2>
          <p className="text-lg text-landing-text-muted leading-relaxed">
            Experimente nossa plataforma.
          </p>

          {/* Interactive Billing Toggle */}
          <div className="mt-8 inline-flex items-center justify-center p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                !isAnnual
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isAnnual
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Faturamento Anual
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                20% OFF
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-5 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className={`relative flex flex-col justify-between ${plan.popular ? "pricing-highlight" : "landing-card"
                } p-7 lg:p-8`}
            >
              <div>
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-blue text-white text-xs font-bold shadow-lg shadow-blue-500/25">
                      <Crown className="w-3.5 h-3.5" />
                      Mais Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular
                        ? "bg-gradient-blue text-white"
                        : plan.ctaStyle === "slate"
                          ? "bg-white/5 border border-white/10 text-slate-300"
                          : "bg-white/5 border border-white/10 text-slate-300"
                        }`}
                    >
                      <plan.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-landing-text">
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-sm text-landing-text-muted leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="stat-number text-4xl text-landing-text transition-all duration-300">
                      R$ {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-landing-text-muted text-sm font-medium">/mês</span>
                  </div>
                  <p className="text-sm text-landing-text-muted mt-1 h-6">
                    {isAnnual ? (
                      <>
                        <span className="line-through text-slate-400">
                          R$ {plan.monthlyPrice}/mês
                        </span>{" "}
                        <span className="text-blue-400 font-semibold">
                          no plano anual
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        Cobrado mensalmente
                      </span>
                    )}
                  </p>
                </div>

                <a
                  href={`https://wa.me/5538999023012?text=${encodeURIComponent(
                    `Olá! Gostaria de assinar o plano ${plan.name} (${isAnnual ? "Faturamento Anual" : "Faturamento Mensal"}) do LexonAgenda.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${plan.ctaStyle === "primary"
                    ? "btn-primary animate-pulse-glow"
                    : plan.ctaStyle === "slate"
                      ? "btn-slate"
                      : "btn-secondary"
                    } text-center mb-6 block`}
                >
                  {plan.cta}
                  {plan.ctaStyle === "primary" && (
                    <ArrowRight className="w-4 h-4 inline-block ml-1" />
                  )}
                </a>
              </div>

              {/* Features */}
              <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
                {plan.features.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    {f.included ? (
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-slate-500" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${f.included
                        ? "text-landing-text font-medium"
                        : "text-slate-500 line-through"
                        }`}
                    >
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Fine print for WhatsApp */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto mt-10 p-5 bg-white/5 rounded-2xl border border-white/10"
        >
          <p className="text-xs text-landing-text-muted leading-relaxed text-center">
            <span className="font-semibold text-slate-500">*Limites de Mensagens (WhatsApp):</span> O plano <strong>Starter</strong> inclui suporte a integração com nossa API via pacotes de mensagens de até 500 mensagens/mês vendido a parte. O plano <strong>Profissional</strong> inclui um pacote of 500 mensagens por mês em nossa API própria, planos de mensagens extras devem ser contratados. O plano <strong>Escala</strong> inclui suporte a integração com nossa API com pacote de mensagem de até 1200 mensagens/mês ou suporte para integração com a API da Meta (neste caso, os custos das mensagens deverão ser pagos diretamente à Meta). Consulte-nos para planos extras de mensagens.
          </p>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-landing-text-muted mt-8 font-medium"
        >
          🔒 Pagamento seguro · Sem fidelidade · Cancele a qualquer momento
        </motion.p>
      </div>
    </section>
  );
}
