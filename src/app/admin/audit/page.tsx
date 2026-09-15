import { getAuditLogs } from "@/actions/audit";
import { getCurrentSession } from "@/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  BOOKING_CANCELLED: "Agendamento cancelado",
  BOOKING_DELETED: "Agendamento excluído",
  BOOKING_STATUS_UPDATED: "Status do agendamento atualizado",
  BOOKING_RESCHEDULED: "Agendamento reagendado",
  TENANT_SETTINGS_UPDATED: "Configurações atualizadas",
  WHATSAPP_SETTINGS_UPDATED: "Configurações do WhatsApp atualizadas",
  EMPLOYEE_CREATED: "Profissional criado",
  TENANT_CREATED: "Estabelecimento criado",
  TENANT_STATUS_UPDATED: "Status do estabelecimento atualizado",
  TENANT_FEATURES_UPDATED: "Recursos atualizados",
  TENANT_THEME_UPDATED: "Tema atualizado",
  TENANT_PLAN_ASSIGNED: "Plano atribuído",
};

export default async function AuditPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) {
    return <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">Acesso restrito a administradores.</p>;
  }

  const logs = await getAuditLogs();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <section className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico de atividades</h1>
        <p className="mt-1 text-sm text-gray-600">Últimas 100 ações administrativas e alterações de agendamentos.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => (
              <li key={log.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-gray-900">{labels[log.action] || log.action}</strong>
                  <time className="text-xs text-gray-500" dateTime={log.createdAt.toISOString()}>
                    {formatter.format(log.createdAt)}
                  </time>
                </div>
                <p className="text-xs text-gray-600">Origem: {log.actorRole} · Registro: {log.entityType}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
