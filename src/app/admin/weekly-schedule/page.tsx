import { getCurrentSession } from "@/actions/auth";
import { getEmployees } from "@/actions/employees";
import { updateBookingStatus, deleteBooking } from "@/actions/booking";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    employeeId?: string;
    weekOffset?: string;
    bookingId?: string;
  }>;
}

export default async function WeeklySchedulePage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const weekOffset = parseInt(params.weekOffset || "0") || 0;
  const bookingId = params.bookingId;

  // Obter funcionários para o seletor (se for admin)
  const employees = await getEmployees();
  
  // Determinar qual profissional visualizar
  let selectedEmployeeId = session.userId;
  if (session.isAdmin) {
    selectedEmployeeId = params.employeeId || employees[0]?.id || session.userId;
  }

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || 
    (selectedEmployeeId === session.userId ? { name: session.name } : null);

  // 1. Configurar datas da semana de trabalho (Segunda a Domingo)
  const now = new Date();
  const dateInBr = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const [day, month, year] = dateInBr.split("/");
  
  const todayMidday = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  const currentDayOfWeek = todayMidday.getUTCDay(); // 0 = Dom, 1 = Seg...
  const dayOffsetToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(todayMidday);
  monday.setUTCDate(todayMidday.getUTCDate() + dayOffsetToMonday + (weekOffset * 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const name = dayNames[d.getUTCDay()];
    
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit"
    }).format(d);
    
    const y = d.getUTCFullYear();
    const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const dayStr = d.getUTCDate().toString().padStart(2, "0");
    const dateStr = `${y}-${m}-${dayStr}`;
    
    return { name, dateStr, formattedDate };
  });

  const startOfWeek = new Date(`${weekDays[0].dateStr}T00:00:00.000Z`);
  const endOfWeek = new Date(`${weekDays[6].dateStr}T23:59:59.999Z`);

  // 2. Buscar agendamentos do funcionário selecionado para esta semana
  const bookings = selectedEmployeeId 
    ? await prisma.booking.findMany({
        where: {
          employeeId: selectedEmployeeId,
          tenantId: session.tenantId,
          date: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        },
        include: {
          service: true,
          client: true
        }
      })
    : [];

  const selectedBooking = bookingId 
    ? bookings.find(b => b.id === bookingId)
    : null;

  // Configuração de horários da agenda (08:00 às 20:00)
  const START_HOUR = 8;
  const END_HOUR = 20;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;
  
  const hoursArray = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Helpers para posicionamento absoluto
  const calculatePosition = (date: Date, duration: number) => {
    const bDate = new Date(date);
    const bMinutes = bDate.getUTCHours() * 60 + bDate.getUTCMinutes();
    const startMinutesLimit = START_HOUR * 60;
    
    // Minutos desde o início da agenda
    const relativeMinutes = bMinutes - startMinutesLimit;
    
    const top = (relativeMinutes / TOTAL_MINUTES) * 100;
    const height = (duration / TOTAL_MINUTES) * 100;
    
    return {
      top: `${Math.max(0, Math.min(top, 100))}%`,
      height: `${Math.max(8, Math.min(height, 100 - top))}%` // mínimo de 8% de altura para não esmagar textos
    };
  };

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phoneWithCountry}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda Semanal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualização de horários ocupados no estilo calendário semanal para {selectedEmployee?.name}.
          </p>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/weekly-schedule?weekOffset=${weekOffset - 1}${session.isAdmin ? `&employeeId=${selectedEmployeeId}` : ""}`}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors font-medium text-sm"
          >
            ← Anterior
          </Link>
          <Link
            href={`/admin/weekly-schedule?weekOffset=0${session.isAdmin ? `&employeeId=${selectedEmployeeId}` : ""}`}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors font-medium text-sm"
          >
            Hoje
          </Link>
          <Link
            href={`/admin/weekly-schedule?weekOffset=${weekOffset + 1}${session.isAdmin ? `&employeeId=${selectedEmployeeId}` : ""}`}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors font-medium text-sm"
          >
            Próxima →
          </Link>
        </div>
      </div>

      {/* Seletor de Funcionário (Apenas Admin da Loja vê) */}
      {session.isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Visualizar Profissional:</label>
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="weekOffset" value={weekOffset} />
            <select
              name="employeeId"
              defaultValue={selectedEmployeeId}
              className="p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 cursor-pointer font-medium"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Filtrar
            </button>
          </form>
        </div>
      )}

      {/* Calendário Semanal Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 md:p-6">
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[768px] flex flex-col">
            <div className="grid grid-cols-8 border-b border-gray-100 pb-4 text-center">
          {/* Espaço em branco para a coluna de horas */}
          <div className="text-left font-semibold text-xs text-gray-400 uppercase tracking-wider p-2 flex items-end">
            Horas
          </div>
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-2 flex flex-col items-center">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {day.name.slice(0, 3)}
              </span>
              <span className="text-lg font-bold text-gray-800 mt-0.5">
                {day.formattedDate}
              </span>
            </div>
          ))}
        </div>

        {/* Grid de Conteúdo */}
        <div className="grid grid-cols-8 relative select-none" style={{ height: "650px" }}>
          {/* Coluna de Horários (Marcadores no eixo Y) */}
          <div className="relative h-full text-right pr-4 text-xs font-semibold text-gray-400 flex flex-col justify-between py-1">
            {hoursArray.map((hour) => (
              <div key={hour} className="h-6 flex items-center justify-end">
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Colunas dos Dias */}
          {weekDays.map((dayInfo, colIdx) => {
            const dayBookings = bookings.filter((b) => {
              const bDateStr = new Date(b.date).toISOString().split("T")[0];
              return bDateStr === dayInfo.dateStr;
            });

            return (
              <div
                key={colIdx}
                className="relative h-full border-l border-gray-100 group"
              >
                {/* Linhas horizontais de fundo para indicar as horas */}
                {hoursArray.slice(0, -1).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-b border-dashed border-gray-100"
                    style={{ top: `${(idx / TOTAL_HOURS) * 100}%`, height: `${100 / TOTAL_HOURS}%` }}
                  ></div>
                ))}

                {/* Agendamentos do Dia */}
                {dayBookings.map((booking) => {
                  const pos = calculatePosition(booking.date, booking.service.duration);
                  const bDate = new Date(booking.date);
                  const timeStr = `${bDate.getUTCHours().toString().padStart(2, "0")}:${bDate.getUTCMinutes().toString().padStart(2, "0")}`;

                  let bgClass = "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800";
                  if (booking.status === "PENDING") {
                    bgClass = "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800";
                  } else if (booking.status === "CONFIRMED") {
                    bgClass = "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800";
                  } else if (booking.status === "CANCELLED") {
                    bgClass = "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 line-through opacity-70";
                  }

                  return (
                    <Link
                      key={booking.id}
                      href={`/admin/weekly-schedule?weekOffset=${weekOffset}&employeeId=${selectedEmployeeId}&bookingId=${booking.id}`}
                      className={`absolute left-1 right-1 p-2 rounded-lg border text-xs leading-snug flex flex-col justify-between shadow-sm cursor-pointer select-none overflow-hidden transition-all duration-150 z-10 ${bgClass} hover:scale-[1.02] hover:shadow-md`}
                      style={{ top: pos.top, height: pos.height }}
                    >
                      <div>
                        <div className="font-semibold truncate">
                          {timeStr} - {booking.service.name}
                        </div>
                        <div className="font-medium truncate opacity-90 mt-0.5">
                          {booking.client.name}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 font-semibold truncate mt-auto border-t border-gray-200/40 pt-0.5">
                        Clique para info
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Agendamento */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Detalhes do Agendamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Profissional: {selectedEmployee?.name}
                </p>
              </div>
              <Link
                href={`/admin/weekly-schedule?weekOffset=${weekOffset}${session.isAdmin ? `&employeeId=${selectedEmployeeId}` : ""}`}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-colors"
                title="Fechar"
              >
                ✕
              </Link>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status atual</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedBooking.status === "PENDING"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : selectedBooking.status === "CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {selectedBooking.status === "PENDING"
                    ? "Pendente de Confirmação"
                    : selectedBooking.status === "CONFIRMED"
                    ? "Confirmado"
                    : "Cancelado"}
                </span>
              </div>

              {/* Data & Hora */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</span>
                  <span className="font-semibold text-gray-800">
                    {(() => {
                      const d = new Date(selectedBooking.date);
                      return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}/${d.getUTCFullYear()}`;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Horário</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-sm inline-block">
                    {(() => {
                      const d = new Date(selectedBooking.date);
                      return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Serviço */}
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Serviço Contratado</span>
                <p className="font-bold text-gray-900 text-base">{selectedBooking.service.name}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500 font-medium">
                  <span>Preço: R$ {selectedBooking.service.price.toFixed(2)}</span>
                  <span>•</span>
                  <span>Duração: {selectedBooking.service.duration} minutos</span>
                </div>
              </div>

              {/* Cliente */}
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Informações do Cliente</span>
                <p className="font-semibold text-gray-900">{selectedBooking.client.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>WhatsApp: {selectedBooking.client.phone}</span>
                  <a
                    href={getWhatsAppLink(selectedBooking.client.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200 font-semibold"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    Wpp
                  </a>
                </div>
              </div>

              {/* Observações */}
              {selectedBooking.notes && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Observações do Cliente</span>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-700 italic">
                    "{selectedBooking.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-100">
              {selectedBooking.status === "PENDING" && (
                <form
                  action={async () => {
                    "use server";
                    await updateBookingStatus(selectedBooking.id, "CONFIRMED");
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Confirmar Presença
                  </button>
                </form>
              )}

              {selectedBooking.status !== "CANCELLED" && (
                <form
                  action={async () => {
                    "use server";
                    await updateBookingStatus(selectedBooking.id, "CANCELLED");
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar Horário
                  </button>
                </form>
              )}

              <form
                action={async () => {
                  "use server";
                  await deleteBooking(selectedBooking.id);
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Excluir Registro
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
