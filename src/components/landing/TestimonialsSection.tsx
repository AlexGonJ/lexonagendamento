"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rafael Mendes",
    role: "Dono · Barbearia The Old One",
    avatar: "RM",
    avatarGradient: "from-blue-400 to-blue-600",
    text: "Antes eu perdia 3-4 clientes por semana por falta. Depois que ativei os lembretes automáticos, minhas faltas caíram quase a zero. Meu faturamento subiu 30% em dois meses.",
    highlight: "faturamento subiu 30%",
    rating: 5,
  },
  {
    name: "Camila Souza",
    role: "Proprietária · Studio Bella",
    avatar: "CS",
    avatarGradient: "from-slate-400 to-slate-500",
    text: "A página de agendamento personalizada com a minha marca fez toda a diferença. Meus clientes adoram a facilidade e eu não preciso mais ficar no WhatsApp o dia inteiro.",
    highlight: "não preciso mais ficar no WhatsApp",
    rating: 5,
  },
  {
    name: "Dr. Lucas Andrade",
    role: "Dentista · Clínica Sorriso",
    avatar: "LA",
    avatarGradient: "from-blue-400 to-blue-500",
    text: "O CRM integrado me ajuda a conhecer cada paciente. Sei a frequência, o histórico e posso oferecer um atendimento muito mais personalizado. É outro nível.",
    highlight: "atendimento muito mais personalizado",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 lg:py-32 section-alt">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-5">
            Depoimentos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-landing-text mb-5 leading-[1.15]">
            Quem usa,{" "}
            <span className="text-gradient-brand">recomenda</span>
          </h2>
          <p className="text-lg text-landing-text-muted leading-relaxed">
            Veja como empreendedores reais transformaram seus negócios.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="landing-card p-7 flex flex-col"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-blue-500/10 mb-4" />

              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star
                    key={j}
                    className="w-4 h-4 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              {/* Text with highlight */}
              <p className="text-landing-text-muted leading-relaxed flex-1 mb-6 text-[15px]">
                &ldquo;{t.text.split(t.highlight)[0]}
                <span className="font-bold text-landing-text">{t.highlight}</span>
                {t.text.split(t.highlight)[1]}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-landing-border">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-landing-text">
                    {t.name}
                  </p>
                  <p className="text-xs text-landing-text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
