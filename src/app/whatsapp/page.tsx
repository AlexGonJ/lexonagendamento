"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackCustomEvent, trackEvent } from "@/components/MetaPixel";

function RedirectLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pega o texto da URL caso exista (ex: /whatsapp?text=Olá)
    const text = searchParams.get('text');
    const source = searchParams.get('source');
    const intent = searchParams.get('intent');
    const plan = searchParams.get('plan');
    const baseUrl = "https://wa.me/5538999023012";
    const finalUrl = text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
    const referrerPath = document.referrer
      ? new URL(document.referrer).pathname
      : undefined;
    const originPath = source || referrerPath || "unknown";

    const eventData = {
      content_name: plan || "Contato via WhatsApp",
      content_category: "WhatsApp",
      landing_page: originPath,
      intent: intent || "contact",
      ...(plan ? { plan } : {}),
    };

    // Contact é o evento padrão para otimização de campanhas; o evento
    // personalizado mantém os detalhes do funil para análise no Events Manager.
    trackEvent("Contact", eventData);
    trackCustomEvent("CliqueWhatsApp", eventData);

    // Aguarda 1.5 segundos para dar tempo do Pixel registrar a visita e o evento, depois redireciona
    const timer = setTimeout(() => {
      window.location.href = finalUrl;
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <h1 className="text-2xl font-bold text-white tracking-tight">
        Redirecionando para o WhatsApp...
      </h1>
      <p className="text-slate-400">
        Aguarde um momento. Se não for redirecionado automaticamente,{" "}
        <a href="https://wa.me/5538999023012" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors">
          clique aqui
        </a>.
      </p>
    </div>
  );
}

export default function WhatsAppRedirectPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <Suspense fallback={
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      }>
        <RedirectLogic />
      </Suspense>
    </div>
  );
}
