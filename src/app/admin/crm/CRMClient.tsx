"use client";

import { useState } from "react";
import { Search, Calendar, Phone, Mail, Award, Clock } from "lucide-react";

interface Booking {
  id: string;
  date: string;
  status: string;
  service: { name: string; price: number };
  employee: { name: string };
}

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  bookings: Booking[];
  customerSubscriptions: {
    id: string;
    remainingSlots: number;
    endDate: string;
    plan: { name: string; slots: number };
  }[];
}

interface CRMClientProps {
  clients: ClientData[];
}

export default function CRMClient({ clients }: CRMClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtrar clientes
  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      client.phone.includes(term) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  });

  const formatDateBR = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTimeBR = (dateStr: string) => {
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${dateFormatted} às ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM de Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie o relacionamento, histórico e planos de seus clientes.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, celular ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-sm"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-700">Cliente</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Contato</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Plano Ativo</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center">Atendimentos</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Última Visita</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const lastBooking = client.bookings[0];
                  const activeSub = client.customerSubscriptions[0];

                  return (
                    <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{client.name}</p>
                            <p className="text-xs text-gray-400">Cliente desde {formatDateBR(client.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" /> {client.phone}</span>
                          {client.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={12} /> {client.email}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {activeSub ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <Award size={12} /> {activeSub.plan.name} ({activeSub.remainingSlots}/{activeSub.plan.slots})
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Nenhum</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-700 text-center font-semibold">
                        {client.bookings.length}
                      </td>
                      <td className="p-4 text-sm text-gray-700">
                        {lastBooking ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
                            {formatDateBR(lastBooking.date)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Sem registros</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setIsDrawerOpen(true);
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                        >
                          Ver Agendamentos
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Slide-over Drawer for Booking History */}
      {isDrawerOpen && selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-xl flex flex-col h-full animate-slide-in">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{selectedClient.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedClient.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Active Subscriptions Summary */}
                {selectedClient.customerSubscriptions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assinatura de Plano</h4>
                    {selectedClient.customerSubscriptions.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-emerald-800 text-sm">{sub.plan.name}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Expira em {formatDateBR(sub.endDate)}</p>
                        </div>
                        <div className="bg-emerald-100 px-2.5 py-1 rounded-lg text-emerald-800 text-xs font-bold text-center">
                          {sub.remainingSlots} / {sub.plan.slots}
                          <span className="block text-[8px] font-medium uppercase mt-0.5">Créditos</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* History List */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Histórico de Agendamentos</h4>
                  <div className="space-y-4">
                    {selectedClient.bookings.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">Nenhum agendamento registrado.</p>
                    ) : (
                      selectedClient.bookings.map((booking) => {
                        let statusColor = "bg-blue-50 text-blue-700 border-blue-100";
                        if (booking.status === "PENDING") {
                          statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                        } else if (booking.status === "CONFIRMED") {
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                        } else if (booking.status === "CANCELLED") {
                          statusColor = "bg-red-50 text-red-700 border-red-100";
                        }

                        return (
                          <div key={booking.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 flex flex-col gap-2 hover:bg-gray-100/50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{booking.service.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">com {booking.employee.name}</p>
                              </div>
                              <span className="font-bold text-sm text-gray-900">
                                R$ {booking.service.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1 pt-2 border-t border-gray-100">
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock size={12} />
                                {formatDateTimeBR(booking.date)}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${statusColor}`}>
                                {booking.status === "PENDING"
                                  ? "Pendente"
                                  : booking.status === "CONFIRMED"
                                  ? "Confirmado"
                                  : booking.status === "CANCELLED"
                                  ? "Cancelado"
                                  : booking.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
