"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Preciso instalar algo no meu celular ou computador?",
    answer:
      "Não! A Lexon Agenda funciona 100% no navegador. Basta acessar pelo celular, tablet ou computador. Sem downloads, sem complicação.",
  },
  {
    question: "Meus clientes precisam criar conta para agendar?",
    answer:
      "Não! Seus clientes agendam sem criar conta. Eles acessam o link da sua página, escolhem o serviço, data e horário, e preenchem apenas nome e celular. Rápido e sem atrito.",
  },
  {
    question: "Como funciona a integração com WhatsApp?",
    answer:
      "Você tem opção de usar nossa API própria ou integrar com a API oficial do WhatsApp (Meta Cloud API). As mensagens de confirmação, lembrete e cancelamento são enviadas automaticamente — você não precisa fazer nada. É tudo configurado durante o onboarding.",
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer:
      "Sim! Sem fidelidade, sem multa. Você pode cancelar seu plano a qualquer momento diretamente pelo painel. Se cancelar, seu acesso continua até o fim do período já pago.",
  },
  {
    question: "Existe um período de teste?",
    answer:
      "Sim! Todos os planos incluem 14 dias grátis. Você testa tudo antes de decidir.",
  },
  {
    question: "Como funciona a página personalizada do meu negócio?",
    answer:
      "Ao se cadastrar geramos uma página personalizada para o seu négocio, a partir do plano Pro você consegue configurar e personalizar como quiser.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-5">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-landing-text mb-4 leading-[1.15]">
            Perguntas frequentes
          </h2>
          <p className="text-landing-text-muted">
            Não encontrou sua dúvida? Entre em contato pelo nosso suporte.
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="faq-item"
            >
              <button
                className="faq-trigger"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span>{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-landing-text-muted flex-shrink-0" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="faq-content">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
