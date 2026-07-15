"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, BarChart3, ArrowUpRight } from "lucide-react";

const advantages = [
  {
    icon: Clock,
    title: "Mais Tempo para Você",
    description:
      "Chega de anotar em caderno ou responder WhatsApp o dia inteiro. O sistema agenda, confirma e lembra seus clientes — sozinho.",
    stat: "5h",
    statLabel: "economizadas por semana",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    accentColor: "from-blue-500 to-blue-600",
    borderHover: "hover:border-blue-300",
  },
  {
    icon: TrendingUp,
    title: "Mais Dinheiro no Caixa",
    description:
      "Lembretes automáticos reduzem faltas em até 40%. Menos buracos na agenda = mais atendimentos = mais faturamento. Simples assim.",
    stat: "40%",
    statLabel: "menos faltas",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
    accentColor: "from-slate-400 to-slate-500",
    borderHover: "hover:border-slate-300",
  },
  {
    icon: BarChart3,
    title: "Mais Controle do Negócio",
    description:
      "Saiba quanto faturou, quem vem, quais serviços dão mais retorno. Tome decisões com dados reais, não achismo.",
    stat: "2x",
    statLabel: "mais eficiência",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    accentColor: "from-blue-400 to-blue-500",
    borderHover: "hover:border-blue-300",
  },
];

export default function AdvantagesSection() {
  return (
    <section id="vantagens" className="py-24 lg:py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-50/40 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-5">
            <ArrowUpRight className="w-4 h-4" />
            Por que escolher a Lexon
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-landing-text mb-5 leading-[1.15]">
            Seu negócio no{" "}
            <span className="text-gradient-brand">piloto automático</span>
          </h2>
          <p className="text-lg text-landing-text-muted leading-relaxed">
            Enquanto o sistema cuida dos agendamentos, você foca no que
            faz de melhor: atender seus clientes.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {advantages.map((adv, i) => (
            <motion.div
              key={adv.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className={`landing-card p-8 flex flex-col ${adv.borderHover}`}
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 ${adv.iconBg} rounded-2xl flex items-center justify-center mb-6`}
              >
                <adv.icon className={`w-7 h-7 ${adv.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-extrabold text-landing-text mb-3">
                {adv.title}
              </h3>

              {/* Description */}
              <p className="text-landing-text-muted leading-relaxed mb-8 flex-1 text-[15px]">
                {adv.description}
              </p>

              {/* Stat callout */}
              <div className="flex items-center gap-3 pt-5 border-t border-landing-border">
                <span
                  className={`stat-number text-3xl bg-gradient-to-r ${adv.accentColor} bg-clip-text text-transparent`}
                >
                  {adv.stat}
                </span>
                <span className="text-sm text-landing-text-muted font-medium">
                  {adv.statLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
