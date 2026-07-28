"use client";

import { useEffect, Suspense } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

function RedirectLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pega o texto da URL caso exista (ex: /whatsapp?text=Olá)
    const text = searchParams.get('text');
    const baseUrl = "https://wa.me/5538999023012";
    const finalUrl = text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;

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
      {/* 
        ========================================================================
        CÓDIGO DO PIXEL DA META (FACEBOOK)
        Substitua 'SEU_PIXEL_ID_AQUI' pelo ID real do seu Pixel do Facebook
        ========================================================================
      */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          
          fbq('init', '438763296618174'); 
          fbq('track', 'PageView');
          fbq('trackCustom', 'CliqueWhatsApp'); // Evento personalizado que criamos
        `}
      </Script>
      {/* ======================================================================== */}

      <Suspense fallback={
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      }>
        <RedirectLogic />
      </Suspense>
    </div>
  );
}
