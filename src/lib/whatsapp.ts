import prisma from "@/lib/prisma";

export interface WhatsappConnectionParams {
  provider: string; // "simulador" | "evolution" | "meta"
  apiUrl?: string | null;
  token?: string | null;
  number?: string | null; // Instance name for Evolution, Phone ID for Meta
}

export interface SendWhatsappParams {
  tenantId: string;
  recipient: string;
  type: "CONFIRMATION" | "REMINDER" | "INACTIVE" | "TEST" | "CANCEL_NOTIFICATION";
  data: {
    clientName: string;
    serviceName: string;
    employeeName: string;
    dateStr: string; // DD/MM/YYYY
    timeStr: string; // HH:MM
    inactiveDays?: number;
  };
  overrideMessage?: string; // Optional message string for test sends
}

// Helper to replace text template placeholders
export function replaceMessagePlaceholders(
  templateText: string,
  data: SendWhatsappParams["data"]
): string {
  return templateText
    .replace(/\{nome\}/gi, data.clientName)
    .replace(/\{servi[cç]o\}/gi, data.serviceName)
    .replace(/\{profissional\}/gi, data.employeeName)
    .replace(/\{data\}/gi, data.dateStr)
    .replace(/\{hora\}/gi, data.timeStr)
    .replace(/\{dias\}/gi, data.inactiveDays?.toString() || "30");
}

// Helper to extract placeholders in order of appearance for Meta Cloud API Template Parameters
export function getMetaTemplateParameters(
  templateText: string,
  data: SendWhatsappParams["data"]
): string[] {
  const matches: string[] = [];
  const regex = /\{([^{}]+)\}/g;
  let match;
  while ((match = regex.exec(templateText)) !== null) {
    matches.push(match[1].toLowerCase().trim());
  }

  return matches.map((key) => {
    if (key === "nome") return data.clientName;
    if (key === "servico" || key === "serviço") return data.serviceName;
    if (key === "profissional") return data.employeeName;
    if (key === "data") return data.dateStr;
    if (key === "hora") return data.timeStr;
    if (key === "dias") return data.inactiveDays?.toString() || "30";
    return "";
  });
}

// Clean phone numbers for Brazil (e.g., adds country code 55 if not present)
export function cleanPhoneNumber(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10 || clean.length === 11) {
    clean = "55" + clean;
  }
  return clean;
}

// Verify WhatsApp API Connection Status
export async function verifyWhatsappConnection(
  params: WhatsappConnectionParams
): Promise<{ success: boolean; status: string; error?: string }> {
  const { provider, apiUrl, token, number } = params;

  if (provider === "simulador") {
    return { success: true, status: "CONNECTED" };
  }

  if (provider === "evolution") {
    if (!apiUrl || !token || !number) {
      return { success: false, status: "DISCONNECTED", error: "Parâmetros incompletos para Evolution API." };
    }

    try {
      // Remove barra final do URL se houver
      const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const url = `${baseUrl}/instance/connectionState/${number}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": token,
        },
        // Timeout de 6 segundos
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, status: "DISCONNECTED", error: `Erro HTTP ${res.status}: ${text}` };
      }

      const data = await res.json();
      const state = data?.instance?.state || data?.state;

      if (state === "open") {
        return { success: true, status: "CONNECTED" };
      } else {
        return { success: false, status: "DISCONNECTED", error: `Instância em estado: ${state || "desconhecido"}` };
      }
    } catch (err: any) {
      return { success: false, status: "DISCONNECTED", error: err.message || "Erro de conexão com o servidor Evolution API." };
    }
  }

  if (provider === "meta") {
    if (!token || !number) {
      return { success: false, status: "DISCONNECTED", error: "Parâmetros incompletos para Meta Cloud API (Token ou ID do Número ausente)." };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${number}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `Erro HTTP ${res.status}`;
        return { success: false, status: "DISCONNECTED", error: errMsg };
      }

      return { success: true, status: "CONNECTED" };
    } catch (err: any) {
      return { success: false, status: "DISCONNECTED", error: err.message || "Erro de conexão com os servidores da Meta." };
    }
  }

  return { success: false, status: "DISCONNECTED", error: "Provedor desconhecido." };
}

// Core Send Function
export async function sendWhatsappMessage(
  params: SendWhatsappParams
): Promise<{ success: boolean; status: string; logId?: string; error?: string }> {
  const { tenantId, recipient, type, data, overrideMessage } = params;

  try {
    // 1. Busca configurações do Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { success: false, status: "FAILED", error: "Tenant não encontrado." };
    }

    if (!tenant.whatsappEnabled) {
      return { success: false, status: "FAILED", error: "Automação de WhatsApp desativada para este estabelecimento." };
    }

    const provider = tenant.whatsappProvider;
    const apiUrl = tenant.whatsappApiUrl;
    const token = tenant.whatsappToken;
    const number = tenant.whatsappNumber; // Nome da instância (Evolution) ou Phone ID (Meta)

    const recipientPhone = cleanPhoneNumber(recipient);

    // 2. Determina a mensagem e configurações dependendo do tipo de automação
    let templateText = "";
    let isAutomationEnabled = false;

    if (type === "CONFIRMATION") {
      templateText = tenant.whatsappConfirmTemplate || "";
      isAutomationEnabled = tenant.whatsappConfirmEnabled;
    } else if (type === "REMINDER") {
      templateText = tenant.whatsappReminderTemplate || "";
      isAutomationEnabled = tenant.whatsappReminderEnabled;
    } else if (type === "INACTIVE") {
      templateText = tenant.whatsappInactiveTemplate || "";
      isAutomationEnabled = tenant.whatsappInactiveEnabled;
    } else if (type === "CANCEL_NOTIFICATION") {
      templateText = tenant.whatsappCancelNotifyTemplate || "";
      isAutomationEnabled = tenant.whatsappCancelNotifyEnabled;
    } else if (type === "TEST") {
      templateText = overrideMessage || "Mensagem de teste do sistema de agendamento.";
      isAutomationEnabled = true; // Testes sempre habilitados
    }

    if (!isAutomationEnabled) {
      return { success: false, status: "FAILED", error: `Automação do tipo ${type} está desativada.` };
    }

    // Gerar o corpo da mensagem de texto
    const textMessageBody = replaceMessagePlaceholders(templateText, data);

    // 3. Executa o envio conforme o provedor configurado
    if (provider === "simulador") {
      console.log(`\n--- [WHATSAPP SIMULATOR LOG] ---`);
      console.log(`Para: ${recipientPhone} (${recipient})`);
      console.log(`Tipo: ${type}`);
      console.log(`Conteúdo: ${textMessageBody}`);
      console.log(`---------------------------------\n`);

      // Salva no banco com status SIMULATED
      const log = await prisma.whatsappLog.create({
        data: {
          tenantId,
          recipient: recipientPhone,
          message: textMessageBody,
          type,
          status: "SIMULATED",
        },
      });

      return { success: true, status: "SIMULATED", logId: log.id };
    }

    if (provider === "evolution") {
      if (!apiUrl || !token || !number) {
        throw new Error("Parâmetros da Evolution API estão incompletos no cadastro.");
      }

      const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const url = `${baseUrl}/message/sendText/${number}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: recipientPhone,
          text: textMessageBody,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro na Evolution API (${res.status}): ${text}`);
      }

      const log = await prisma.whatsappLog.create({
        data: {
          tenantId,
          recipient: recipientPhone,
          message: textMessageBody,
          type,
          status: "SENT",
        },
      });

      return { success: true, status: "SENT", logId: log.id };
    }

    if (provider === "meta") {
      if (!token || !number) {
        throw new Error("Parâmetros do WhatsApp Cloud API (Meta) estão incompletos no cadastro.");
      }

      const url = `https://graph.facebook.com/v19.0/${number}/messages`;

      let body: any;

      if (type === "TEST" && overrideMessage) {
        // Envio de mensagem de texto simples
        body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "text",
          text: {
            body: textMessageBody,
          },
        };
      } else {
        // Envio de Template Oficial Meta
        // O campo do template no banco (ex: whatsappConfirmTemplate) salva o nome do template da Meta (ex: "booking_confirmation")
        const templateName = templateText.trim();
        const parameters = getMetaTemplateParameters(templateText, data);

        body = {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: parameters.map((val) => ({
                  type: "text",
                  text: val,
                })),
              },
            ],
          },
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const resJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = resJson?.error?.message || `Erro HTTP ${res.status}`;
        throw new Error(`Erro na Meta Cloud API: ${errMsg}`);
      }

      // Para Meta, salvamos o nome do template e parâmetros disparados no log
      const logMsg = type === "TEST" 
        ? textMessageBody 
        : `[TEMPLATE: ${templateText}] Parâmetros: ${getMetaTemplateParameters(templateText, data).join(", ")}`;

      const log = await prisma.whatsappLog.create({
        data: {
          tenantId,
          recipient: recipientPhone,
          message: logMsg,
          type,
          status: "SENT",
        },
      });

      return { success: true, status: "SENT", logId: log.id };
    }

    return { success: false, status: "FAILED", error: "Provedor de WhatsApp não suportado." };
  } catch (err: any) {
    console.error("Erro no sendWhatsappMessage:", err);

    // Tenta registrar a falha no log do banco
    try {
      await prisma.whatsappLog.create({
        data: {
          tenantId,
          recipient: recipient,
          message: `Falha no envio: ${err.message || "Erro desconhecido"}`,
          type,
          status: "FAILED",
        },
      });
    } catch (logErr) {
      console.error("Não foi possível salvar o log de erro no banco:", logErr);
    }

    return { success: false, status: "FAILED", error: err.message || "Erro desconhecido ao disparar WhatsApp." };
  }
}
