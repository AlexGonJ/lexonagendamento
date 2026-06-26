import { getBookings, updateBookingStatus, deleteBooking } from "@/actions/booking";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    date?: string;
  }>;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "ALL";
  const date = params.date || "";

  const bookings = await getBookings({ search, status, date });

  // Formatting WhatsApp link helper
  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    // Add Brazil country code if not present (assuming 11 digits standard for cellphones)
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phoneWithCountry}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Agendamentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualização, filtragem e alteração de status de todos os agendamentos registrados.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Buscar Cliente
            </label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Nome ou WhatsApp..."
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Filtrar por Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Data Específica
            </label>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Filtrar
            </button>
            {(search || status !== "ALL" || date) && (
              <Link
                href="/admin/bookings"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2 px-4 rounded-lg transition-colors text-center flex items-center justify-center"
              >
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Agendamentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Cliente</th>
                <th className="p-4">Serviço</th>
                <th className="p-4">Profissional</th>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum agendamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const bDate = new Date(booking.date);
                  const day = bDate.getUTCDate().toString().padStart(2, "0");
                  const month = (bDate.getUTCMonth() + 1).toString().padStart(2, "0");
                  const year = bDate.getUTCFullYear();
                  const hours = bDate.getUTCHours().toString().padStart(2, "0");
                  const minutes = bDate.getUTCMinutes().toString().padStart(2, "0");
                  const formattedDate = `${day}/${month}/${year}`;
                  const formattedTime = `${hours}:${minutes}`;

                  // Status badge style
                  let statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-100";
                  let statusText = booking.status;
                  if (booking.status === "PENDING") {
                    statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    statusText = "Pendente";
                  } else if (booking.status === "CONFIRMED") {
                    statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    statusText = "Confirmado";
                  } else if (booking.status === "CANCELLED") {
                    statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                    statusText = "Cancelado";
                  }

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Cliente */}
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{booking.client.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500">{booking.client.phone}</span>
                          <a
                            href={getWhatsAppLink(booking.client.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-green-600 hover:text-green-700 hover:scale-105 transition-transform"
                            title="Conversar no WhatsApp"
                          >
                            <span className="text-xs font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1.5">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                              </svg>
                              Wpp
                            </span>
                          </a>
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{booking.service.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                          <span>R$ {booking.service.price.toFixed(2)}</span>
                          <span>•</span>
                          <span>{booking.service.duration} min</span>
                        </div>
                      </td>

                      {/* Profissional */}
                      <td className="p-4 text-gray-700 font-medium">
                        {booking.employee.name}
                      </td>

                      {/* Data / Hora */}
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{formattedDate}</div>
                        <div className="text-xs text-blue-600 font-semibold mt-0.5 bg-blue-50/60 inline-block px-1.5 py-0.5 rounded border border-blue-100">
                          {formattedTime}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold border rounded-full ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {booking.status === "PENDING" && (
                            <form
                              action={async () => {
                                "use server";
                                // Confirm booking
                                await updateBookingStatus(booking.id, "CONFIRMED");
                              }}
                            >
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Confirmar
                              </button>
                            </form>
                          )}
                          
                          {booking.status !== "CANCELLED" && (
                            <form
                              action={async () => {
                                "use server";
                                // Cancel booking
                                await updateBookingStatus(booking.id, "CANCELLED");
                              }}
                            >
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </form>
                          )}

                          <form
                            action={async () => {
                              "use server";
                              // Delete booking
                              await deleteBooking(booking.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
