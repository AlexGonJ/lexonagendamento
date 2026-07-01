"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[data-turnstile-script="true"]')) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.setAttribute("data-turnstile-script", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Turnstile."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type TurnstileWidgetProps = {
  siteKey?: string;
  onTokenChange: (token: string | null) => void;
  resetSignal?: number;
  label?: string;
};

export default function TurnstileWidget({
  siteKey,
  onTokenChange,
  resetSignal = 0,
  label = "Verificacao anti-bot",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disabledMessage = !siteKey
    ? `${label} desativada no ambiente local. Configure \`TURNSTILE_SECRET_KEY\` e \`NEXT_PUBLIC_TURNSTILE_SITE_KEY\` para exigir isso em producao.`
    : null;

  useEffect(() => {
    onTokenChange(null);

    if (!siteKey) {
      return;
    }

    let cancelled = false;

    const mountWidget = async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile) return;

        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            onTokenChange(token);
            setError(null);
          },
          "error-callback": () => {
            onTokenChange(null);
            setError("Falha ao carregar a verificacao. Tente novamente.");
          },
          "expired-callback": () => {
            onTokenChange(null);
            setError("A verificacao expirou. Resolva novamente.");
          },
        });
      } catch {
        if (!cancelled) {
          setError("Nao foi possivel carregar a verificacao anti-bot.");
        }
      }
    };

    void mountWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, onTokenChange, resetSignal]);

  if (!siteKey) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
        {disabledMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div ref={containerRef} />
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
