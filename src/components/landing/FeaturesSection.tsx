"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  MessageCircle,
  Calendar,
  Palette,
  Users,
  Check,
} from "lucide-react";

const BrowserMockup = ({ src, alt, glowColor, floatingText, floatingBg }: { src: string; alt: string; glowColor: string; floatingText?: string; floatingBg?: string }) => (
  <div className="relative w-full max-w-[520px]">
    {/* Ambient Glow */}
    <div className={`absolute -inset-6 bg-gradient-to-tr ${glowColor} rounded-[2rem] blur-2xl opacity-75`} />
    
    <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-black/80 overflow-hidden transition-all duration-300 hover:shadow-blue-500/10">
      {/* Browser Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/60 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-red-500/80" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
        <div className="w-2 h-2 rounded-full bg-green-500/80" />
        <div className="h-4.5 w-36 sm:w-48 mx-auto bg-slate-900/60 border border-white/5 rounded flex items-center justify-center text-[9px] text-slate-400 font-semibold select-none">
          lexonagenda.com.br/admin
        </div>
      </div>
      {/* Screen Content */}
      <div className="relative overflow-hidden bg-slate-950 aspect-[16/9] flex items-center justify-center">
        <Image
          src={src}
          alt={alt}
          width={520}
          height={293}
          className="w-full h-auto object-cover hover:scale-[1.015] transition-transform duration-500 opacity-90 hover:opacity-100"
        />
      </div>
    </div>

    {/* Floating text badge */}
    {floatingText && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={`absolute -top-4 -right-4 px-3.5 py-1.5 rounded-full ${floatingBg || "bg-blue-600 text-white"} text-xs font-bold shadow-lg border border-white/20 select-none z-10`}
      >
        {floatingText}
      </motion.div>
    )}
  </div>
);

const features = [
  {
    id: "whatsapp",
    badge: "Automação",
    badgeColor: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
    title: "WhatsApp no automático",
    subtitle:
      "Confirmações, lembretes e cancelamentos enviados automaticamente. Reduza faltas sem mover um dedo.",
    points: [
      "Confirmação imediata após agendamento",
      "Lembrete 24h e 2h antes do horário",
      "Aviso automático de cancelamento com link para remarcar",
    ],
    icon: MessageCircle,
    checkColor: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    image: "/landing/whatsapp.jpg",
    imageAlt: "Automação de WhatsApp para agendamentos",
    glowColor: "from-emerald-500/10 to-teal-500/5",
    floatingText: "✓ 100% Entregue",
    floatingBg: "bg-emerald-500 text-white",
  },
  {
    id: "agenda",
    badge: "Organização",
    badgeColor: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
    title: "Agenda inteligente e visual",
    subtitle:
      "Calendário interativo com visão diária e semanal. Sincronize com Google Calendar e nunca perca um compromisso.",
    points: [
      "Visão diária e semanal interativa",
      "Sincronização com Google Calendar",
      "Bloqueio de horários e intervalos automáticos",
    ],
    icon: Calendar,
    checkColor: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
    image: "/landing/semana.png",
    imageAlt: "Agenda inteligente com calendário visual",
    glowColor: "from-blue-500/10 to-indigo-500/5",
    floatingText: "📅 Sincronizado",
    floatingBg: "bg-blue-600 text-white",
  },
  {
    id: "loja",
    badge: "Personalização",
    badgeColor: "bg-white/5 border border-white/10 text-slate-300",
    title: "Sua loja, sua identidade",
    subtitle:
      "Página exclusiva de agendamento com sua marca, cores e serviços. Link próprio para compartilhar nas redes.",
    points: [
      "Página de agendamento com sua marca",
      "Cores e logo personalizados",
      "Link exclusivo para compartilhar nas redes",
    ],
    icon: Palette,
    checkColor: "text-slate-300 bg-white/5 border border-white/10",
    image: "/landing/luminah.png",
    imageAlt: "Personalização da página de agendamento",
    glowColor: "from-slate-500/10 to-slate-600/5",
    floatingText: "🎨 Site Online ✓",
    floatingBg: "bg-slate-950 border border-white/10 text-white",
  },
  {
    id: "crm",
    badge: "Inteligência",
    badgeColor: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400",
    title: "CRM integrado e completo",
    subtitle:
      "Conheça seus clientes como nunca. Histórico, frequência, valor gasto e preferências — tudo em um só lugar.",
    points: [
      "Histórico completo de cada cliente",
      "Frequência e valor gasto rastreados",
      "Base de clientes organizada e acessível",
    ],
    icon: Users,
    checkColor: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
    image: "/landing/feature-crm.png",
    imageAlt: "CRM integrado com gestão de clientes",
    glowColor: "from-indigo-500/10 to-blue-500/5",
    floatingText: "👥 +40% Retenção",
    floatingBg: "bg-indigo-600 text-white",
  },
];

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24 lg:py-32 section-alt">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-5">
            Funcionalidades
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-landing-text mb-5 leading-[1.15]">
            Tudo que você precisa,{" "}
            <span className="text-gradient-brand">em um só lugar</span>
          </h2>
          <p className="text-lg text-landing-text-muted leading-relaxed">
            Do agendamento ao atendimento, cada detalhe pensado para facilitar
            sua rotina e encantar seus clientes.
          </p>
        </motion.div>

        {/* Feature rows with real images */}
        <div className="space-y-20 lg:space-y-28">
          {features.map((feature, i) => {
            const isReversed = i % 2 !== 0;

            return (
              <div
                key={feature.id}
                className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              >
                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`${isReversed ? "lg:order-2" : ""}`}
                >
                  <span
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold mb-5 ${feature.badgeColor}`}
                  >
                    <feature.icon className="w-4 h-4" />
                    {feature.badge}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-landing-text mb-4 leading-[1.15]">
                    {feature.title}
                  </h3>
                  <p className="text-landing-text-muted leading-relaxed mb-6 text-[15.5px]">
                    {feature.subtitle}
                  </p>
                  <ul className="space-y-3.5">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.checkColor}`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-landing-text-muted leading-relaxed font-medium">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Image Wrap */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className={`flex ${isReversed ? "lg:order-1 justify-center lg:justify-start" : "justify-center lg:justify-end"}`}
                >
                  <BrowserMockup
                    src={feature.image}
                    alt={feature.imageAlt}
                    glowColor={feature.glowColor}
                    floatingText={feature.floatingText}
                    floatingBg={feature.floatingBg}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
