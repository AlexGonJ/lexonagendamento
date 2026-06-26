import { getCurrentSession } from '@/actions/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminLayoutClient from './AdminLayoutClient';

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
    <AdminLayoutClient 
      session={session} 
      avatar={avatar} 
      roleDisplay={roleDisplay}
    >
      {children}
    </AdminLayoutClient>
  );
}
