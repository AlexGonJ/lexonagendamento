import { getDashboardStats } from "@/actions/booking";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    view?: string;
  }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = params.view || "daily";

  const { 
    bookingsCount, 
    revenue, 
    newClientsCount, 
    todayRevenue, 
    upcomingBookings,
    chartData,
    percentageChange
  } = await getDashboardStats(view);

  // Helper labels for ranges
  const rangeLabels = {
    daily: "Hoje",
    weekly: "Semana",
    monthly: "Mês"
  };

  const currentLabel = rangeLabels[view as keyof typeof rangeLabels] || "Hoje";

  return (
    <div className="space-y-6">
      {/* Top Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do desempenho do seu estabelecimento.</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-200/60 p-1 rounded-lg border border-gray-200">
          <Link
            href="/admin?view=daily"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "daily" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Diário
          </Link>
          <Link
            href="/admin?view=weekly"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "weekly" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Semanal
          </Link>
          <Link
            href="/admin?view=monthly"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "monthly" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Mensal
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Agendamentos ({currentLabel})
          </span>
          <span className="text-3xl font-bold text-gray-900">{bookingsCount}</span>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Faturamento ({currentLabel})
          </span>
          <span className="text-3xl font-bold text-gray-900">
            R$ {revenue.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Novos Clientes ({currentLabel})
          </span>
          <span className="text-3xl font-bold text-gray-900">{newClientsCount}</span>
        </div>
      </div>

      {/* Row: Upcoming Appointments & Monthly Revenue Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming appointments today */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Horários (Hoje)</h2>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-1">
            {upcomingBookings.length === 0 ? (
              <p className="text-gray-500 text-sm py-12 text-center">Nenhum agendamento para hoje.</p>
            ) : (
              upcomingBookings.map((booking) => {
                const bDate = new Date(booking.date);
                const hours = bDate.getUTCHours().toString().padStart(2, '0');
                const minutes = bDate.getUTCMinutes().toString().padStart(2, '0');
                const bookingTime = `${hours}:${minutes}`;

                let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                if (booking.status === "PENDING") {
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                } else if (booking.status === "CONFIRMED") {
                  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                }

                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{booking.client.name}</p>
                      <p className="text-sm text-gray-500">
                        {booking.service.name} — com {booking.employee.name}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${badgeColor}`}>
                        {booking.status === "PENDING" ? "Pendente" : booking.status === "CONFIRMED" ? "Confirmado" : booking.status}
                      </span>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-semibold text-sm rounded-full">
                        {bookingTime}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly Revenue Trend Card & Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-[400px] lg:h-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tendência de Faturamento</h2>
              <p className="text-xs text-gray-500 mt-0.5">Últimos 6 meses de faturamento mensal confirmado</p>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
              percentageChange >= 0 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}>
              {percentageChange >= 0 ? "▲" : "▼"} {Math.abs(percentageChange).toFixed(1)}% vs anterior
            </span>
          </div>

          {/* Stable Metric: Faturamento Hoje */}
          <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Faturamento Hoje</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                R$ {todayRevenue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <span className="text-2xl">💰</span>
          </div>

          {/* Premium CSS Chart */}
          <div className="flex-1 flex items-end justify-between gap-3 h-48 pt-6 pb-2 px-1 border-b border-gray-100">
            {chartData.map((d, idx) => {
              const maxRevenue = Math.max(...chartData.map(c => c.revenue), 1);
              const pctHeight = (d.revenue / maxRevenue) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none shadow-md z-30 whitespace-nowrap">
                    R$ {d.revenue.toFixed(2).replace('.', ',')}
                  </div>
                  
                  {/* Vertical Bar */}
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      idx === 5 
                        ? "bg-gradient-to-t from-blue-600 to-blue-500 shadow-sm" 
                        : "bg-slate-200 hover:bg-slate-300"
                    }`}
                    style={{ height: `${Math.max(pctHeight, 5)}%` }} // Force min height of 5% so it's visible even with 0 revenue
                  ></div>
                  
                  {/* Month Label */}
                  <span className="text-[10px] font-bold text-gray-500 mt-2 block whitespace-nowrap">
                    {d.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
