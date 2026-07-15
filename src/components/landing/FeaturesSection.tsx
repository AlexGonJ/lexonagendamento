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

const features = [
  {
    id: "whatsapp",
    badge: "Automação",
    badgeColor: "bg-emerald-50 text-emerald-600",
    title: "WhatsApp no automático",
    subtitle:
      "Confirmações, lembretes e cancelamentos enviados automaticamente. Reduza faltas sem mover um dedo.",
    points: [
      "Confirmação imediata após agendamento",
      "Lembrete 24h e 2h antes do horário",
      "Aviso automático de cancelamento com link para remarcar",
    ],
    icon: MessageCircle,
    checkColor: "text-emerald-500 bg-emerald-50",
    image: "/landing/feature-whatsapp.png",
    imageAlt: "Automação de WhatsApp para agendamentos",
  },
  {
    id: "agenda",
    badge: "Organização",
    badgeColor: "bg-blue-50 text-blue-600",
    title: "Agenda inteligente e visual",
    subtitle:
      "Calendário interativo com visão diária e semanal. Sincronize com Google Calendar e nunca perca um compromisso.",
    points: [
      "Visão diária e semanal interativa",
      "Sincronização com Google Calendar",
      "Bloqueio de horários e intervalos automáticos",
    ],
    icon: Calendar,
    checkColor: "text-blue-600 bg-blue-50",
    image: "/landing/feature-calendar.png",
    imageAlt: "Agenda inteligente com calendário visual",
  },
  {
    id: "loja",
    badge: "Personalização",
    badgeColor: "bg-slate-50 text-slate-600",
    title: "Sua loja, sua identidade",
    subtitle:
      "Página exclusiva de agendamento com sua marca, cores e serviços. Link próprio para compartilhar nas redes.",
    points: [
      "Página de agendamento com sua marca",
      "Cores e logo personalizados",
      "Link exclusivo para compartilhar nas redes",
    ],
    icon: Palette,
    checkColor: "text-slate-500 bg-slate-50",
    image: "/landing/feature-store.png",
    imageAlt: "Personalização da página de agendamento",
  },
  {
    id: "crm",
    badge: "Inteligência",
    badgeColor: "bg-blue-50 text-blue-600",
    title: "CRM integrado e completo",
    subtitle:
      "Conheça seus clientes como nunca. Histórico, frequência, valor gasto e preferências — tudo em um só lugar.",
    points: [
      "Histórico completo de cada cliente",
      "Frequência e valor gasto rastreados",
      "Base de clientes organizada e acessível",
    ],
    icon: Users,
    checkColor: "text-blue-500 bg-blue-50",
    image: "/landing/feature-crm.png",
    imageAlt: "CRM integrado com gestão de clientes",
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-5">
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
                className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center`}
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
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.checkColor.split(" ")[1]}`}>
                          <Check className={`w-3 h-3 ${feature.checkColor.split(" ")[0]}`} />
                        </div>
                        <span className="text-sm text-landing-text-muted leading-relaxed font-medium">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Image */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className={`flex ${isReversed ? "lg:order-1 justify-center lg:justify-start" : "justify-center lg:justify-end"}`}
                >
                  <Image
                    src={feature.image}
                    alt={feature.imageAlt}
                    width={520}
                    height={400}
                    className="feature-image w-full max-w-[520px]"
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
