"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { getAvailableSlots } from "@/actions/availability";
import { createBooking } from "@/actions/booking";
import { getActiveSubscription } from "@/actions/plans";
import { sendClientOtp, verifyClientOtp, loginClientOAuth, verifyGoogleIdToken } from "@/actions/auth";
import TurnstileWidget from "./TurnstileWidget";
import { addScheduleCalendarDays, formatScheduleMonth, scheduleDateTime, scheduleInstant, type BookingTimeMode } from "@/lib/schedule-time";

type PublicEmployee = { id: string; name: string; role: string; avatarUrl: string | null };
type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  imageUrl: string | null;
};

interface ServiceWithEmployees extends PublicService {
  employees: PublicEmployee[];
}

interface ClientSession {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  googleId?: string | null;
  appleId?: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  slots: number;
  periodDays: number;
}

interface CustomerSubscription {
  id: string;
  clientId: string;
  tenantId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  remainingSlots: number;
  plan: Plan;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface CustomWindow extends Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
        renderButton: (element: HTMLElement | null, options: { theme: string; size: string; width: number }) => void;
      };
    };
  };
}

interface OAuthData {
  idToken?: string;
  email: string;
  name: string;
  googleId?: string | null;
  appleId?: string | null;
}

export default function BookingFlow({
  tenantId,
  tenantSlug,
  tenantName,
  tenantLogoUrl,
  tenantCoverUrl,
  tenantDescription,
  tenantTimeZone,
  initialDateStr,
  bookingTimeMode,
  services,
  employees,
  initialClient,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  tenantCoverUrl?: string | null;
  tenantDescription?: string | null;
  tenantTimeZone: string;
  initialDateStr: string;
  bookingTimeMode: string;
  services: ServiceWithEmployees[];
  employees: PublicEmployee[];
  initialClient?: ClientSession | null;
}) {
  const socialLoginEnabled = true;

  // Estados do Agendamento
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceWithEmployees | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<PublicEmployee | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(() => new Date(`${initialDateStr}T12:00:00.000Z`));
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Estado de Sessão Ativa do Cliente no fluxo
  const [client, setClient] = useState<ClientSession | null>(initialClient || null);

  // Estados do Cliente (Passo 4)
  const [clientName, setClientName] = useState(initialClient?.name || "");
  const [clientPhone, setClientPhone] = useState(initialClient?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Assinatura do Cliente
  const [activePlan, setActivePlan] = useState<CustomerSubscription | null>(null);
  const [usePlanCredit, setUsePlanCredit] = useState(false);

  // Estados de Verificação e OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [otpCaptchaToken, setOtpCaptchaToken] = useState<string | null>(null);
  const [otpCaptchaReset, setOtpCaptchaReset] = useState(0);
  const [bookingCaptchaToken, setBookingCaptchaToken] = useState<string | null>(null);
  const [bookingCaptchaReset, setBookingCaptchaReset] = useState(0);

  // Estados para Google OAuth
  const [showGooglePhoneLink, setShowGooglePhoneLink] = useState(false);
  const [oauthData, setOauthData] = useState<OAuthData | null>(null);

  const handleGoogleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential) return;
    setIsSubmitting(true);
    setMsg({ type: "", text: "" });

    try {
      const verifyRes = await verifyGoogleIdToken(response.credential);
      if (!verifyRes.success) {
        setMsg({ type: "err", text: verifyRes.error || "Token do Google inválido." });
      } else {
        const oauthRes = await loginClientOAuth({ idToken: response.credential });

        if (oauthRes.success) {
          if (oauthRes.linked && oauthRes.client) {
            setClient(oauthRes.client);
            setClientName(oauthRes.client.name);
            setClientPhone(oauthRes.client.phone);
            setMsg({ type: "ok", text: "Autenticado via Google com sucesso!" });
          } else {
            setOauthData(
              oauthRes.oauthData
                ? {
                    idToken: oauthRes.oauthData.idToken,
                    email: oauthRes.oauthData.email || "",
                    name: oauthRes.oauthData.name || "",
                    googleId: oauthRes.oauthData.googleId || undefined,
                    appleId: oauthRes.oauthData.appleId || undefined,
                  }
                : null
            );
            setShowGooglePhoneLink(true);
            setMsg({ type: "info", text: "Para concluir seu login com o Google, precisamos vincular seu número de WhatsApp." });
          }
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao logar com o Google." });
        }
      }
    } catch (err) {
      console.error("Erro no login social do agendamento:", err);
      setMsg({ type: "err", text: "Erro ao processar login com o Google." });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Carregar script do Google Identity Services
  useEffect(() => {
    if (!socialLoginEnabled) return;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    if (step !== 4) return;

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
          document.getElementById("google-signin-button-booking"),
          { theme: "outline", size: "large", width: 280 }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {
        // Silenciar erro
      }
    };
  }, [step, handleGoogleCredentialResponse, socialLoginEnabled]);

  // Resetar validação se o telefone digitado for modificado e não bater com a sessão ativa
  useEffect(() => {
    const cleanInput = clientPhone.replace(/\D/g, "");
    const cleanSession = client?.phone?.replace(/\D/g, "") || "";

    if (client && cleanInput !== cleanSession) {
      const timer = setTimeout(() => {
        setClient(null);
        setOtpSent(false);
        setMsg({ type: "", text: "" });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [clientPhone, client]);

  async function handleSimulateGoogle() {
    setIsSubmitting(true);
    setMsg({ type: "", text: "" });

    const mockData = {
      email: "cliente.google@exemplo.com",
      googleId: `g_${Math.random().toString(36).substr(2, 9)}`,
      name: "Cliente Simulado Google",
    };

    try {
      const oauthRes = await loginClientOAuth(mockData);
      if (oauthRes.success) {
        if (oauthRes.linked && oauthRes.client) {
          setClient(oauthRes.client);
          setClientName(oauthRes.client.name);
          setClientPhone(oauthRes.client.phone);
          setMsg({ type: "ok", text: "Simulação de Login Social realizada!" });
        } else {
          setOauthData(
            oauthRes.oauthData
              ? {
                  email: oauthRes.oauthData.email || "",
                  name: oauthRes.oauthData.name || "",
                  googleId: oauthRes.oauthData.googleId || undefined,
                  appleId: oauthRes.oauthData.appleId || undefined,
                }
              : null
          );
          setShowGooglePhoneLink(true);
          setMsg({ type: "info", text: "Vincule um WhatsApp para concluir o login simulado." });
        }
      } else {
        setMsg({ type: "err", text: oauthRes.error || "Erro ao simular login." });
      }
    } catch {
      setMsg({ type: "err", text: "Erro ao processar simulação." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp() {
    if (!clientPhone) {
      alert("Por favor, digite seu número de WhatsApp.");
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !otpCaptchaToken) {
      setMsg({ type: "err", text: "Confirme a verificação anti-bot antes de enviar o código." });
      return;
    }
    setIsSubmitting(true);
    setMsg({ type: "", text: "" });

    const res = await sendClientOtp(clientPhone, tenantId, otpCaptchaToken || undefined);
    setIsSubmitting(false);

    if (res.success) {
      setOtpSent(true);
      setOtpCaptchaToken(null);
      setOtpCaptchaReset((v) => v + 1);
      if (res.code) {
        setMsg({ type: "ok", text: `[Modo de Teste] Código enviado via WhatsApp: ${res.code}` });
      } else {
        setMsg({ type: "ok", text: "Código enviado com sucesso via WhatsApp." });
      }
    } else {
      setMsg({ type: "err", text: res.error || "Erro ao enviar código de segurança." });
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode) return;
    setIsSubmitting(true);
    setMsg({ type: "", text: "" });

    if (showGooglePhoneLink && oauthData) {
      const res = await verifyClientOtp(clientPhone, otpCode, oauthData.name || clientName);
      if (res.success) {
        const oauthRes = await loginClientOAuth({ idToken: oauthData.idToken, phone: clientPhone });
        setIsSubmitting(false);
        if (oauthRes.success && oauthRes.client) {
          setClient(oauthRes.client);
          setClientName(oauthRes.client.name);
          setClientPhone(oauthRes.client.phone);
          setShowGooglePhoneLink(false);
          setOauthData(null);
          setOtpSent(false);
          setOtpCode("");
          setMsg({ type: "ok", text: "Número vinculado e login com Google concluído!" });
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao vincular conta." });
        }
      } else {
        setIsSubmitting(false);
        setMsg({ type: "err", text: res.error || "Código incorreto." });
      }
      return;
    }

    const res = await verifyClientOtp(clientPhone, otpCode, clientName);
    setIsSubmitting(false);

    if (res.success && res.client) {
      setClient(res.client);
      setClientName(res.client.name);
      setClientPhone(res.client.phone);
      setOtpSent(false);
      setOtpCode("");
      setMsg({ type: "ok", text: "Celular verificado com sucesso!" });
    } else if (res.needsName) {
      setMsg({ type: "info", text: "Primeiro acesso! Por favor, informe seu nome completo para prosseguir." });
    } else {
      setMsg({ type: "err", text: res.error || "Código incorreto." });
    }
  }

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  // Derivar a string da data no formato "YYYY-MM-DD" para a API
  const selectedDateStr = selectedDateObj ? selectedDateObj.toISOString().slice(0, 10) : "";

  // Exibe a semana atual; semanas futuras avançam em blocos de sete dias.
  const calendarDays = useMemo(() => {
    const today = new Date(`${initialDateStr}T12:00:00.000Z`);
    const weekday = today.getUTCDay();
    const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
    const weekStart = addScheduleCalendarDays(initialDateStr, offsetToMonday + calendarWeekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const dateStr = addScheduleCalendarDays(weekStart, index);
      const date = new Date(`${dateStr}T12:00:00.000Z`);
      const daysFromToday = Math.round((date.getTime() - today.getTime()) / 86_400_000);
      return { date, dateStr, isPast: dateStr < initialDateStr, withinBookingWindow: daysFromToday < 30 };
    }).filter((day) => day.isPast || day.withinBookingWindow);
  }, [calendarWeekOffset, initialDateStr]);

  const calendarWeekStart = calendarDays[0]?.dateStr || initialDateStr;
  const nextWeekStart = addScheduleCalendarDays(calendarWeekStart, 7);
  const daysUntilNextWeek = Math.round(
    (new Date(`${nextWeekStart}T12:00:00.000Z`).getTime() - new Date(`${initialDateStr}T12:00:00.000Z`).getTime()) / 86_400_000
  );
  const canGoToNextWeek = daysUntilNextWeek < 30;
  const calendarHeaderDateStr = selectedDateStr || calendarDays.find((day) => !day.isPast)?.dateStr || initialDateStr;

  function showWeek(offset: number) {
    setCalendarWeekOffset(offset);
    setSelectedDateObj(offset === 0 ? new Date(`${initialDateStr}T12:00:00.000Z`) : null);
    setSelectedTime("");
  }

  function goToToday() {
    showWeek(0);
  }

  // Efeito para carregar horários reais quando a data for escolhida
  useEffect(() => {
    if (selectedDateStr && selectedEmployee && selectedService) {
      let active = true;

      const timer = setTimeout(() => {
        if (!active) return;
        setIsLoadingTimes(true);
        setAvailableTimes([]);
      }, 0);

      getAvailableSlots(selectedEmployee.id, selectedDateStr, selectedService.duration)
        .then((slots) => {
          if (!active) return;
          setAvailableTimes(slots);
          setIsLoadingTimes(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error("Erro ao buscar horários", err);
          setIsLoadingTimes(false);
        });

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [selectedDateStr, selectedEmployee, selectedService]);

  // Efeito para carregar assinatura ativa quando o telefone mudar
  useEffect(() => {
    const clean = clientPhone.replace(/\D/g, "");
    if (clean.length >= 10) {
      getActiveSubscription(clean, tenantSlug)
        .then((sub) => {
          setActivePlan(sub);
          setUsePlanCredit(!!sub);
        })
        .catch(() => {
          setActivePlan(null);
          setUsePlanCredit(false);
        });
    } else {
      const timer = setTimeout(() => {
        setActivePlan(null);
        setUsePlanCredit(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [clientPhone, tenantSlug]);

  const stepTitles = ["Serviço", "Profissional", "Data e Horário", "Identificação"];

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedEmployee) {
      alert("Por favor, selecione um serviço e um profissional.");
      return;
    }

    if (!clientName || !clientPhone) {
      alert("Por favor, preencha seu nome e WhatsApp.");
      return;
    }

    if (!client) {
      alert("Por favor, valide seu celular ou faça login antes de confirmar.");
      return;
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !bookingCaptchaToken) {
      setMsg({ type: "err", text: "Confirme a verificação anti-bot antes de finalizar o agendamento." });
      return;
    }

    setIsSubmitting(true);

    const result = await createBooking({
      tenantSlug,
      serviceId: selectedService.id,
      employeeId: selectedEmployee.id,
      dateStr: selectedDateStr,
      timeStr: selectedTime,
      clientName,
      clientPhone,
      customerSubscriptionId: usePlanCredit && activePlan ? activePlan.id : undefined,
      captchaToken: bookingCaptchaToken || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setBookingCaptchaToken(null);
      setBookingCaptchaReset((v) => v + 1);
      setStep(5); // Tela de Sucesso
    } else {
      alert(result.error);
    }
  };

  const displayName = tenantName || tenantSlug.toUpperCase();
  const displayLogo =
    tenantLogoUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=ffffff&bold=true`;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 md:pb-16 flex flex-col items-center">
      {/* Top Header com a Marca do Comércio e Link para Meus Agendamentos */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayLogo}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
            />
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight line-clamp-1">{displayName}</h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Agendamento Online
              </span>
            </div>
          </div>

          <Link
            href={`/${tenantSlug}/perfil`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60 transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">{client ? `Olá, ${client.name.split(" ")[0]}` : "Meus Agendamentos"}</span>
            <span className="sm:hidden">{client ? client.name.split(" ")[0] : "Minha Conta"}</span>
          </Link>
        </div>
      </header>

      <div className="w-full max-w-3xl px-4 sm:px-6 pt-5 sm:pt-7">
        {/* Stepper Visual Clean e Moderno */}
        {step < 5 && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between relative">
                {/* Linha conectora de fundo */}
                <div className="absolute left-6 right-6 top-4 sm:top-5 h-0.5 bg-slate-100 -z-0"></div>
                {/* Linha conectora de progresso preenchida */}
                <div
                  className="absolute left-6 top-4 sm:top-5 h-0.5 bg-primary transition-all duration-300 -z-0"
                  style={{ width: `${((step - 1) / (stepTitles.length - 1)) * 100}%`, maxWidth: "calc(100% - 3rem)" }}
                ></div>

                {stepTitles.map((title, index) => {
                  const stepNum = index + 1;
                  const isCompleted = step > stepNum;
                  const isActive = step === stepNum;

                  return (
                    <div key={title} className="flex flex-col items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={() => {
                          // Permite voltar clicando em passos anteriores já completados
                          if (stepNum < step) setStep(stepNum);
                        }}
                        disabled={stepNum >= step}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all shadow-xs ${
                          isCompleted
                            ? "bg-primary border-primary text-white cursor-pointer hover:opacity-90"
                            : isActive
                              ? "bg-white border-primary text-primary scale-105 shadow-sm ring-4 ring-primary/10"
                              : "bg-white border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          stepNum
                        )}
                      </button>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold tracking-tight text-center ${
                          isActive
                            ? "text-slate-900 font-bold"
                            : isCompleted
                              ? "text-slate-600 font-medium"
                              : "text-slate-400"
                        }`}
                      >
                        {title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Resumo do Item Selecionado (Passos 3 e 4) */}
        {step >= 3 && step < 5 && selectedService && selectedEmployee && (
          <div className="mb-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3 sm:gap-4 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedService.imageUrl || "https://placehold.co/150x150/e2e8f0/64748b?text=Serviço"}
                alt={selectedService.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-100 shadow-xs"
              />
              <div className="flex-1 min-w-0 pr-12">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Resumo da Reserva</span>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{selectedService.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {selectedService.duration} min
                  </span>
                  <span>•</span>
                  <span className="font-medium text-slate-700 truncate">com {selectedEmployee.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-primary font-black text-base sm:text-lg whitespace-nowrap block">
                  R$ {selectedService.price.toFixed(2).replace(".", ",")}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-primary transition-colors underline mt-0.5"
                >
                  Alterar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Principal dos Passos */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 md:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)]">
          {/* PASSO 1: Escolha o Serviço */}
          {step === 1 && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Escolha o Serviço</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Selecione o serviço que deseja agendar</p>
              </div>

              <div className="space-y-3">
                {services.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/60 p-6">
                    <p className="text-slate-600 font-medium text-sm">Nenhum serviço disponível no momento.</p>
                  </div>
                ) : (
                  services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-primary/60 bg-white hover:bg-slate-50/80 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5 sm:gap-4 group cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.imageUrl || "https://placehold.co/150x150/f1f5f9/64748b?text=Serviço"}
                        alt={service.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-xs border border-slate-100 group-hover:scale-102 transition-transform shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-primary transition-colors truncate">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{service.duration} minutos</span>
                        </div>
                        {service.description && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-1 font-normal">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-primary font-black text-base sm:text-lg whitespace-nowrap block">
                          R$ {service.price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 group-hover:text-primary flex items-center justify-end gap-1 mt-0.5">
                          Selecionar
                          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PASSO 2: Escolha o Profissional */}
          {step === 2 && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Escolha o Profissional</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Quem você gostaria que realizasse seu atendimento?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {(() => {
                  if (!selectedService) return null;
                  const allowedEmployees = employees.filter((emp) =>
                    selectedService.employees?.some((se: PublicEmployee) => se.id === emp.id)
                  );

                  if (allowedEmployees.length === 0) {
                    return (
                      <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl border border-slate-200/60 p-6">
                        <p className="text-slate-600 font-medium text-sm">Nenhum profissional disponível para este serviço.</p>
                      </div>
                    );
                  }

                  return allowedEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setStep(3);
                      }}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-primary/60 bg-white hover:bg-slate-50/80 shadow-xs hover:shadow-sm transition-all flex items-center sm:flex-col sm:text-center gap-3.5 sm:gap-3 group cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=f1f5f9&color=0f172a&bold=true`}
                        alt={emp.name}
                        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover group-hover:scale-105 transition-transform shadow-xs border-2 border-slate-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-primary transition-colors truncate">
                          {emp.name}
                        </h3>
                        <p className="text-slate-500 font-medium text-xs mt-0.5">{emp.role}</p>
                      </div>
                      <span className="sm:hidden text-primary font-bold text-xs flex items-center gap-1">
                        Escolher
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  ));
                })()}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar aos Serviços
                </button>
              </div>
            </div>
          )}

          {/* PASSO 3: Data e Horário (Mobile First + Barra Flutuante Fixa ao Selecionar) */}
          {step === 3 && (
            <div className={selectedTime ? "pb-28 sm:pb-24" : ""}>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Data e Horário</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Selecione o melhor dia e horário para seu atendimento</p>
              </div>

              {/* Seletor de Data / Carrossel Semanal */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 capitalize flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(
                      new Date(`${calendarHeaderDateStr}T12:00:00.000Z`)
                    )}
                  </h3>

                  <div className="flex gap-1.5">
                    {calendarWeekOffset > 0 && (
                      <button
                        type="button"
                        onClick={() => showWeek(calendarWeekOffset - 1)}
                        aria-label="Semana anterior"
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-50 font-bold text-xs"
                      >
                        &lt;
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={goToToday}
                      aria-label="Voltar para hoje"
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs hover:bg-slate-50 font-semibold"
                    >
                      Hoje
                    </button>
                    {canGoToNextWeek && (
                      <button
                        type="button"
                        onClick={() => showWeek(calendarWeekOffset + 1)}
                        aria-label="Próxima semana"
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-50 font-bold text-xs"
                      >
                        &gt;
                      </button>
                    )}
                  </div>
                </div>

                {/* Carrossel de Dias da Semana */}
                <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {calendarDays.map(({ date: dayObj, dateStr, isPast }) => {
                    const isSelected = selectedDateStr === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDateObj(dayObj);
                          setSelectedTime(""); // Reseta horário ao trocar dia
                        }}
                        className={`relative flex flex-col items-center justify-center min-w-[62px] sm:min-w-[72px] h-20 sm:h-22 rounded-2xl border transition-all snap-start shadow-xs disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-102"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <span className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-tight mb-0.5 ${isSelected ? "text-white/90" : "text-slate-400"}`}>
                          {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(dayObj).replace(".", "")}
                        </span>
                        <span className={`text-xl sm:text-2xl font-black ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {dayObj.getUTCDate().toString().padStart(2, "0")}
                        </span>
                        <span className={`text-[9px] font-medium ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                          {formatScheduleMonth(dayObj, "UTC", "LEGACY_UTC_WALL")}
                        </span>
                        {dateStr === initialDateStr && (
                          <span className={`absolute -bottom-1 px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase tracking-wide border shadow-xs ${
                            isSelected ? "bg-white text-primary border-white" : "bg-slate-900 text-white border-slate-900"
                          }`}>
                            Hoje
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção de Horários Disponíveis - Mobile First */}
              {selectedDateObj ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
                      Horários disponíveis
                    </h3>
                    {!isLoadingTimes && availableTimes.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                        {availableTimes.length} livres
                      </span>
                    )}
                  </div>

                  {isLoadingTimes ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-slate-600 font-semibold text-xs sm:text-sm animate-pulse">Buscando horários...</p>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    /* Grade Mobile First: 4 colunas no mobile para ver muito mais horários, com fácil toque */
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-2.5">
                      {availableTimes.map((time) => {
                        const isTimeSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className={`h-11 sm:h-12 rounded-xl border text-sm font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 ${
                              isTimeSelected
                                ? "border-primary bg-primary text-white shadow-md ring-2 ring-primary/20 scale-102"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200/80 p-5">
                      <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-slate-700 font-bold text-sm">Sem horários livres nesta data</p>
                      <p className="text-slate-500 text-xs mt-1">Por favor, selecione outro dia no calendário acima.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">
                  Selecione uma data acima para visualizar os horários disponíveis.
                </div>
              )}

              {/* Botão Voltar padrão quando NENHUM horário ainda foi selecionado */}
              {!selectedTime && (
                <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>
                  <span className="text-xs text-slate-400 font-medium">Toque em um horário para avançar</span>
                </div>
              )}

              {/* BARRA FLUTUANTE FIXA NA PARTE INFERIOR AO TOCAR EM UM HORÁRIO */}
              {selectedTime && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
                  <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 sm:px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all border border-slate-200/80 active:scale-95 cursor-pointer shrink-0"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="flex-1 py-3.5 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-primary/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Avançar para Identificação</span>
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-md font-black">
                        {selectedTime}
                      </span>
                      <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 4: Identificação e Finalização */}
          {step === 4 && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Finalizar Agendamento</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Confirme seus dados para receber o comprovante no WhatsApp e garantir seu horário.
                </p>
              </div>

              {/* Card de Resumo do Dia e Hora Escolhidos */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 mb-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Horário Marcado</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedDateStr.split("-").reverse().join("/")} às <span className="text-primary">{selectedTime}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-bold text-slate-600 hover:text-primary underline cursor-pointer"
                >
                  Mudar horário
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. SE O CLIENTE JÁ ESTIVER LOGADO E VALIDADO */}
                {client ? (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-4 sm:p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full mb-1">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Identidade Confirmada
                        </span>
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">{client.name}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">{client.phone}</p>
                        {client.email && <p className="text-xs text-slate-500 mt-0.5">{client.email}</p>}
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-lg text-emerald-600 font-bold">✓</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setClient(null)}
                      className="text-xs text-slate-500 hover:text-red-500 underline font-semibold cursor-pointer transition-colors pt-1 block"
                    >
                      Alterar Identificação / Usar outro número
                    </button>
                  </div>
                ) : (
                  /* 2. FORMULÁRIO DE LOGIN E VALIDAÇÃO DE WHATSAPP */
                  <div className="space-y-4">
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          disabled={otpSent}
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          WhatsApp para Confirmação
                        </label>
                        <input
                          type="tel"
                          disabled={otpSent}
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ex: 11999999999"
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 text-sm"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Você receberá lembretes e detalhes da sua reserva pelo WhatsApp.
                        </span>
                      </div>
                    </div>

                    {msg.text && (
                      <div
                        className={`text-xs p-3.5 rounded-xl font-medium ${
                          msg.type === "ok"
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : msg.type === "info"
                              ? "bg-blue-50 border border-blue-200 text-blue-800"
                              : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {/* Exibição do Código de Verificação OTP */}
                    {otpSent ? (
                      <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Código de 6 dígitos recebido:
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="w-full text-center tracking-[8px] text-2xl bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 shadow-inner"
                        />
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                              setMsg({ type: "", text: "" });
                            }}
                            className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isSubmitting || otpCode.length < 6}
                            className="flex-[2] py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? "Validando..." : "Confirmar Código"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <TurnstileWidget
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                          onTokenChange={setOtpCaptchaToken}
                          resetSignal={otpCaptchaReset}
                          label="Verificação anti-bot para envio do código"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSubmitting || !clientPhone || clientPhone.replace(/\D/g, "").length < 10}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 text-sm shadow-xs flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.274.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                          </svg>
                          {isSubmitting ? "Enviando..." : "Validar WhatsApp para Agendar"}
                        </button>

                        {socialLoginEnabled && !showGooglePhoneLink && (
                          <>
                            <div className="relative flex items-center justify-center my-4">
                              <div className="w-full h-px bg-slate-200"></div>
                              <span className="absolute px-3 bg-white text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                ou autenticar com
                              </span>
                            </div>

                            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                              <div className="flex justify-center w-full">
                                <div id="google-signin-button-booking"></div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSimulateGoogle}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.176 4.113-3.415 0-6.19-2.775-6.19-6.19 0-3.415 2.775-6.19 6.19-6.19 1.488 0 2.85.535 3.903 1.488l3.123-3.123C18.91 2.215 15.8 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.514 11.24-11.24 0-.765-.078-1.503-.23-1.955H12.24z" />
                                </svg>
                                Login com Google (Simulado)
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bloco de Assinatura / Plano Ativo do Cliente */}
                {client && activePlan && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-emerald-800 font-bold text-xs">Você possui um plano ativo!</p>
                      <p className="text-slate-900 font-semibold text-sm mt-0.5">{activePlan.plan.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{activePlan.remainingSlots} créditos restantes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="use-credit" className="text-xs text-slate-700 cursor-pointer font-medium">
                        Usar plano?
                      </label>
                      <input
                        id="use-credit"
                        type="checkbox"
                        checked={usePlanCredit}
                        onChange={(e) => setUsePlanCredit(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Botão de Confirmação Final de Agendamento */}
                {client && (
                  <div className="mt-5 space-y-3">
                    {msg.text && (
                      <div
                        className={`text-xs p-3.5 rounded-xl font-medium ${
                          msg.type === "ok"
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : msg.type === "info"
                              ? "bg-blue-50 border border-blue-200 text-blue-800"
                              : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    <TurnstileWidget
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onTokenChange={setBookingCaptchaToken}
                      resetSignal={bookingCaptchaReset}
                      label="Verificação anti-bot para confirmar o agendamento"
                    />

                    <button
                      type="button"
                      disabled={isSubmitting}
                      className={`w-full bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-extrabold py-4 rounded-xl shadow-md shadow-primary/25 transition-all flex justify-center items-center gap-2 cursor-pointer text-base active:scale-[0.99] ${
                        isSubmitting ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      onClick={handleConfirmBooking}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Confirmando Agendamento...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar Agendamento</span>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar ao Calendário
                </button>
              </div>
            </div>
          )}

          {/* PASSO 5: Sucesso / Confirmação Concluída */}
          {step === 5 && (
            <div className="flex flex-col items-center text-center py-8 sm:py-10">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 border-4 border-emerald-50">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                Reserva Realizada com Sucesso
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">Agendamento Confirmado!</h2>
              <p className="text-slate-600 max-w-md font-medium text-sm sm:text-base mb-6 leading-relaxed">
                Tudo pronto, <strong className="text-slate-900">{clientName}</strong>! Seu horário com{" "}
                <strong className="text-slate-900">{selectedEmployee?.name}</strong> para o serviço{" "}
                <strong className="text-slate-900">{selectedService?.name}</strong> está marcado para o dia{" "}
                <strong className="text-primary font-bold">{selectedDateStr.split("-").reverse().join("/")}</strong> às{" "}
                <strong className="text-primary font-bold">{selectedTime}</strong>.
              </p>

              {/* Botão de Exportar para o Google Calendar */}
              {(() => {
                if (!selectedService) return null;
                try {
                  const mode = bookingTimeMode as BookingTimeMode;
                  const start = scheduleInstant(
                    scheduleDateTime(selectedDateStr, selectedTime, tenantTimeZone, mode),
                    tenantTimeZone,
                    mode
                  );
                  const end = new Date(start.getTime() + (selectedService.duration || 30) * 60 * 1000);

                  const formatUTC = (date: Date) => {
                    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                  };

                  const title = `${selectedService.name} - ${displayName}`;
                  const details = `Seu agendamento foi confirmado com sucesso!\n\nProfissional: ${selectedEmployee?.name}\nServiço: ${selectedService.name}\nDuração: ${selectedService.duration} min\nValor: R$ ${selectedService.price.toFixed(2)}`;

                  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    title
                  )}&dates=${formatUTC(start)}/${formatUTC(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
                    displayName
                  )}`;

                  return (
                    <a
                      href={gCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full max-w-xs mb-4 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                      </svg>
                      Adicionar ao Google Agenda
                    </a>
                  );
                } catch {
                  return null;
                }
              })()}

              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                <Link
                  href={`/${tenantSlug}/perfil`}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-center text-sm shadow-xs"
                >
                  Ver Meus Agendamentos
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedService(null);
                    setSelectedEmployee(null);
                    setSelectedTime("");
                  }}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all border border-slate-200 text-center text-sm"
                >
                  Fazer Novo Agendamento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `,
        }}
      />
    </main>
  );
}
