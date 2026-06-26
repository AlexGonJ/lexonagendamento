"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAvailableSlots } from '@/actions/availability';
import { createBooking } from '@/actions/booking';
import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BookingFlow({ tenantSlug, services, employees }: { tenantSlug: string, services: any[], employees: any[] }) {
  // Estados do Agendamento
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Estados do Cliente (Passo 4)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const stepTitles = ["Serviço", "Profissional", "Data e horário", "Pagamento"];

  const handleConfirmBooking = async () => {
    if (!clientName || !clientPhone) {
      alert("Por favor, preencha seu nome e WhatsApp.");
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
      clientPhone
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
                {employees.map(emp => (
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
                ))}
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
              <p className="text-gray-400 text-sm mb-6">Para confirmar, informe seus dados.</p>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu Nome Completo" 
                  className="w-full p-4 rounded-2xl bg-black/50 border border-glass-border text-white focus:outline-none focus:border-primary transition-colors"
                />
                <input 
                  type="tel" 
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="WhatsApp (ex: 11999999999)" 
                  className="w-full p-4 rounded-2xl bg-black/50 border border-glass-border text-white focus:outline-none focus:border-primary transition-colors"
                />
                <button 
                  disabled={isSubmitting}
                  className={`w-full bg-gradient-to-r from-primary to-accent text-background font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all mt-4 flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={handleConfirmBooking}
                >
                  {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                </button>
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
              <p className="text-gray-400 mb-8 max-w-md">
                Tudo certo, <strong>{clientName}</strong>! Seu horário com {selectedEmployee?.name} está marcado para {selectedDateStr.split('-').reverse().join('/')} às {selectedTime}.
              </p>
              
              <Link 
                href={`/${tenantSlug}`}
                className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all border border-glass-border"
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
