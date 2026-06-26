// Available feature slugs for plan configuration
export const AVAILABLE_FEATURES = [
  { slug: "booking", label: "Agendamentos", description: "Funcionalidade core de agendamentos" },
  { slug: "multi_employee", label: "Multiplos Profissionais", description: "Suporte a varios profissionais" },
  { slug: "calendar_sync", label: "Google Calendar Sync", description: "Sincronizacao com Google Calendar" },
  { slug: "analytics", label: "Analytics Avancado", description: "Relatorios e estatisticas detalhadas" },
  { slug: "custom_branding", label: "Identidade Visual", description: "Logo e cores personalizadas" },
  { slug: "whatsapp_automation", label: "Automacao WhatsApp", description: "Mensagens automaticas via WhatsApp" },
  { slug: "payment_gateway", label: "Gateway de Pagamento", description: "Integracao com meios de pagamento" },
] as const;

export type FeatureSlug = typeof AVAILABLE_FEATURES[number]["slug"];