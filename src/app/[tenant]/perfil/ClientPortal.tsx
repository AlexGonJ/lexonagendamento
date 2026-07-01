"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendClientOtp, verifyClientOtp, loginClientOAuth, logoutClient, verifyGoogleIdToken } from "@/actions/auth";
import { cancelBooking } from "@/actions/booking";
import Link from "next/link";

type Booking = {
  id: string;
  date: Date;
  status: string;
  notes: string | null;
  service: { name: string; price: number; duration: number };
  employee: { name: string; role: string };
};

type Client = {
  clientId: string;
  name: string;
  phone: string;
  email?: string | null;
};

type Subscription = {
  id: string;
  remainingSlots: number;
  endDate: Date | string;
  plan: { name: string; slots: number };
};

interface ClientPortalProps {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  logoUrl: string;
  initialClient: Client | null;
  bookings: Booking[];
  activeSubscription?: Subscription | null;
}

interface CustomWindow extends Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void }) => void;
        renderButton: (el: HTMLElement | null, options: { theme: string; size: string; width: number }) => void;
      };
    };
  };
}

export default function ClientPortal({
  tenantId,
  tenantSlug,
  tenantName,
  logoUrl,
  initialClient,
  bookings,
  activeSubscription,
}: ClientPortalProps) {
  const router = useRouter();

  // Estados de Login OTP
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1 = input phone/name, 2 = input code
  const [needsName, setNeedsName] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  // Estados para simular fluxo de OAuth (Google/Apple)
  const [oauthData, setOauthData] = useState<{ email?: string; googleId?: string; appleId?: string; name?: string } | null>(null);
  const [showOauthPhoneLink, setShowOauthPhoneLink] = useState(false);

  const [now] = useState(() => Date.now());

  const handleGoogleCredentialResponse = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) return;
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const verifyRes = await verifyGoogleIdToken(response.credential);
      if (verifyRes.success && verifyRes.googleId && verifyRes.email) {
        const oauthRes = await loginClientOAuth({
          email: verifyRes.email,
          googleId: verifyRes.googleId,
          name: verifyRes.name || "Cliente Google",
        });

        if (oauthRes.success) {
          if (oauthRes.linked) {
            setMsg({ type: "ok", text: "Login com Google realizado!" });
            router.refresh();
          } else {
            // Precisa vincular telefone
            setOauthData(oauthRes.oauthData || null);
            setShowOauthPhoneLink(true);
            setStep(1);
            setMsg({ type: "info", text: "Para concluir seu login com o Google, precisamos vincular seu número de WhatsApp." });
          }
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao logar com o Google." });
        }
      } else {
        setMsg({ type: "err", text: verifyRes.error || "Token do Google inválido." });
      }
    } catch (err) {
      console.error("Erro no callback do Google:", err);
      setMsg({ type: "err", text: "Erro ao processar login com o Google." });
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Carregar script do Google Identity Services
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const customWindow = window as unknown as CustomWindow;
      if (customWindow.google) {
        customWindow.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        customWindow.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          { theme: "outline", size: "large", width: 320 }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {
        // Silenciar erro se o script já tiver sido removido
      }
    };
  }, [handleGoogleCredentialResponse]);

  // Ações de cancelamento
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Enviar código OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setMsg({ type: "", text: "" });

    const res = await sendClientOtp(phone, tenantId);
    setLoading(false);

    if (res.success) {
      setStep(2);
      // Se estiver rodando local, facilita exibindo o código simulado
      if (res.code) {
        setMsg({ type: "ok", text: `[Modo de Teste] Código enviado por WhatsApp: ${res.code}` });
      } else {
        setMsg({ type: "ok", text: "Código enviado com sucesso via WhatsApp." });
      }
    } else {
      setMsg({ type: "err", text: res.error || "Erro ao enviar código." });
    }
  }

  // Verificar OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setMsg({ type: "", text: "" });

    // Se estiver no fluxo de vincular telefone ao OAuth
    if (showOauthPhoneLink && oauthData) {
      const res = await verifyClientOtp(phone, code, oauthData.name || name);
      if (res.success) {
        // Concluir vínculo do OAuth no banco
        const oauthRes = await loginClientOAuth({
          ...oauthData,
          phone: phone
        });
        setLoading(false);
        if (oauthRes.success) {
          router.refresh();
          setShowOauthPhoneLink(false);
          setOauthData(null);
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao vincular conta." });
        }
      } else {
        setLoading(false);
        setMsg({ type: "err", text: res.error || "Código incorreto." });
      }
      return;
    }

    // Fluxo normal de OTP apenas
    const res = await verifyClientOtp(phone, code, name);
    setLoading(false);

    if (res.success) {
      router.refresh();
      setStep(1);
      setPhone("");
      setName("");
      setCode("");
      setNeedsName(false);
    } else if (res.needsName) {
      setNeedsName(true);
      setStep(1);
      setMsg({ type: "info", text: "Este é seu primeiro acesso. Por favor, digite seu nome e avance novamente." });
    } else {
      setMsg({ type: "err", text: res.error || "Código incorreto." });
    }
  }

  // Simular Login Social (Google ou Apple)
  async function handleSimulateOAuth(provider: "google" | "apple") {
    setLoading(true);
    setMsg({ type: "", text: "" });

    // Mock de dados sociais
    const mockData = {
      email: `cliente.${provider}@exemplo.com`,
      googleId: provider === "google" ? `g_${Math.random().toString(36).substr(2, 9)}` : undefined,
      appleId: provider === "apple" ? `a_${Math.random().toString(36).substr(2, 9)}` : undefined,
      name: `Cliente Simulado ${provider === "google" ? "Google" : "Apple"}`,
    };

    const res = await loginClientOAuth(mockData);
    setLoading(false);

    if (res.success) {
      if (res.linked) {
        // Logou com sucesso direto (conta já vinculada no banco)
        setMsg({ type: "ok", text: "Login social bem-sucedido!" });
        setTimeout(() => router.refresh(), 1000);
      } else {
        // Precisa vincular com telefone
        setOauthData(res.oauthData || null);
        setShowOauthPhoneLink(true);
        setStep(1);
        setMsg({ type: "info", text: "Para concluir seu login com rede social, precisamos vincular seu número de WhatsApp." });
      }
    } else {
      setMsg({ type: "err", text: res.error || "Erro na simulação do login social." });
    }
  }

  // Cancelar Agendamento
  async function handleCancelBooking(id: string) {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setCancellingId(id);
    const res = await cancelBooking(id);
    setCancellingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Erro ao cancelar agendamento.");
    }
  }

  // Efetuar Logout
  async function handleLogout() {
    await logoutClient();
    router.refresh();
  }

  const cardStyle = {
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "24px",
  };

  const inputClass =
    "w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-600";

  return (
    <main className="min-h-screen bg-background pb-20 p-4 md:p-8 flex flex-col items-center">
      {/* Topo / Voltar */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <Link
          href={`/${tenantSlug}`}
          className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors font-medium border border-glass-border text-sm"
        >
          &larr; Voltar
        </Link>
        {initialClient && (
          <button
            onClick={handleLogout}
            className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer font-medium"
          >
            Sair da Conta
          </button>
        )}
      </div>

      <div className="w-full max-w-2xl text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={tenantName} className="w-20 h-20 rounded-full mx-auto border-2 border-primary/40 shadow-lg object-cover mb-3" />
        <h1 className="text-2xl font-bold text-white">{tenantName}</h1>
        <p className="text-sm text-slate-400 mt-1">Portal do Cliente</p>
      </div>

      {/* ── SE NÃO ESTIVER LOGADO (TELA DE LOGIN) ────────────────────────────── */}
      {!initialClient ? (
        <div style={cardStyle} className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Acessar Minha Conta</h2>
            <p className="text-xs text-slate-400 mt-1">
              {showOauthPhoneLink
                ? "Vincule seu número para finalizar o login social"
                : "Entre para ver e gerenciar seus agendamentos"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {needsName && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Seu Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className={inputClass}
                />
              </div>

              {msg.text && (
                <div
                  className={`text-xs p-3 rounded-lg ${
                    msg.type === "info"
                      ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-background font-bold text-sm py-3 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Processando..." : "Receber Código via WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center tracking-[10px] text-lg bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-700"
                />
              </div>

              {msg.text && (
                <div className={`text-xs p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono`}>
                  {msg.text}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setMsg({ type: "", text: "" });
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold border border-white/5 transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 bg-gradient-to-r from-primary to-accent text-background rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Confirmar Código"}
                </button>
              </div>
            </form>
          )}

          {/* Divisor */}
          {!showOauthPhoneLink && (
            <div className="relative flex items-center justify-center my-6">
              <div className="w-full h-px bg-slate-800"></div>
              <span className="absolute px-3 bg-[#0a0a0f] text-slate-500 text-xs font-medium uppercase tracking-wider">
                ou entrar com
              </span>
            </div>
          )}

          {/* Login Social Real ou Simulado */}
          {!showOauthPhoneLink && (
            <div className="flex flex-col items-center gap-4 w-full">
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <div className="flex justify-center w-full">
                  <div id="google-signin-button"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => handleSimulateOAuth("google")}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.176 4.113-3.415 0-6.19-2.775-6.19-6.19 0-3.415 2.775-6.19 6.19-6.19 1.488 0 2.85.535 3.903 1.488l3.123-3.123C18.91 2.215 15.8 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.514 11.24-11.24 0-.765-.078-1.503-.23-1.955H12.24z" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateOAuth("apple")}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.52-.63.73-1.18 1.87-1.03 2.98.12.01.24.02.35.02.9 0 2.05-.53 2.63-1.46" />
                    </svg>
                    Apple
                  </button>
                </div>
              )}
            </div>
          )}

          {showOauthPhoneLink && (
            <button
              onClick={() => {
                setShowOauthPhoneLink(false);
                setOauthData(null);
                setStep(1);
                setMsg({ type: "", text: "" });
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium mt-2"
            >
              Cancelar login social
            </button>
          )}
        </div>
      ) : (
        /* ── SE ESTIVER LOGADO (PORTAL DO CLIENTE) ───────────────────────────── */
        <div className="w-full max-w-2xl space-y-6">
          {/* Card de Boas-Vindas */}
          <div style={cardStyle} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Bem-vindo(a) de volta</p>
              <h2 className="text-xl font-bold text-white mt-0.5">{initialClient.name}</h2>
              <p className="text-xs text-slate-500 mt-1 font-mono">{initialClient.phone}</p>
            </div>
            <Link
              href={`/${tenantSlug}/book`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-background font-bold rounded-xl text-sm transition-all shadow-md"
            >
              Novo Agendamento
            </Link>
          </div>

          {/* Destaque do Plano do Cliente */}
          {activeSubscription && (
            <div 
              style={{
                ...cardStyle,
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)",
                borderColor: "rgba(16, 185, 129, 0.3)"
              }}
              className="flex items-center justify-between gap-4 border shadow-md animate-fade-in"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Plano Ativo
                </span>
                <h3 className="text-base font-bold text-white mt-2.5">{activeSubscription.plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Válido até {new Date(activeSubscription.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </p>
              </div>
              
              <div className="bg-emerald-500/25 border border-emerald-500/35 rounded-xl px-4 py-3 text-center min-w-[100px]">
                <span className="block text-2xl font-black text-white">{activeSubscription.remainingSlots}</span>
                <span className="block text-[8px] font-bold text-emerald-300 uppercase tracking-widest mt-0.5">Créditos</span>
              </div>
            </div>
          )}

          {/* Listagem de Agendamentos */}
          <div style={cardStyle} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Meus Agendamentos</h3>

            {bookings.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-slate-500">Você não possui nenhum agendamento neste estabelecimento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const isCancelled = booking.status === "CANCELLED";
                  const bDate = new Date(booking.date);
                  const bookingLocalTime = new Date(
                    bDate.getUTCFullYear(),
                    bDate.getUTCMonth(),
                    bDate.getUTCDate(),
                    bDate.getUTCHours(),
                    bDate.getUTCMinutes()
                  );
                  const isFuture = bookingLocalTime.getTime() > now;

                  return (
                    <div
                      key={booking.id}
                      className="p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all"
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderColor: isCancelled
                          ? "rgba(239, 68, 68, 0.1)"
                          : "rgba(255, 255, 255, 0.05)",
                        opacity: isCancelled ? 0.6 : 1,
                      }}
                    >
                      <div className="flex gap-4 items-start">
                        {/* Data Box */}
                        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center flex-shrink-0" style={{ background: isCancelled ? "rgba(239, 68, 68, 0.1)" : "rgba(212, 175, 55, 0.15)" }}>
                          <span className="text-xs uppercase font-bold" style={{ color: isCancelled ? "#f87171" : "#d4af37" }}>
                            {bDate.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                          </span>
                          <span className="text-sm font-extrabold -mt-1" style={{ color: isCancelled ? "#ef4444" : "#ffffff" }}>
                            {bDate.getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{booking.service.name}</h4>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isCancelled
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : booking.status === "CONFIRMED"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              }`}
                            >
                              {isCancelled ? "Cancelado" : booking.status === "CONFIRMED" ? "Confirmado" : "Pendente"}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-400 mt-1">
                            {bDate.toLocaleDateString("pt-BR", { weekday: "long" })} às{" "}
                            <span className="font-bold text-white">
                              {bDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Profissional: {booking.employee.name} ({booking.employee.role})
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          R$ {booking.service.price.toFixed(2).replace(".", ",")}
                        </span>

                        {!isCancelled && (
                          <div className="flex gap-2">
                            {booking.status === "CONFIRMED" && (
                              <a
                                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${booking.service.name} - ${tenantName.toUpperCase()}`)}&dates=${bDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${new Date(bDate.getTime() + (booking.service.duration || 30) * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0]}Z&details=${encodeURIComponent(`Seu agendamento está confirmado!\n\nProfissional: ${booking.employee.name}\nServiço: ${booking.service.name}\nDuração: ${booking.service.duration} min\nValor: R$ ${booking.service.price.toFixed(2)}`)}&location=${encodeURIComponent(tenantName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/10 flex items-center gap-1 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                                </svg>
                                Agenda
                              </a>
                            )}

                            {isFuture && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancellingId === booking.id}
                                className="text-[11px] text-red-400 hover:text-red-300 font-semibold px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/10 cursor-pointer"
                              >
                                {cancellingId === booking.id ? "Cancelando..." : "Desmarcar"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
