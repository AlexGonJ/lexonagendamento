"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getAvailableSlots } from '@/actions/availability';
import { createBooking } from '@/actions/booking';
import { getActiveSubscription } from '@/actions/plans';
import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendClientOtp, verifyClientOtp, loginClientOAuth, verifyGoogleIdToken } from '@/actions/auth';
import TurnstileWidget from './TurnstileWidget';
import { Service, Employee } from '@prisma/client';

interface ServiceWithEmployees extends Service {
  employees: Employee[];
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
  email: string;
  name: string;
  googleId?: string | null;
  appleId?: string | null;
}

export default function BookingFlow({ 
  tenantId,
  tenantSlug, 
  services, 
  employees,
  initialClient 
}: { 
  tenantId: string,
  tenantSlug: string, 
  services: ServiceWithEmployees[], 
  employees: Employee[],
  initialClient?: ClientSession | null
}) {
  // Estados do Agendamento
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceWithEmployees | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Estado de Sessão Ativa do Cliente no fluxo
  const [client, setClient] = useState<ClientSession | null>(initialClient || null);

  // Estados do Cliente (Passo 4)
  const [clientName, setClientName] = useState(initialClient?.name || '');
  const [clientPhone, setClientPhone] = useState(initialClient?.phone || '');
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
      if (verifyRes.success && verifyRes.googleId && verifyRes.email) {
        const oauthRes = await loginClientOAuth({
          email: verifyRes.email,
          googleId: verifyRes.googleId,
          name: verifyRes.name || "Cliente Google",
        });

        if (oauthRes.success) {
          if (oauthRes.linked && oauthRes.client) {
            setClient(oauthRes.client);
            setClientName(oauthRes.client.name);
            setClientPhone(oauthRes.client.phone);
            setMsg({ type: "ok", text: "Autenticado via Google com sucesso!" });
          } else {
            // Precisa vincular telefone
            setOauthData(oauthRes.oauthData ? {
              email: oauthRes.oauthData.email || "",
              name: oauthRes.oauthData.name || "",
              googleId: oauthRes.oauthData.googleId || undefined,
              appleId: oauthRes.oauthData.appleId || undefined,
            } : null);
            setShowGooglePhoneLink(true);
            setMsg({ type: "info", text: "Para concluir seu login com o Google, precisamos vincular seu número de WhatsApp." });
          }
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao logar com o Google." });
        }
      } else {
        setMsg({ type: "err", text: verifyRes.error || "Token do Google inválido." });
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
  }, [step, handleGoogleCredentialResponse]);

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

  // handleGoogleCredentialResponse was moved above script loading useEffect

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
          setOauthData(oauthRes.oauthData ? {
            email: oauthRes.oauthData.email || "",
            name: oauthRes.oauthData.name || "",
            googleId: oauthRes.oauthData.googleId || undefined,
            appleId: oauthRes.oauthData.appleId || undefined,
          } : null);
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
        const oauthRes = await loginClientOAuth({
          email: oauthData.email,
          name: oauthData.name,
          googleId: oauthData.googleId || undefined,
          appleId: oauthData.appleId || undefined,
          phone: clientPhone
        });
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
  const selectedDateStr = selectedDateObj ? format(selectedDateObj, 'yyyy-MM-dd') : '';

  // Gerar os próximos 30 dias para o carrossel horizontal
  const upcomingDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  // Efeito para carregar horários reais quando a data for escolhida
  useEffect(() => {
    if (selectedDateStr && selectedEmployee && selectedService) {
      let active = true;
      
      // Defer state update to avoid synchronous state updates in effect
      const timer = setTimeout(() => {
        if (!active) return;
        setIsLoadingTimes(true);
        setAvailableTimes([]);
      }, 0);

      getAvailableSlots(selectedEmployee.id, selectedDateStr, selectedService.duration)
        .then(slots => {
          if (!active) return;
          setAvailableTimes(slots);
          setIsLoadingTimes(false);
        })
        .catch(err => {
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
        .then(sub => {
          setActivePlan(sub);
          setUsePlanCredit(!!sub); // padrão é usar se disponível
        })
        .catch(() => {
          setActivePlan(null);
          setUsePlanCredit(false);
        });
    } else {
      // Defer synchronous state update in effect using setTimeout
      const timer = setTimeout(() => {
        setActivePlan(null);
        setUsePlanCredit(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [clientPhone, tenantSlug]);

  const stepTitles = ["Serviço", "Profissional", "Data e horário", "Pagamento"];

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

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      
      {/* Header com Botão Voltar da Barbearia (Esconde na tela de sucesso) */}
      {step < 5 && (
        <div className="w-full max-w-3xl flex justify-between items-center mb-6">
          <Link href={`/${tenantSlug}`} className="flex items-center gap-2 text-slate-800 bg-white/90 backdrop-blur-md hover:bg-white px-5 py-2.5 rounded-xl transition-all font-bold border border-white shadow-md hover:shadow-lg">
            &larr; Voltar
          </Link>
        </div>
      )}

      {/* Stepper Customizado */}
      {step < 5 && (
        <div className="w-full max-w-3xl mb-10 px-2">
          <div className="flex justify-center">
            <h1 className="text-center text-sm font-bold mb-6 text-slate-800 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-white">
              Passos para agendar
            </h1>
          </div>
          <div className="flex items-center justify-between relative bg-white/90 backdrop-blur-2xl p-4 sm:px-8 sm:py-6 rounded-3xl border border-white shadow-xl">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[3px] bg-slate-200 -z-10"></div>
            
            {stepTitles.map((title, index) => {
              const stepNum = index + 1;
              const isCompleted = step > stepNum;
              const isActive = step === stepNum;
              
              return (
                <div key={title} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm ${
                    isCompleted 
                      ? 'bg-primary border-primary text-white shadow-md' 
                      : isActive 
                        ? 'bg-white border-primary text-primary scale-110 shadow-md' 
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isCompleted ? '✓' : stepNum}
                  </div>
                  <span className={`text-[10px] md:text-xs uppercase tracking-wider ${isActive ? 'text-primary font-bold drop-shadow-sm' : 'text-slate-500 font-bold'}`}>
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl relative">
        
        {/* Card Fixo de Resumo "Item selecionado" */}
        {step >= 3 && step < 5 && selectedService && selectedEmployee && (
          <div className="mb-8 animate-fade-in">
            <h3 className="text-sm text-white drop-shadow-md font-bold mb-2 ml-2">Item selecionado</h3>
            <div className="bg-white/90 backdrop-blur-2xl p-4 flex items-center gap-4 rounded-3xl border border-white shadow-xl relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedService.imageUrl || 'https://placehold.co/150x150/e2e8f0/64748b?text=Sem+Foto'} 
                alt={selectedService.name} 
                className="w-20 h-20 rounded-2xl object-cover shadow-sm" 
              />
              <div className="flex-1">
                <h4 className="font-bold text-lg text-slate-900">{selectedService.name}</h4>
                <div className="flex items-center text-slate-600 font-bold text-sm gap-1 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {selectedService.duration}min
                </div>
                <p className="text-sm text-slate-600 font-medium">com <span className="text-slate-900 font-bold">{selectedEmployee.name}</span></p>
              </div>
              <div className="text-primary font-extrabold text-lg mr-2 drop-shadow-sm">
                R$ {selectedService.price.toFixed(2)}
              </div>
              <button 
                onClick={() => setStep(1)}
                className="absolute top-4 right-5 text-xs font-bold text-slate-500 hover:text-primary transition-colors underline"
              >
                Alterar
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-3xl border border-white p-6 sm:p-8 md:p-10 relative overflow-hidden rounded-[2.5rem] shadow-2xl">
          
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">Escolha o Serviço</h2>
              <div className="space-y-4">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep(2); }}
                    className="w-full text-left p-4 rounded-3xl border border-white hover:border-primary/50 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={service.imageUrl || 'https://placehold.co/150x150/e2e8f0/64748b?text=Sem+Foto'} 
                      alt={service.name} 
                      className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" 
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
                      <span className="text-slate-500 font-medium text-sm">{service.duration} min</span>
                    </div>
                    <span className="text-primary font-extrabold text-xl whitespace-nowrap drop-shadow-sm pr-2">R$ {service.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">Escolha o Profissional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  if (!selectedService) return null;
                  const allowedEmployees = employees.filter(emp =>
                    selectedService.employees?.some((se: Employee) => se.id === emp.id)
                  );
                    
                  if (allowedEmployees.length === 0) {
                    return <p className="text-slate-500 col-span-2 font-medium">Nenhum profissional disponível para este serviço.</p>;
                  }

                  return allowedEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => { setSelectedEmployee(emp); setStep(3); }}
                      className="p-4 rounded-3xl border border-white hover:border-primary/50 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} 
                        alt={emp.name} 
                        className="w-24 h-24 rounded-full object-cover group-hover:scale-105 transition-transform shadow-md border-4 border-white" 
                      />
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{emp.name}</h3>
                        <p className="text-primary font-semibold text-sm">{emp.role}</p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl shadow-sm border border-slate-200 transition-all">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900 capitalize drop-shadow-sm">
                    {selectedDateObj 
                      ? format(selectedDateObj, 'MMMM | yyyy', { locale: ptBR }) 
                      : format(new Date(), 'MMMM | yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow-md transition-all font-bold">&lt;</button>
                    <button className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow-md transition-all font-bold">&gt;</button>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {upcomingDays.map((dayObj, i) => {
                    const isSelected = selectedDateObj && isSameDay(dayObj, selectedDateObj);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedDateObj(dayObj);
                          setSelectedTime(''); // Reseta horário ao trocar dia
                        }}
                        className={`flex flex-col items-center justify-center min-w-[75px] h-24 rounded-3xl border transition-all snap-start shadow-sm ${
                          isSelected 
                            ? 'border-primary bg-primary text-white shadow-md scale-105' 
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:shadow-md'
                        }`}
                      >
                        <span className="text-xs uppercase font-bold tracking-wider mb-1">{format(dayObj, 'E', { locale: ptBR })}</span>
                        <span className={`text-2xl font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{format(dayObj, 'dd')}</span>
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{format(dayObj, 'MMM', { locale: ptBR })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {selectedDateObj ? (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 ml-2">Escolha um horário</h3>
                  
                  {isLoadingTimes ? (
                    <div className="flex justify-center py-8">
                      <p className="text-primary font-bold animate-pulse">Calculando horários livres...</p>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {availableTimes.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3.5 rounded-2xl border text-sm font-bold transition-all shadow-sm ${
                            selectedTime === time 
                              ? 'border-primary bg-primary text-white shadow-md scale-105' 
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-primary hover:border-primary/50 hover:shadow-md'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-slate-600 font-bold">
                        O profissional não possui horários livres nesta data. Tente outro dia.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-medium">
                  <p>Selecione uma data acima para ver os horários.</p>
                </div>
              )}

              <div className="mt-10 flex gap-4">
                <button onClick={() => setStep(2)} className="w-1/3 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200">
                  Voltar
                </button>
                <button 
                  disabled={!selectedTime}
                  onClick={() => setStep(4)} 
                  className={`w-2/3 py-4 font-bold rounded-2xl transition-all ${
                    selectedTime 
                      ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/30 scale-[1.02]' 
                      : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-2 text-slate-900">Finalizar Agendamento</h2>
              <p className="text-slate-600 text-sm mb-6 font-medium">Valide sua identidade antes de agendar para garantir a segurança da reserva.</p>
              
              <div className="space-y-4">
                
                {/* 1. SE ESTIVER LOGADO E VALIDADO */}
                {client ? (
                  <div className="bg-white border border-primary/30 p-5 rounded-3xl shadow-sm space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-primary font-extrabold uppercase tracking-widest mb-1">Identidade Confirmada</p>
                        <h4 className="text-lg font-extrabold text-slate-900">{client.name}</h4>
                        <p className="text-sm text-slate-500 font-mono mt-0.5">{client.phone}</p>
                        {client.email && <p className="text-sm text-slate-500 mt-0.5">{client.email}</p>}
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-xl text-emerald-600">✓</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClient(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-600 underline font-semibold cursor-pointer transition-colors"
                    >
                      Alterar Identificação / Sair
                    </button>
                  </div>
                ) : (
                  /* 2. SE NÃO ESTIVER LOGADO (FORMULÁRIO DE LOGIN E VERIFICAÇÃO) */
                  <div className="space-y-4">
                    {/* Campos de Nome e Celular */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-2">Nome Completo</label>
                        <input 
                          type="text" 
                          disabled={otpSent}
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: João Silva" 
                          className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-inner transition-all disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-2">WhatsApp para Verificação</label>
                        <input 
                          type="tel" 
                          disabled={otpSent}
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ex: 11999999999" 
                          className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-inner transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {msg.text && (
                      <div className={`text-xs p-3.5 rounded-xl ${
                        msg.type === "ok" 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono" 
                          : msg.type === "info" 
                            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}>
                        {msg.text}
                      </div>
                    )}

                    {/* Exibir envio de código OTP */}
                    {otpSent ? (
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 animate-fade-in">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Código de 6 dígitos recebido:</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="w-full text-center tracking-[10px] text-xl bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 shadow-inner"
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                              setMsg({ type: "", text: "" });
                            }}
                            className="flex-1 py-3.5 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-sm"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isSubmitting || otpCode.length < 6}
                            className="flex-[2] py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? "Validando..." : "Verificar Código"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Botão de Enviar OTP */}
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
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold py-4 rounded-2xl transition-all cursor-pointer disabled:opacity-50 text-sm"
                        >
                          {isSubmitting ? "Carregando..." : "Validar WhatsApp para Agendar"}
                        </button>

                        {!showGooglePhoneLink && (
                          <>
                            {/* Divisor */}
                            <div className="relative flex items-center justify-center my-6">
                              <div className="w-full h-px bg-slate-200"></div>
                              <span className="absolute px-3 bg-white text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm border border-slate-100">
                                ou autenticar com
                              </span>
                            </div>

                            {/* Google Sign-In real ou mock */}
                            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                              <div className="flex justify-center w-full">
                                <div id="google-signin-button-booking"></div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSimulateGoogle}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
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

                {/* Bloco de Assinatura */}
                {client && activePlan && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between animate-fade-in">
                    <div>
                      <p className="text-emerald-400 font-bold text-xs">Você tem um plano ativo!</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{activePlan.plan.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{activePlan.remainingSlots} créditos restantes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="use-credit" className="text-xs text-white cursor-pointer font-medium">Usar plano?</label>
                      <input
                        id="use-credit"
                        type="checkbox"
                        checked={usePlanCredit}
                        onChange={(e) => setUsePlanCredit(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded bg-black/40 border-glass-border focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Botão de Confirmação Final de Agendamento */}
                {client && (
                  <div className="mt-4 space-y-4">
                    {msg.text && (
                      <div className={`text-xs p-3.5 rounded-xl ${
                        msg.type === "ok" 
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono" 
                          : msg.type === "info" 
                            ? "bg-blue-50 border border-blue-200 text-blue-700" 
                            : "bg-red-50 border border-red-200 text-red-700"
                      }`}>
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
                      disabled={isSubmitting}
                      className={`w-full bg-gradient-to-r from-primary to-accent text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:opacity-90 hover:scale-[1.01] transition-all flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={handleConfirmBooking}
                    >
                      {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <button onClick={() => setStep(3)} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 shadow-sm hover:shadow-md font-bold rounded-2xl transition-all border border-slate-200">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in flex flex-col items-center text-center py-12">
              <div className="w-24 h-24 rounded-full bg-emerald-100 shadow-sm flex items-center justify-center mb-6 border-4 border-white">
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4 drop-shadow-sm">Agendamento Confirmado!</h2>
              <p className="text-slate-600 mb-8 max-w-md font-medium text-lg">
                Tudo certo, <strong className="text-slate-900">{clientName}</strong>! Seu horário com <strong className="text-slate-900">{selectedEmployee?.name}</strong> está marcado para <strong className="text-primary">{selectedDateStr.split('-').reverse().join('/')} às {selectedTime}</strong>.
              </p>

              {/* Botão de Exportar para o Google Calendar */}
              {(() => {
                if (!selectedService) return null;
                try {
                  const start = new Date(`${selectedDateStr}T${selectedTime}:00.000Z`);
                  const end = new Date(start.getTime() + (selectedService.duration || 30) * 60 * 1000);
                  
                  const formatUTC = (date: Date) => {
                    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                  };

                  const title = `${selectedService.name} - ${tenantSlug.toUpperCase()}`;
                  const details = `Seu agendamento foi confirmado com sucesso!\n\nProfissional: ${selectedEmployee?.name}\nServiço: ${selectedService.name}\nDuração: ${selectedService.duration} min\nValor: R$ ${selectedService.price.toFixed(2)}`;
                  
                  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatUTC(start)}/${formatUTC(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(tenantSlug.toUpperCase())}`;

                  return (
                    <a 
                      href={gCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full max-w-xs mb-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer border border-blue-500 text-sm animate-fade-in"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                      </svg>
                      Adicionar ao Google Agenda
                    </a>
                  );
                } catch {
                  return null;
                }
              })()}
              
              <Link 
                href={`/${tenantSlug}`}
                className="px-8 py-4 bg-white text-slate-700 shadow-sm hover:shadow-md font-bold rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 w-full max-w-xs block text-center"
              >
                Voltar para o Início
              </Link>
            </div>
          )}

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </main>
  );
}
