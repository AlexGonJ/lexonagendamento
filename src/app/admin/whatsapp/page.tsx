"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  getWhatsappSettings, 
  updateWhatsappSettings, 
  checkWhatsappConnection, 
  sendTestWhatsappMessage, 
  getWhatsappLogs,
  runAppointmentRemindersJob,
  runInactiveClientRemindersJob
} from "@/actions/whatsapp";
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Send, 
  RefreshCw, 
  Play, 
  FileText, 
  AlertCircle, 
  Loader2, 
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function WhatsappIntegrationPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{ status: string; error?: string | null }>({
    status: "DISCONNECTED",
    error: null
  });
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappProvider, setWhatsappProvider] = useState("simulador");
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappWabaId, setWhatsappWabaId] = useState("");

  // Automations State
  const [whatsappConfirmEnabled, setWhatsappConfirmEnabled] = useState(false);
  const [whatsappConfirmTemplate, setWhatsappConfirmTemplate] = useState("");
  const [whatsappReminderEnabled, setWhatsappReminderEnabled] = useState(false);
  const [whatsappReminderHours, setWhatsappReminderHours] = useState("2");
  const [whatsappReminderTemplate, setWhatsappReminderTemplate] = useState("");
  const [whatsappInactiveEnabled, setWhatsappInactiveEnabled] = useState(false);
  const [whatsappInactiveDays, setWhatsappInactiveDays] = useState("30");
  const [whatsappInactiveTemplate, setWhatsappInactiveTemplate] = useState("");
  const [whatsappCancelNotifyEnabled, setWhatsappCancelNotifyEnabled] = useState(false);
  const [whatsappCancelNotifyTemplate, setWhatsappCancelNotifyTemplate] = useState("");

  // Test Message State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do sistema de agendamentos.");
  const [sendingTest, setSendingTest] = useState(false);

  // Manual Automation State
  const [runningReminderJob, setRunningReminderJob] = useState(false);
  const [runningInactiveJob, setRunningInactiveJob] = useState(false);

  // Load configs and logs
  async function loadData() {
    try {
      const config = await getWhatsappSettings();
      setWhatsappEnabled(config.whatsappEnabled);
      setWhatsappProvider(config.whatsappProvider);
      setWhatsappApiUrl(config.whatsappApiUrl || "");
      setWhatsappToken(config.whatsappToken || "");
      setWhatsappNumber(config.whatsappNumber || "");
      setWhatsappWabaId(config.whatsappWabaId || "");

      setWhatsappConfirmEnabled(config.whatsappConfirmEnabled);
      setWhatsappConfirmTemplate(config.whatsappConfirmTemplate || "");
      setWhatsappReminderEnabled(config.whatsappReminderEnabled);
      setWhatsappReminderHours(config.whatsappReminderHours.toString());
      setWhatsappReminderTemplate(config.whatsappReminderTemplate || "");
      setWhatsappInactiveEnabled(config.whatsappInactiveEnabled);
      setWhatsappInactiveDays(config.whatsappInactiveDays.toString());
      setWhatsappInactiveTemplate(config.whatsappInactiveTemplate || "");
      setWhatsappCancelNotifyEnabled(config.whatsappCancelNotifyEnabled ?? true);
      setWhatsappCancelNotifyTemplate(config.whatsappCancelNotifyTemplate || "");

      const initialLogs = await getWhatsappLogs();
      setLogs(initialLogs);
      
      // Auto-check connection
      if (config.whatsappEnabled) {
        verifyConnection();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao carregar dados do WhatsApp." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Check connection action
  async function verifyConnection() {
    setCheckingConnection(true);
    try {
      const result = await checkWhatsappConnection();
      if (result.success) {
        setConnectionStatus({ status: "CONNECTED", error: null });
      } else {
        setConnectionStatus({ status: "DISCONNECTED", error: result.error || "Desconectado" });
      }
    } catch (err: any) {
      setConnectionStatus({ status: "DISCONNECTED", error: err.message || "Falha na verificação." });
    } finally {
      setCheckingConnection(false);
    }
  }

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const payload = {
      whatsappEnabled,
      whatsappProvider,
      whatsappApiUrl,
      whatsappToken,
      whatsappNumber,
      whatsappWabaId,
      whatsappConfirmEnabled,
      whatsappConfirmTemplate,
      whatsappReminderEnabled,
      whatsappReminderHours,
      whatsappReminderTemplate,
      whatsappInactiveEnabled,
      whatsappInactiveDays,
      whatsappInactiveTemplate,
      whatsappCancelNotifyEnabled,
      whatsappCancelNotifyTemplate,
    };

    startTransition(async () => {
      try {
        const res = await updateWhatsappSettings(payload);
        if (res.success) {
          setMessage({ type: "success", text: "Configurações de WhatsApp salvas com sucesso!" });
          verifyConnection();
          // Reload logs
          const updatedLogs = await getWhatsappLogs();
          setLogs(updatedLogs);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Erro ao salvar configurações." });
      }
    });
  };

  // Send test message
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      alert("Por favor, preencha o número de telefone.");
      return;
    }

    setSendingTest(true);
    setMessage(null);

    try {
      const res = await sendTestWhatsappMessage(testPhone, testMessage);
      if (res.success) {
        setMessage({ 
          type: "success", 
          text: res.status === "SIMULATED" 
            ? `[Simulação] Mensagem simulada com sucesso! Verifique os logs abaixo.` 
            : "Mensagem de teste enviada com sucesso no WhatsApp!" 
        });
        // Reload logs
        const updatedLogs = await getWhatsappLogs();
        setLogs(updatedLogs);
      } else {
        setMessage({ type: "error", text: `Falha ao enviar: ${res.error}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao enviar teste." });
    } finally {
      setSendingTest(false);
    }
  };

  // Trigger manual reminder routine
  const triggerReminderJob = async () => {
    setRunningReminderJob(true);
    setMessage(null);
    try {
      const res = await runAppointmentRemindersJob();
      if (res.success) {
        setMessage({
          type: "success",
          text: `Varredura concluída! Processados: ${res.totalProcessed} | Enviados: ${res.sentCount} | Simulados: ${res.simulatedCount} | Falhas: ${res.failedCount}`
        });
        // Reload logs
        const updatedLogs = await getWhatsappLogs();
        setLogs(updatedLogs);
      } else {
        setMessage({ type: "error", text: `Erro: ${res.message}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro na rotina." });
    } finally {
      setRunningReminderJob(false);
    }
  };

  // Trigger manual inactivity routine
  const triggerInactiveJob = async () => {
    setRunningInactiveJob(true);
    setMessage(null);
    try {
      const res = await runInactiveClientRemindersJob();
      if (res.success) {
        setMessage({
          type: "success",
          text: `Varredura concluída! Enviados: ${res.sentCount} | Simulados: ${res.simulatedCount} | Falhas: ${res.failedCount}`
        });
        // Reload logs
        const updatedLogs = await getWhatsappLogs();
        setLogs(updatedLogs);
      } else {
        setMessage({ type: "error", text: `Erro: ${res.message}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro na rotina." });
    } finally {
      setRunningInactiveJob(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Carregando painel do WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-blue-600 w-7 h-7" />
            Integração e Automação de WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Conecte sua API de WhatsApp para enviar confirmações, lembretes de agendamentos e reter clientes sumidos.
          </p>
        </div>

        {/* Global Connection Badge */}
        {whatsappEnabled && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
            {connectionStatus.status === "CONNECTED" ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 fill-emerald-100" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5 fill-rose-100" />
                Desconectado
              </span>
            )}
            <button
              onClick={verifyConnection}
              disabled={checkingConnection}
              title="Testar Conexão"
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingConnection ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm font-medium flex items-start gap-3 shadow-xs ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
          <div>{message.text}</div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Config Form (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSaveSettings} className="space-y-8">
            
            {/* CARD 1: Ativação Global e Provedor */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Configuração de Conexão</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Ative o serviço e selecione seu provedor de mensagens.</p>
                </div>
                
                {/* Switch Button */}
                <button
                  type="button"
                  onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                  className="focus:outline-none cursor-pointer"
                >
                  {whatsappEnabled ? (
                    <ToggleRight className="w-14 h-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-14 h-8 text-gray-300" />
                  )}
                </button>
              </div>

              {whatsappEnabled && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provedor WhatsApp</label>
                    <select
                      value={whatsappProvider}
                      onChange={(e) => setWhatsappProvider(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm font-medium"
                    >
                      <option value="simulador">Simulador (Modo Teste / Logs)</option>
                      <option value="evolution">Evolution API (Conexão via Instância)</option>
                      <option value="meta">WhatsApp Cloud API Oficial (Meta/Facebook)</option>
                    </select>
                  </div>

                  {/* Dynamic Fields for Evolution API */}
                  {whatsappProvider === "evolution" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 animate-fade-in">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">URL da API Evolution</label>
                        <input
                          type="url"
                          required={whatsappProvider === "evolution"}
                          placeholder="Ex: https://api.evolution-api.com"
                          value={whatsappApiUrl}
                          onChange={(e) => setWhatsappApiUrl(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Token de Acesso / API Key</label>
                        <input
                          type="password"
                          required={whatsappProvider === "evolution"}
                          placeholder="Sua chave apikey"
                          value={whatsappToken}
                          onChange={(e) => setWhatsappToken(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Instância</label>
                        <input
                          type="text"
                          required={whatsappProvider === "evolution"}
                          placeholder="Ex: barbearia_brutus"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Fields for Meta Cloud API */}
                  {whatsappProvider === "meta" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 animate-fade-in">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Access Token da Meta (Bearer)</label>
                        <input
                          type="password"
                          required={whatsappProvider === "meta"}
                          placeholder="Chave permanente de acesso à API de Nuvem"
                          value={whatsappToken}
                          onChange={(e) => setWhatsappToken(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">ID do Número de Telefone (Phone ID)</label>
                        <input
                          type="text"
                          required={whatsappProvider === "meta"}
                          placeholder="ID gerado no painel de desenvolvedor"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">ID da Conta de Negócios (WABA ID)</label>
                        <input
                          type="text"
                          placeholder="Opcional. WhatsApp Business Account ID"
                          value={whatsappWabaId}
                          onChange={(e) => setWhatsappWabaId(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Simulator Info */}
                  {whatsappProvider === "simulador" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2.5 mt-2">
                      <HelpCircle className="w-5 h-5 shrink-0 text-blue-600" />
                      <div>
                        <span className="font-semibold block">Simulador Ativo:</span>
                        Nenhuma mensagem real será enviada. Todas as ações do sistema (confirmação, lembretes de horas antes e alerta de inatividade) serão disparadas e gravadas no histórico de logs abaixo com status azul <span className="font-semibold">SIMULATED</span>. Perfeito para validação!
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 2: Automações e Templates */}
            {whatsappEnabled && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Configuração de Automações</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Customize as mensagens automáticas de WhatsApp e seus gatilhos.</p>
                </div>

                {/* 1. Confirmação Imediata */}
                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      Confirmar Agendamento Imediato
                    </label>
                    <input
                      type="checkbox"
                      checked={whatsappConfirmEnabled}
                      onChange={(e) => setWhatsappConfirmEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                  {whatsappConfirmEnabled && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">
                        {whatsappProvider === "meta" ? "Nome do Template Meta" : "Mensagem (Templates de Texto)"}
                      </label>
                      {whatsappProvider === "meta" ? (
                        <input
                          type="text"
                          required={whatsappConfirmEnabled}
                          placeholder="Ex: booking_confirmation"
                          value={whatsappConfirmTemplate}
                          onChange={(e) => setWhatsappConfirmTemplate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-medium"
                        />
                      ) : (
                        <textarea
                          rows={3}
                          value={whatsappConfirmTemplate}
                          onChange={(e) => setWhatsappConfirmTemplate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                          placeholder="Ex: Olá {nome}, seu agendamento para {servico} com {profissional} no dia {data} às {hora} está confirmado!"
                        />
                      )}
                      <p className="text-xxs text-gray-400">
                        Placeholder disponíveis: <span className="font-semibold font-mono">{`{nome}, {servico}, {profissional}, {data}, {hora}`}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Lembrete Pré-Atendimento */}
                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-800">Lembrete Pré-Atendimento</label>
                    <input
                      type="checkbox"
                      checked={whatsappReminderEnabled}
                      onChange={(e) => setWhatsappReminderEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                  {whatsappReminderEnabled && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="w-full max-w-xs">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Enviar quanto tempo antes? (Horas)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={whatsappReminderHours}
                          onChange={(e) => setWhatsappReminderHours(e.target.value)}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">
                          {whatsappProvider === "meta" ? "Nome do Template Meta" : "Mensagem (Templates de Texto)"}
                        </label>
                        {whatsappProvider === "meta" ? (
                          <input
                            type="text"
                            required={whatsappReminderEnabled}
                            placeholder="Ex: booking_reminder"
                            value={whatsappReminderTemplate}
                            onChange={(e) => setWhatsappReminderTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-medium"
                          />
                        ) : (
                          <textarea
                            rows={3}
                            value={whatsappReminderTemplate}
                            onChange={(e) => setWhatsappReminderTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                            placeholder="Olá {nome}, lembrando do seu atendimento de {servico} com {profissional} hoje às {hora}!"
                          />
                        )}
                        <p className="text-xxs text-gray-400">
                          Placeholder disponíveis: <span className="font-semibold font-mono">{`{nome}, {servico}, {profissional}, {data}, {hora}`}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Reativação de Clientes Inativos */}
                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-800">Reter Clientes Inativos (30 dias)</label>
                    <input
                      type="checkbox"
                      checked={whatsappInactiveEnabled}
                      onChange={(e) => setWhatsappInactiveEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                  {whatsappInactiveEnabled && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="w-full max-w-xs">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Inativo há quantos dias?
                        </label>
                        <input
                          type="number"
                          min="7"
                          max="90"
                          value={whatsappInactiveDays}
                          onChange={(e) => setWhatsappInactiveDays(e.target.value)}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">
                          {whatsappProvider === "meta" ? "Nome do Template Meta" : "Mensagem (Templates de Texto)"}
                        </label>
                        {whatsappProvider === "meta" ? (
                          <input
                            type="text"
                            required={whatsappInactiveEnabled}
                            placeholder="Ex: client_winback"
                            value={whatsappInactiveTemplate}
                            onChange={(e) => setWhatsappInactiveTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-medium"
                          />
                        ) : (
                          <textarea
                            rows={3}
                            value={whatsappInactiveTemplate}
                            onChange={(e) => setWhatsappInactiveTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                            placeholder="Olá {nome}, faz {dias} dias que você não agenda um serviço conosco! Que tal marcar um novo horário?"
                          />
                        )}
                        <p className="text-xxs text-gray-400">
                          Placeholder disponíveis: <span className="font-semibold font-mono">{`{nome}, {dias}`}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Notificação de Cancelamento para Profissional */}
                <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-800">
                      Notificar Cancelamento ao Profissional
                    </label>
                    <input
                      type="checkbox"
                      checked={whatsappCancelNotifyEnabled}
                      onChange={(e) => setWhatsappCancelNotifyEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                  {whatsappCancelNotifyEnabled && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">
                        {whatsappProvider === "meta" ? "Nome do Template Meta" : "Mensagem (Templates de Texto)"}
                      </label>
                      {whatsappProvider === "meta" ? (
                        <input
                          type="text"
                          required={whatsappCancelNotifyEnabled}
                          placeholder="Ex: booking_cancelled_notify"
                          value={whatsappCancelNotifyTemplate}
                          onChange={(e) => setWhatsappCancelNotifyTemplate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-medium"
                        />
                      ) : (
                        <textarea
                          rows={3}
                          value={whatsappCancelNotifyTemplate}
                          onChange={(e) => setWhatsappCancelNotifyTemplate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                          placeholder="Ex: Olá {profissional}, o cliente {nome} desmarcou o agendamento de {servico} do dia {data} às {hora}."
                        />
                      )}
                      <p className="text-xxs text-gray-400">
                        Placeholder disponíveis: <span className="font-semibold font-mono">{`{profissional}, {nome}, {servico}, {data}, {hora}`}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="border-t border-gray-100 pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? "Salvando configurações..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Interactive Widgets & Tools */}
        <div className="space-y-8">
          
          {/* WIDGET 1: Quick Test Message */}
          {whatsappEnabled && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5">
                  <Send className="w-5 h-5 text-gray-600" />
                  Disparar Teste Rápido
                </h3>
                <p className="text-xs text-gray-500">
                  Valide se as mensagens estão saindo de forma instantânea.
                </p>
              </div>

              <form onSubmit={handleSendTest} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nº Celular Destinatário</label>
                  <input
                    type="tel"
                    required
                    placeholder="DDD + Número (Ex: 11999999999)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mensagem</label>
                  <textarea
                    rows={3}
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full py-2 bg-gray-950 text-white font-bold rounded-lg text-xs hover:bg-gray-800 transition-colors flex justify-center items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Mensagem
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* WIDGET 2: Manual Automations Triggers */}
          {whatsappEnabled && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5">
                  <Play className="w-5 h-5 text-gray-600" />
                  Ações de Automação (Cron)
                </h3>
                <p className="text-xs text-gray-500">
                  Simule ou force a varredura e disparo de mensagens que seriam efetuadas via cron jobs.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {whatsappReminderEnabled && (
                  <button
                    type="button"
                    onClick={triggerReminderJob}
                    disabled={runningReminderJob}
                    className="w-full py-2.5 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs transition-colors text-left flex justify-between items-center border border-blue-100 disabled:opacity-50"
                  >
                    <span>Executar Lembretes de Hoje</span>
                    {runningReminderJob ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                )}

                {whatsappInactiveEnabled && (
                  <button
                    type="button"
                    onClick={triggerInactiveJob}
                    disabled={runningInactiveJob}
                    className="w-full py-2.5 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded-lg text-xs transition-colors text-left flex justify-between items-center border border-amber-100 disabled:opacity-50"
                  >
                    <span>Executar Alerta de Inativos ({whatsappInactiveDays} dias)</span>
                    {runningInactiveJob ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xxs text-gray-500 leading-relaxed">
                  <span className="font-bold block mb-0.5">Rotas de API de Produção:</span>
                  Dispare externamente nos endereços:<br />
                  <code className="font-mono bg-white px-1 border select-all block mt-1 py-0.5 truncate">/api/cron/whatsapp-reminders</code>
                  <code className="font-mono bg-white px-1 border select-all block mt-0.5 py-0.5 truncate">/api/cron/whatsapp-inactive</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: History Logs Table */}
      {whatsappEnabled && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-gray-600" />
                Histórico de Disparos de Mensagens
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Histórico em tempo real das mensagens enviadas ou simuladas pelo sistema.
              </p>
            </div>
            
            <button
              onClick={async () => {
                const refreshed = await getWhatsappLogs();
                setLogs(refreshed);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar Logs
            </button>
          </div>

          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs uppercase bg-gray-50 text-gray-700 border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Data/Hora</th>
                    <th scope="col" className="px-6 py-3.5">Destinatário</th>
                    <th scope="col" className="px-6 py-3.5">Mensagem</th>
                    <th scope="col" className="px-6 py-3.5">Tipo</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-900">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }).format(new Date(log.createdAt))}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap">
                        {log.recipient}
                      </td>
                      <td className="px-6 py-4 text-xs max-w-sm truncate text-gray-700" title={log.message}>
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xxs font-bold bg-gray-100 text-gray-800 border">
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === "SIMULATED" && (
                          <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Simulado
                          </span>
                        )}
                        {log.status === "SENT" && (
                          <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Enviado
                          </span>
                        )}
                        {log.status === "FAILED" && (
                          <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-rose-50 text-rose-700 border border-rose-200" title={log.message}>
                            Falhou
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">Nenhuma mensagem registrada até o momento.</p>
              <p className="text-xs mt-0.5">Ative a integração e realize agendamentos para ver os registros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
