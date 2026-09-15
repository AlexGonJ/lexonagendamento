import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { publicEmployeeSelect } from '@/lib/public-data'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params

    const tenant = await db.tenant.findUnique({
      where: { slug }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })
    }

    const employees = await db.employee.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { name: 'asc' },
      select: publicEmployeeSelect,
    })

    return NextResponse.json({ success: true, employees })
  } catch (error) {
    console.error('Erro ao buscar colaboradores:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
