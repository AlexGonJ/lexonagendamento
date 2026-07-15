"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Shield, Zap } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-slate-50/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-gradient-to-br from-[#0a3d38] via-[#0d5550] to-[#115e57] rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        >
          {/* Inner glow decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-400/10 rounded-full blur-[60px]" />

          <div className="relative space-y-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Pronto para transformar
              <br />
              <span className="text-blue-300">seu negócio?</span>
            </h2>

            <p className="text-lg text-blue-100/80 max-w-xl mx-auto leading-relaxed">
              Junte-se a mais de 500 empreendedores que já automatizaram seus
              agendamentos e aumentaram seu faturamento.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a href="#planos" className="btn-slate text-lg !px-10 !py-4 !rounded-2xl">
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
                  className="flex items-center gap-2 text-sm text-blue-200/70"
                >
                  <item.icon className="w-4 h-4" />
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
