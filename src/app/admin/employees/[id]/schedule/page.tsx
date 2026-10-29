import { getEmployeeSchedules, getEmployeeTimeOff, getEmployeeAvailabilityBlocks, getEmployeeWeeklyAvailabilityBlocks, addEmployeeTimeOff, removeScheduleBlock, removeEmployeeTimeOff, removeEmployeeAvailabilityBlock, removeEmployeeWeeklyAvailabilityBlock } from "@/actions/schedule";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatScheduleDate, formatScheduleTime, type BookingTimeMode } from "@/lib/schedule-time";
import ScheduleBlockForm from "./ScheduleBlockForm";
import AvailabilityBlockForms from "./AvailabilityBlockForms";

const diasDaSemana = [
  "Domingo", "Segunda-feira", "Terça-feira", 
  "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
];

export default async function EmployeeSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  
  if (!employee) {
    notFound();
  }
  const tenantSchedule = await prisma.tenant.findUnique({ where: { id: employee.tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenantSchedule) notFound();
  const bookingTimeMode = tenantSchedule.bookingTimeMode as BookingTimeMode;

  const [schedules, timeOffDays, availabilityBlocks, weeklyAvailabilityBlocks] = await Promise.all([getEmployeeSchedules(id), getEmployeeTimeOff(id), getEmployeeAvailabilityBlocks(id), getEmployeeWeeklyAvailabilityBlocks(id)]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/employees" className="text-gray-500 hover:text-gray-900 transition-colors">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Agenda de {employee.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário para Adicionar Bloco de Horário */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Bloco</h2>
            <p className="text-sm text-gray-500 mb-4">
              Escolha horários de hora cheia e aplique o mesmo período a um dia, aos dias úteis ou à semana toda. Para pausas, salve dois períodos, como 09:00–12:00 e 13:00–18:00.
            </p>
            <ScheduleBlockForm employeeId={id} />
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Folga ou férias</h2>
            <p className="text-sm text-gray-500 mb-4">Bloqueia todos os horários deste profissional na data escolhida.</p>
            <form action={addEmployeeTimeOff} className="space-y-3"><input type="hidden" name="employeeId" value={id} /><input type="date" name="date" required className="w-full p-2 border border-gray-300 rounded-lg" /><input type="text" name="reason" placeholder="Motivo opcional" className="w-full p-2 border border-gray-300 rounded-lg" /><button type="submit" className="w-full bg-amber-600 text-white font-semibold py-2 rounded-lg">Bloquear data</button></form>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Bloqueio por período</h2>
            <p className="text-sm text-gray-500 mb-4">Bloqueie um período em uma data ou configure um intervalo de almoço recorrente.</p>
            <AvailabilityBlockForms employeeId={id} />
          </div>
        </div>

        {/* Lista de Blocos Cadastrados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Horários Configurados</h2>
            
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-4"><h3 className="font-medium text-gray-800 mb-3">Folgas e férias</h3>{timeOffDays.length === 0 ? <p className="text-sm text-gray-500">Nenhuma indisponibilidade cadastrada.</p> : <div className="flex flex-wrap gap-2">{timeOffDays.map((item) => <div key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"><span>{item.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}{item.reason ? ` · ${item.reason}` : ""}</span><form action={async () => { "use server"; await removeEmployeeTimeOff(item.id, id); }}><button className="text-red-600 font-bold" title="Remover">×</button></form></div>)}</div>}</div>
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-gray-800 mb-3">Bloqueios por período</h3>
                {availabilityBlocks.length === 0 && weeklyAvailabilityBlocks.length === 0 ? <p className="text-sm text-gray-500">Nenhum período bloqueado.</p> : <div className="flex flex-wrap gap-2">
                  {availabilityBlocks.map((item) => <div key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"><span>{formatScheduleDate(item.startAt, tenantSchedule.timezone, bookingTimeMode)} · {formatScheduleTime(item.startAt, tenantSchedule.timezone, bookingTimeMode)}–{formatScheduleTime(item.endAt, tenantSchedule.timezone, bookingTimeMode)}{item.reason ? ` · ${item.reason}` : ""}</span><form action={async () => { "use server"; await removeEmployeeAvailabilityBlock(item.id, id); }}><button type="submit" className="text-red-600 font-bold" title="Remover bloqueio" aria-label="Remover bloqueio">×</button></form></div>)}
                  {weeklyAvailabilityBlocks.map((item) => <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm"><span>Toda {diasDaSemana[item.dayOfWeek]} · {item.startTime}–{item.endTime}{item.reason ? ` · ${item.reason}` : ""}</span><form action={async () => { "use server"; await removeEmployeeWeeklyAvailabilityBlock(item.id, id); }}><button type="submit" className="text-red-600 font-bold" title="Remover horário recorrente" aria-label="Remover horário recorrente">×</button></form></div>)}
                </div>}
              </div>
              {diasDaSemana.map((nomeDia, index) => {
                // Filtra os blocos desse dia da semana
                const blocosDoDia = schedules.filter(s => s.dayOfWeek === index);
                
                if (blocosDoDia.length === 0) return null;

                return (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-medium text-gray-800 mb-3">{nomeDia}</h3>
                    <div className="flex flex-wrap gap-3">
                      {blocosDoDia.map(bloco => (
                        <div key={bloco.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium text-gray-700">
                            {bloco.startTime} - {bloco.endTime}
                          </span>
                          <form action={async () => {
                            "use server";
                            await removeScheduleBlock(bloco.id, id);
                          }}>
                            <button type="submit" className="text-red-500 hover:text-red-700 ml-2 font-bold text-lg leading-none" title="Remover bloco">
                              &times;
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {schedules.length === 0 && (
                <p className="text-gray-500 text-center py-8">Nenhum horário configurado ainda. Este profissional não aparecerá disponível para agendamentos.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
