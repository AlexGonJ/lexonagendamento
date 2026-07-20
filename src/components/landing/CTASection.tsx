"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Shield, Zap } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/5 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-black/80"
        >
          {/* Inner glow decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px]" />

          <div className="relative space-y-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Pronto para transformar
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">seu negócio?</span>
            </h2>

            <p className="text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              Junte-se a mais de 500 empreendedores que já automatizaram seus
              agendamentos e aumentaram seu faturamento.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a 
                href="#planos" 
                className="btn-primary text-lg !px-10 !py-4 !rounded-2xl shadow-[0_4px_25px_rgba(0,107,255,0.45)] hover:shadow-[0_4px_35px_rgba(0,107,255,0.65)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Comece Grátis Agora
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
              {[
                { icon: Shield, text: "14 dias grátis" },
                { icon: Zap, text: "Setup em 5 minutos" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-sm text-slate-400"
                >
                  <item.icon className="w-4 h-4 text-blue-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
