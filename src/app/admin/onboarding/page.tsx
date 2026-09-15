import Link from "next/link";
import { getOnboardingChecklist } from "@/actions/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { tenant, items, ready } = await getOnboardingChecklist();
  return <div className="mx-auto max-w-2xl space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Preparar estabelecimento</h1><p className="mt-1 text-sm text-gray-600">Conclua estas etapas antes de divulgar seu link de agendamento.</p></div>
    <section className={`rounded-xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-semibold text-gray-900">{ready ? "Pronto para receber reservas" : "Ainda há pendências"}</p><p className="mt-1 text-sm text-gray-700">Link público: <Link className="font-medium underline" href={`/${tenant.slug}/book`} target="_blank">/{tenant.slug}/book</Link></p></section>
    <ol className="space-y-3">{items.map((item) => <li key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"><span className="font-medium text-gray-800">{item.label}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.complete ? "Concluído" : "Pendente"}</span></li>)}</ol>
    <div className="flex flex-wrap gap-3"><Link href="/admin/settings" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Configurações</Link><Link href="/admin/services" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Serviços</Link><Link href="/admin/employees" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Profissionais</Link><Link href="/admin/whatsapp" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Mensagens</Link></div>
    <p className="text-sm text-gray-600">Precisa de ajuda? Use o canal de suporte informado na contratação antes de publicar o link.</p>
  </div>;
}
