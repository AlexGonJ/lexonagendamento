"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import DarkVeil from "./DarkVeil";

export default function HeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center pt-[72px] overflow-hidden bg-slate-950 text-white">
      {/* Background shader & overlay */}
      <div className="absolute inset-0 z-0 bg-slate-950 pointer-events-none">
        <DarkVeil
          hueShift={220} // Indigo/Blue theme shift
          noiseIntensity={0.012}
          scanlineIntensity={0.08}
          speed={0.35}
          scanlineFrequency={1.8}
          warpAmount={0.07}
        />
        {/* Dark gradients to ensure contrast and a smooth flow */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/20 to-slate-950" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-16 lg:py-0">
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
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-blue-400 backdrop-blur-md shadow-inner shadow-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                Vários negócios já automatizaram com Lexon
              </span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-extrabold leading-[1.08] text-white tracking-tight">
              Pare de perder clientes.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto]">
                Automatize sua agenda.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg lg:text-[1.2rem] text-slate-300 leading-relaxed max-w-lg">
              Confirmações por WhatsApp, lembretes automáticos e uma página de agendamento profissional.{" "}
              <span className="font-semibold text-white">Reduza faltas em 40%</span> e fature mais todo mês.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <a 
                href="#planos" 
                className="btn-primary text-center shadow-[0_4px_20px_rgba(0,107,255,0.45)] hover:shadow-[0_4px_30px_rgba(0,107,255,0.65)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Teste Grátis 14 Dias
                <ArrowRight className="w-4 h-4" />
              </a>
              <a 
                href="#funcionalidades" 
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 font-semibold text-sm rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-sm"
              >
                <Play className="w-4 h-4 fill-current text-blue-400" />
                Ver como funciona
              </a>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 max-w-md">
              {[
                { value: "40%", label: "Menos faltas" },
                { value: "5min", label: "Para configurar" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="stat-number text-2xl font-bold text-blue-400">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
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
              {/* Soft blue glow backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-[2rem] blur-3xl opacity-75" />

              {/* Main hero image with Browser Mockup */}
              <div className="animate-float relative">
                <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-black/80 overflow-hidden max-w-[560px] transition-all duration-300 hover:shadow-blue-500/25">
                  {/* Browser Header Bar */}
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-950/60 border-b border-white/10">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <div className="h-5 w-40 sm:w-56 mx-auto bg-slate-900/60 border border-white/5 rounded-md flex items-center justify-center text-[10px] text-slate-400 font-semibold select-none">
                      lexonagenda.com.br/admin
                    </div>
                  </div>
                  {/* Screen Content */}
                  <div className="relative overflow-hidden bg-slate-950">
                    <Image
                      src="/landing/agenda.png"
                      alt="Dashboard de agendamento inteligente"
                      width={560}
                      height={420}
                      className="w-full h-auto object-cover hover:scale-[1.015] transition-transform duration-500 opacity-90 hover:opacity-100"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Floating secondary 16:9 mockup */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-10 -left-6 md:-left-14 w-[180px] md:w-[260px] z-10"
              >
                <div className="relative rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-black/80 overflow-hidden">
                  {/* Browser Bar */}
                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950/60 border-b border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
                  </div>
                  {/* Screen Content */}
                  <div className="relative overflow-hidden bg-slate-950 aspect-[16/9] flex items-center justify-center">
                    <Image
                      src="/landing/home.png"
                      alt="Agendamento pelo celular"
                      width={260}
                      height={146}
                      className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500 opacity-95 hover:opacity-100"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Floating notification card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="absolute -top-4 -right-2 md:-right-8 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/60 border border-white/10 p-3.5 max-w-[200px] z-10"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">Confirmado ✓</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-snug font-medium">
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
