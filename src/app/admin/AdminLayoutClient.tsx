"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { logout } from '@/actions/auth';

import { SessionData } from '@/actions/auth';

export default function AdminLayoutClient({
  session,
  avatar,
  roleDisplay,
  children
}: {
  session: SessionData;
  avatar: string;
  roleDisplay: string;
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Menu Lateral) */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-lg text-gray-800">Admin Panel</span>
          </div>
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link 
            href="/admin" 
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Dashboard
          </Link>
          
          {session.isAdmin && (
            <>
              <Link 
                href="/admin/services" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Serviços
              </Link>
              <Link 
                href="/admin/employees" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Profissionais
              </Link>
              <Link 
                href="/admin/settings" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Configurações
              </Link>
              <Link 
                href="/admin/whatsapp" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Integração WhatsApp
              </Link>
              <Link 
                href="/admin/crm" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                CRM Clientes
              </Link>
              <Link 
                href="/admin/financial" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Gerenciamento Financeiro
              </Link>
              <Link 
                href="/admin/plans" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Planos de Clientes
              </Link>
            </>
          )}

          <Link 
            href="/admin/bookings" 
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            {session.isAdmin ? "Agendamentos" : "Meus Agendamentos"}
          </Link>

          <Link 
            href="/admin/weekly-schedule" 
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Agenda Semanal
          </Link>

          {!session.isAdmin && (
            <Link 
              href={`/admin/employees/${session.userId}/schedule`}
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Minha Agenda (Horários)
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <form action={logout}>
            <button 
              type="submit"
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
            >
              Sair (Logout)
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 lg:h-screen lg:overflow-auto">
        <header className="flex justify-between lg:justify-end items-center p-4 lg:p-8 lg:pb-4 border-b border-gray-200 bg-white lg:bg-transparent">
          <button 
            className="lg:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{session.name}</p>
              <p className="text-xs text-gray-500">{roleDisplay}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={avatar} 
              alt={session.name}
              className="w-10 h-10 rounded-full border border-gray-300 object-cover" 
            />
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
