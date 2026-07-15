"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center pt-[72px] overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Premium blue + slate gradient orbs */}
        <div className="absolute top-[10%] left-[0%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-[5%] right-[0%] w-[500px] h-[500px] bg-slate-200/40 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-blue-50/40 rounded-full blur-[80px]" />

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #64748B 1px, transparent 0)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full py-16 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col gap-7"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                +500 negócios já automatizaram com Lexon
              </span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-extrabold leading-[1.08] text-landing-text">
              Pare de perder clientes.
              <br />
              <span className="text-gradient-brand">Automatize sua agenda.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg lg:text-[1.2rem] text-landing-text-muted leading-relaxed max-w-lg">
              Confirmações por WhatsApp, lembretes automáticos e uma página de agendamento profissional.{" "}
              <span className="font-semibold text-landing-text">Reduza faltas em 40%</span> e fature mais todo mês.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <a href="#planos" className="btn-primary text-center">
                Teste Grátis 14 Dias
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#funcionalidades" className="btn-secondary text-center">
                <Play className="w-4 h-4 fill-current" />
                Ver como funciona
              </a>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-landing-border/60 max-w-md">
              {[
                { value: "500+", label: "Negócios" },
                { value: "40%", label: "Menos faltas" },
                { value: "5min", label: "Para configurar" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="stat-number text-2xl text-[var(--color-brand-blue)]">{stat.value}</p>
                  <p className="text-xs text-landing-text-muted mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Main hero image */}
              <div className="animate-float">
                <Image
                  src="/landing/hero-dashboard.png"
                  alt="Dashboard de agendamento inteligente"
                  width={560}
                  height={420}
                  className="feature-image w-full max-w-[560px]"
                  priority
                />
              </div>

              {/* Floating accent card — small mobile preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-4 -left-8 md:-left-12 w-[140px] md:w-[160px]"
              >
                <Image
                  src="/landing/hero-mobile.png"
                  alt="Agendamento pelo celular"
                  width={160}
                  height={280}
                  className="rounded-2xl shadow-2xl shadow-slate-200/50 border-2 border-white"
                />
              </motion.div>

              {/* Floating notification card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="absolute -top-2 -right-2 md:-right-6 bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-slate-100 p-3.5 max-w-[200px]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Confirmado ✓</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Maria confirmou o horário de amanhã às 14h
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
