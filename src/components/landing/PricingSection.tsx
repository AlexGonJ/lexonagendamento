"use client";

import { ArrowRight, Building2, Check, Crown, Info, X, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { trackCustomEvent } from "@/components/MetaPixel";

type Feature = {
  label: string;
  status: "included" | "optional" | "unavailable";
};

const plans: Array<{
  id: string;
  name: string;
  icon: typeof Zap;
  description: string;
  monthlyPrice: number;
  popular?: boolean;
  hasFreePlatformMonth?: boolean;
  ctaStyle: "secondary" | "primary" | "slate";
  features: Feature[];
}> = [
  {
    id: "agenda",
    name: "Agenda",
    icon: Zap,
    description: "Para começar com uma agenda online simples e profissional.",
    monthlyPrice: 59,
    hasFreePlatformMonth: true,
    ctaStyle: "secondary",
    features: [
      { label: "1 profissional", status: "included" },
      { label: "Agenda online e página de agendamento", status: "included" },
      { label: "Cadastro de serviços e clientes", status: "included" },
      { label: "Gestão de horários e atendimentos", status: "included" },
      { label: "Automação por WhatsApp", status: "unavailable" },
      { label: "Personalização de marca", status: "unavailable" },
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    icon: Crown,
    description: "Para quem quer uma operação mais completa e flexível.",
    monthlyPrice: 89,
    popular: true,
    hasFreePlatformMonth: true,
    ctaStyle: "primary",
    features: [
      { label: "Até 3 profissionais", status: "included" },
      { label: "Tudo do plano Agenda", status: "included" },
      { label: "Identidade visual da página", status: "included" },
      { label: "CRM e painel financeiro", status: "included" },
      { label: "Automação por WhatsApp disponível mediante taxa extra", status: "optional" },
      { label: "Conexão pela API oficial da Meta", status: "unavailable" },
    ],
  },
  {
    id: "automacao",
    name: "Automação",
    icon: Building2,
    description: "Para operar com automações de WhatsApp desde o início.",
    monthlyPrice: 169,
    ctaStyle: "slate",
    features: [
      { label: "Até 6 profissionais", status: "included" },
      { label: "Tudo do plano Profissional", status: "included" },
      { label: "Automação por WhatsApp inclusa", status: "included" },
      { label: "Confirmações, lembretes e reativação", status: "included" },
      { label: "Opção de conexão com a API oficial da Meta", status: "included" },
      { label: "Configuração acompanhada", status: "included" },
    ],
  },
];

const statusIcon = {
  included: Check,
  optional: Info,
  unavailable: X,
};

export default function PricingSection() {
  return (
    <section id="planos" className="py-24 lg:py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-50/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-5">
            Lançamento · primeiro mês da plataforma grátis
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-landing-text mb-5 leading-[1.15]">
            Comece pelo essencial.
            <br />
            <span className="text-gradient-brand">E evolua no seu ritmo.</span>
          </h2>
          <p className="text-lg text-landing-text-muted leading-relaxed">
            Planos mensais, sem fidelidade e com uma estrutura simples para o
            momento do seu negócio. A automação é ativada apenas quando você optar por ela.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-5 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const PlanIcon = plan.icon;
            const ctaLabel = plan.hasFreePlatformMonth ? "Começar mês grátis" : "Quero automatizar";
            const whatsappMessage = plan.hasFreePlatformMonth
              ? `Olá! Quero começar o primeiro mês grátis no plano ${plan.name} da Lexon Agenda.`
              : `Olá! Quero conhecer o plano ${plan.name} com automação da Lexon Agenda.`;

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`relative flex flex-col justify-between ${plan.popular ? "pricing-highlight" : "landing-card"} p-7 lg:p-8`}
              >
                <div>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-blue text-white text-xs font-bold shadow-lg shadow-blue-500/25">
                        <Crown className="w-3.5 h-3.5" />
                        Mais flexível
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? "bg-gradient-blue text-white" : "bg-white/5 border border-white/10 text-slate-300"}`}>
                        <PlanIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-extrabold text-landing-text">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-landing-text-muted leading-relaxed">{plan.description}</p>
                    {plan.id === "automacao" && (
                      <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                        API oficial Meta Cloud disponível
                      </span>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="stat-number text-4xl text-landing-text">R$ {plan.monthlyPrice}</span>
                      <span className="text-landing-text-muted text-sm font-medium">/mês</span>
                    </div>
                    {plan.hasFreePlatformMonth ? (
                      <p className="text-sm text-blue-400 mt-1 h-6 font-medium">
                        Primeiro mês da plataforma grátis
                      </p>
                    ) : (
                      <div className="h-6 mt-1" aria-hidden="true" />
                    )}
                  </div>

                  <a
                    href={`/whatsapp?source=home&intent=subscription&plan=${plan.id}&text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackCustomEvent("CliqueAssinatura", { plano: plan.name })}
                    className={`${plan.ctaStyle === "primary" ? "btn-primary animate-pulse-glow" : plan.ctaStyle === "slate" ? "btn-slate" : "btn-secondary"} text-center mb-6 block`}
                  >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4 inline-block ml-1" />
                  </a>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
                  {plan.features.map((feature) => {
                    const StatusIcon = statusIcon[feature.status];
                    const iconClass = feature.status === "included"
                      ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                      : feature.status === "optional"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                        : "bg-white/5 border border-white/10 text-slate-500";

                    return (
                      <div key={feature.label} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                          <StatusIcon className="w-3 h-3" />
                        </div>
                        <span className={`text-sm ${feature.status === "unavailable" ? "text-slate-500" : "text-landing-text font-medium"}`}>
                          {feature.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto mt-10 p-5 bg-white/5 rounded-2xl border border-white/10"
        >
          <p className="text-xs text-landing-text-muted leading-relaxed text-center">
            <span className="font-semibold text-slate-300">Sobre a automação por WhatsApp:</span>{" "}
            no plano Profissional, a automação pode ser adicionada mediante taxa extra, informada durante a negociação, e passa a ser cobrada a partir da ativação. No plano Automação, ela já está inclusa desde o início. A conexão com a API oficial da Meta é uma opção exclusiva desse plano; cobranças de conversas e templates da Meta são contratadas diretamente com a Meta.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-landing-text-muted mt-8 font-medium"
        >
          Primeiro mês da plataforma sem custo · Automação cobrada na ativação · Sem fidelidade
        </motion.p>
      </div>
    </section>
  );
}
