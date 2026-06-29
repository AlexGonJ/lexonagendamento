"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAvailableSlots } from '@/actions/availability';
import { createBooking } from '@/actions/booking';
import { getActiveSubscription } from '@/actions/plans';
import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendClientOtp, verifyClientOtp, loginClientOAuth, verifyGoogleIdToken } from '@/actions/auth';

export default function BookingFlow({ 
  tenantId,
  tenantSlug, 
  services, 
  employees,
  initialClient 
}: { 
  tenantId: string,
  tenantSlug: string, 
  services: any[], 
  employees: any[],
  initialClient?: { name: string, phone: string, email?: string | null } | null
}) {
  // Estados do Agendamento
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Estado de Sessão Ativa do Cliente no fluxo
  const [client, setClient] = useState<any>(initialClient || null);

  // Estados do Cliente (Passo 4)
  const [clientName, setClientName] = useState(initialClient?.name || '');
  const [clientPhone, setClientPhone] = useState(initialClient?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Assinatura do Cliente
  const [activePlan, setActivePlan] = useState<any>(null);
  const [usePlanCredit, setUsePlanCredit] = useState(false);

  // Estados de Verificação e OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Estados para Google OAuth
  const [showGooglePhoneLink, setShowGooglePhoneLink] = useState(false);
  const [oauthData, setOauthData] = useState<any>(null);

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
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("google-signin-button-booking"),
          { theme: "outline", size: "large", width: 280 }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Silenciar erro
      }
    };
  }, [step]);

  // Resetar validação se o telefone digitado for modificado e não bater com a sessão ativa
  useEffect(() => {
    const cleanInput = clientPhone.replace(/\D/g, "");
    const cleanSession = client?.phone?.replace(/\D/g, "") || "";
    
    if (client && cleanInput !== cleanSession) {
      setClient(null);
      setOtpVerified(false);
      setOtpSent(false);
      setMsg({ type: "", text: "" });
    }
  }, [clientPhone, client]);

  async function handleGoogleCredentialResponse(response: any) {
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
            setOauthData(oauthRes.oauthData);
            setShowGooglePhoneLink(true);
            setMsg({ type: "info", text: "Para concluir seu login com o Google, precisamos vincular seu número de WhatsApp." });
          }
        } else {
          setMsg({ type: "err", text: oauthRes.error || "Erro ao logar com o Google." });
        }
      } else {
        setMsg({ type: "err", text: verifyRes.error || "Token do Google inválido." });
      }
    } catch (err: any) {
      console.error("Erro no login social do agendamento:", err);
      setMsg({ type: "err", text: "Erro ao processar login com o Google." });
    } finally {
      setIsSubmitting(false);
    }
  }

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
          setOauthData(oauthRes.oauthData);
          setShowGooglePhoneLink(true);
          setMsg({ type: "info", text: "Vincule um WhatsApp para concluir o login simulado." });
        }
      } else {
        setMsg({ type: "err", text: oauthRes.error || "Erro ao simular login." });
      }
    } catch (err) {
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
    setIsSubmitting(true);
    setMsg({ type: "", text: "" });

    const res = await sendClientOtp(clientPhone, tenantId);
    setIsSubmitting(false);

    if (res.success) {
      setOtpSent(true);
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
          ...oauthData,
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
      setOtpVerified(true);
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
      setIsLoadingTimes(true);
      setAvailableTimes([]);
      getAvailableSlots(selectedEmployee.id, selectedDateStr, selectedService.duration)
        .then(slots => {
          setAvailableTimes(slots);
          setIsLoadingTimes(false);
        })
        .catch(err => {
          console.error("Erro ao buscar horários", err);
          setIsLoadingTimes(false);
        });
    }
  }, [selectedDateStr, selectedEmployee, selectedService]);

  // Efeito para carregar assinatura ativa quando o telefone mudar
  useEffect(() => {
    const clean = clientPhone.replace(/\D/g, "");
    if (clean.length >= 10) {
      getActiveSubscription(clean, tenantSlug)
        .then(sub => {
          if (sub) {
            setActivePlan(sub);
            setUsePlanCredit(true); // padrão é usar se disponível
          } else {
            setActivePlan(null);
            setUsePlanCredit(false);
          }
        })
        .catch(() => {
          setActivePlan(null);
          setUsePlanCredit(false);
        });
    } else {
      setActivePlan(null);
      setUsePlanCredit(false);
    }
  }, [clientPhone, tenantSlug]);

  const stepTitles = ["Serviço", "Profissional", "Data e horário", "Pagamento"];

  const handleConfirmBooking = async () => {
    if (!clientName || !clientPhone) {
      alert("Por favor, preencha seu nome e WhatsApp.");
      return;
    }

    if (!client) {
      alert("Por favor, valide seu celular ou faça login antes de confirmar.");
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
    });

    setIsSubmitting(false);

    if (result.success) {
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
          <Link href={`/${tenantSlug}`} className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors font-medium border border-glass-border">
            &larr; Voltar
          </Link>
        </div>
      )}

      {/* Stepper Customizado */}
      {step < 5 && (
        <div className="w-full max-w-3xl mb-10 px-2">
          <h1 className="text-center text-xl font-bold mb-8">Passos para agendar</h1>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-4 w-full h-[2px] bg-glass-border -z-10"></div>
            
            {stepTitles.map((title, index) => {
              const stepNum = index + 1;
              const isCompleted = step > stepNum;
              const isActive = step === stepNum;
              
              return (
                <div key={title} className="flex flex-col items-center gap-2 bg-background px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isCompleted 
                      ? 'bg-primary border-primary text-background' 
                      : isActive 
                        ? 'bg-background border-primary text-primary' 
                        : 'bg-background border-glass-border text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : stepNum}
                  </div>
                  <span className={`text-xs md:text-sm ${isActive ? 'text-primary font-semibold' : 'text-gray-500'}`}>
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
            <h3 className="text-sm text-gray-400 mb-2">Item selecionado</h3>
            <div className="glass-panel p-4 flex items-center gap-4 rounded-2xl border border-glass-border relative">
              <img 
                src={selectedService.imageUrl || 'https://placehold.co/150x150/cccccc/ffffff?text=Sem+Foto'} 
                alt={selectedService.name} 
                className="w-20 h-20 rounded-xl object-cover" 
              />
              <div className="flex-1">
                <h4 className="font-bold text-lg">{selectedService.name}</h4>
                <div className="flex items-center text-gray-400 text-sm gap-1 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {selectedService.duration}min
                </div>
                <p className="text-sm text-gray-300">com <span className="text-white font-medium">{selectedEmployee.name}</span></p>
              </div>
              <div className="text-primary font-bold text-lg">
                R$ {selectedService.price.toFixed(2)}
              </div>
              <button 
                onClick={() => setStep(1)}
                className="absolute top-4 right-4 text-xs text-gray-400 hover:text-white underline"
              >
                Alterar
              </button>
            </div>
          </div>
        )}

        <div className="glass-panel p-6 md:p-8 relative overflow-hidden rounded-3xl">
          
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Escolha o Serviço</h2>
              <div className="space-y-4">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep(2); }}
                    className="w-full text-left p-4 rounded-2xl border border-glass-border hover:border-primary bg-white/5 transition-all flex items-center gap-4 group"
                  >
                    <img 
                      src={service.imageUrl || 'https://placehold.co/150x150/cccccc/ffffff?text=Sem+Foto'} 
                      alt={service.name} 
                      className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" 
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      <span className="text-gray-400 text-sm">{service.duration} min</span>
                    </div>
                    <span className="text-primary font-bold text-xl whitespace-nowrap">R$ {service.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Escolha o Profissional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const allowedEmployees = selectedService?.employees?.length > 0
                    ? employees.filter(emp => selectedService.employees.some((se: any) => se.id === emp.id))
                    : employees; // fallback para todos se não configurado
                    
                  if (allowedEmployees.length === 0) {
                    return <p className="text-gray-400 col-span-2">Nenhum profissional disponível para este serviço.</p>;
                  }

                  return allowedEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => { setSelectedEmployee(emp); setStep(3); }}
                      className="p-4 rounded-2xl border border-glass-border hover:border-primary bg-white/5 transition-all flex flex-col items-center text-center gap-3 group"
                    >
                      <img 
                        src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} 
                        alt={emp.name} 
                        className="w-20 h-20 rounded-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div>
                        <h3 className="font-semibold text-lg">{emp.name}</h3>
                        <p className="text-primary text-sm">{emp.role}</p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-glass-border">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white capitalize">
                    {selectedDateObj 
                      ? format(selectedDateObj, 'MMMM | yyyy', { locale: ptBR }) 
                      : format(new Date(), 'MMMM | yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full border border-glass-border flex items-center justify-center hover:bg-white/10">&lt;</button>
                    <button className="w-8 h-8 rounded-full border border-glass-border flex items-center justify-center hover:bg-white/10">&gt;</button>
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
                        className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border transition-all snap-start ${
                          isSelected 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-glass-border bg-white/5 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                      >
                        <span className="text-xs uppercase font-medium mb-1">{format(dayObj, 'E', { locale: ptBR })}</span>
                        <span className={`text-xl font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>{format(dayObj, 'dd/MM')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {selectedDateObj ? (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Escolha um horário</h3>
                  
                  {isLoadingTimes ? (
                    <div className="flex justify-center py-8">
                      <p className="text-primary font-medium animate-pulse">Calculando horários livres...</p>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {availableTimes.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                            selectedTime === time 
                              ? 'border-primary bg-primary text-background' 
                              : 'border-glass-border bg-white/5 hover:border-primary text-white hover:text-primary'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-2xl border border-glass-border">
                      <p className="text-gray-400">
                        O profissional não possui horários livres nesta data. Tente outro dia.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Selecione uma data acima para ver os horários.</p>
                </div>
              )}

              <div className="mt-10 flex gap-4">
                <button onClick={() => setStep(2)} className="w-1/3 py-4 bg-white/5 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all border border-glass-border">
                  Voltar
                </button>
                <button 
                  disabled={!selectedTime}
                  onClick={() => setStep(4)} 
                  className={`w-2/3 py-4 font-bold rounded-2xl transition-all ${
                    selectedTime 
                      ? 'bg-primary text-background hover:opacity-90 shadow-lg shadow-primary/20' 
                      : 'bg-glass-border text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-2">Finalizar Agendamento</h2>
              <p className="text-gray-400 text-sm mb-6">Valide sua identidade antes de agendar para garantir a segurança da reserva.</p>
              
              <div className="space-y-4">
                
                {/* 1. SE ESTIVER LOGADO E VALIDADO */}
                {client ? (
                  <div className="bg-white/5 border border-primary/30 p-5 rounded-2xl space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-primary font-bold uppercase tracking-wider">Identidade Confirmada</p>
                        <h4 className="text-lg font-bold text-white mt-1">{client.name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{client.phone}</p>
                        {client.email && <p className="text-xs text-slate-500 mt-0.5">{client.email}</p>}
                      </div>
                      <span className="text-2xl">✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClient(null);
                        setOtpVerified(false);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
                    >
                      Alterar Identificação / Sair
                    </button>
                  </div>
                ) : (
                  /* 2. SE NÃO ESTIVER LOGADO (FORMULÁRIO DE LOGIN E VERIFICAÇÃO) */
                  <div className="space-y-4">
                    {/* Campos de Nome e Celular */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
                        <input 
                          type="text" 
                          disabled={otpSent}
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: João Silva" 
                          className="w-full p-4 rounded-2xl bg-black/50 border border-glass-border text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">WhatsApp para Verificação</label>
                        <input 
                          type="tel" 
                          disabled={otpSent}
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ex: 11999999999" 
                          className="w-full p-4 rounded-2xl bg-black/50 border border-glass-border text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
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
                      <div className="bg-white/5 border border-glass-border p-4 rounded-2xl space-y-3 animate-fade-in">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Código de 6 dígitos recebido:</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="w-full text-center tracking-[10px] text-lg bg-black/70 border border-glass-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all placeholder:text-slate-800"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                              setMsg({ type: "", text: "" });
                            }}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition-all cursor-pointer"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isSubmitting || otpCode.length < 6}
                            className="flex-[2] py-3 bg-gradient-to-r from-primary to-accent text-background rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? "Validando..." : "Verificar Código"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Botão de Enviar OTP */}
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSubmitting || !clientPhone || clientPhone.replace(/\D/g, "").length < 10}
                          className="w-full bg-white/10 hover:bg-white/15 border border-glass-border text-white font-bold py-3.5 rounded-2xl transition-all cursor-pointer disabled:opacity-50 text-sm"
                        >
                          {isSubmitting ? "Carregando..." : "Validar WhatsApp para Agendar"}
                        </button>

                        {!showGooglePhoneLink && (
                          <>
                            {/* Divisor */}
                            <div className="relative flex items-center justify-center my-6">
                              <div className="w-full h-px bg-slate-800"></div>
                              <span className="absolute px-3 bg-background text-slate-500 text-xs font-medium uppercase tracking-wider">
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
                                className="w-full flex items-center justify-center gap-2 py-3 bg-black/60 hover:bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-2xl transition-all cursor-pointer"
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
                  <button 
                    disabled={isSubmitting}
                    className={`w-full bg-gradient-to-r from-primary to-accent text-background font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all mt-4 flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleConfirmBooking}
                  >
                    {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                )}
              </div>

              <div className="mt-8">
                <button onClick={() => setStep(3)} className="px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all border border-glass-border">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in flex flex-col items-center text-center py-12">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Agendamento Confirmado!</h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Tudo certo, <strong>{clientName}</strong>! Seu horário com {selectedEmployee?.name} está marcado para {selectedDateStr.split('-').reverse().join('/')} às {selectedTime}.
              </p>

              {/* Botão de Exportar para o Google Calendar */}
              {(() => {
                try {
                  const start = new Date(`${selectedDateStr}T${selectedTime}:00.000Z`);
                  const end = new Date(start.getTime() + (selectedService?.duration || 30) * 60 * 1000);
                  
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
                } catch (e) {
                  return null;
                }
              })()}
              
              <Link 
                href={`/${tenantSlug}`}
                className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all border border-glass-border w-full max-w-xs block text-center"
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
