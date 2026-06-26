import Link from 'next/link';
import { getCurrentSession, logout } from '@/actions/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Busca dados adicionais do profissional (como avatar e especialidade) direto do banco
  const employee = await prisma.employee.findUnique({
    where: { id: session.userId }
  });

  const avatar = employee?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.name)}&background=random`;
  const roleDisplay = employee?.role || (session.isAdmin ? "Administrador" : "Colaborador");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      {/* Sidebar (Menu Lateral) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full shadow-sm z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
            B
          </div>
          <span className="font-bold text-lg text-gray-800">Admin Panel</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link 
            href="/admin" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Dashboard
          </Link>
          
          {session.isAdmin && (
            <>
              <Link 
                href="/admin/services" 
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Serviços
              </Link>
              <Link 
                href="/admin/employees" 
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Profissionais
              </Link>
              <Link 
                href="/admin/settings" 
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Configurações
              </Link>
            </>
          )}

          <Link 
            href="/admin/bookings" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            {session.isAdmin ? "Agendamentos" : "Meus Agendamentos"}
          </Link>

          <Link 
            href="/admin/weekly-schedule" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Agenda Semanal
          </Link>

          {!session.isAdmin && (
            <Link 
              href={`/admin/employees/${session.userId}/schedule`}
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
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-end items-center mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.name}</p>
              <p className="text-xs text-gray-500">{roleDisplay}</p>
            </div>
            <img 
              src={avatar} 
              alt={session.name}
              className="w-10 h-10 rounded-full border border-gray-300 object-cover" 
            />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
