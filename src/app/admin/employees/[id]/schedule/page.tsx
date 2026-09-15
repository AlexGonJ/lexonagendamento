import { getEmployeeSchedules, getEmployeeTimeOff, getEmployeeAvailabilityBlocks, addScheduleBlock, addEmployeeTimeOff, addEmployeeAvailabilityBlock, removeScheduleBlock, removeEmployeeTimeOff, removeEmployeeAvailabilityBlock } from "@/actions/schedule";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  const [schedules, timeOffDays, availabilityBlocks] = await Promise.all([getEmployeeSchedules(id), getEmployeeTimeOff(id), getEmployeeAvailabilityBlocks(id)]);

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
              Crie intervalos de horas de trabalho. Para pausas de almoço, crie dois blocos no mesmo dia (ex: 09:00 - 12:00 e 13:00 - 18:00).
            </p>
            
            <form action={addScheduleBlock} className="space-y-4">
              <input type="hidden" name="employeeId" value={id} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                <select 
                  name="dayOfWeek"
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                  <option value="0">Domingo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                  <input 
                    type="time" 
                    name="startTime" 
                    required 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    required 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
              >
                Salvar Bloco de Horário
              </button>
            </form>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Folga ou férias</h2>
            <p className="text-sm text-gray-500 mb-4">Bloqueia todos os horários deste profissional na data escolhida.</p>
            <form action={addEmployeeTimeOff} className="space-y-3"><input type="hidden" name="employeeId" value={id} /><input type="date" name="date" required className="w-full p-2 border border-gray-300 rounded-lg" /><input type="text" name="reason" placeholder="Motivo opcional" className="w-full p-2 border border-gray-300 rounded-lg" /><button type="submit" className="w-full bg-amber-600 text-white font-semibold py-2 rounded-lg">Bloquear data</button></form>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Bloqueio por período</h2>
            <p className="text-sm text-gray-500 mb-4">Use para almoço, consulta ou outro intervalo que não deve aparecer para reserva.</p>
            <form action={addEmployeeAvailabilityBlock} className="space-y-3"><input type="hidden" name="employeeId" value={id} /><input type="date" name="date" required className="w-full p-2 border border-gray-300 rounded-lg" /><div className="grid grid-cols-2 gap-3"><input type="time" name="startTime" required className="w-full p-2 border border-gray-300 rounded-lg" /><input type="time" name="endTime" required className="w-full p-2 border border-gray-300 rounded-lg" /></div><input type="text" name="reason" placeholder="Motivo opcional" className="w-full p-2 border border-gray-300 rounded-lg" /><button type="submit" className="w-full bg-amber-600 text-white font-semibold py-2 rounded-lg">Bloquear período</button></form>
          </div>
        </div>

        {/* Lista de Blocos Cadastrados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Horários Configurados</h2>
            
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-4"><h3 className="font-medium text-gray-800 mb-3">Folgas e férias</h3>{timeOffDays.length === 0 ? <p className="text-sm text-gray-500">Nenhuma indisponibilidade cadastrada.</p> : <div className="flex flex-wrap gap-2">{timeOffDays.map((item) => <div key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"><span>{item.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}{item.reason ? ` · ${item.reason}` : ""}</span><form action={async () => { "use server"; await removeEmployeeTimeOff(item.id, id); }}><button className="text-red-600 font-bold" title="Remover">×</button></form></div>)}</div>}</div>
              <div className="border-b border-gray-100 pb-4"><h3 className="font-medium text-gray-800 mb-3">Bloqueios por período</h3>{availabilityBlocks.length === 0 ? <p className="text-sm text-gray-500">Nenhum período bloqueado.</p> : <div className="flex flex-wrap gap-2">{availabilityBlocks.map((item) => <div key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"><span>{item.startAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {item.startAt.toISOString().slice(11, 16)}–{item.endAt.toISOString().slice(11, 16)}{item.reason ? ` · ${item.reason}` : ""}</span><form action={async () => { "use server"; await removeEmployeeAvailabilityBlock(item.id, id); }}><button className="text-red-600 font-bold" title="Remover">×</button></form></div>)}</div>}</div>
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
