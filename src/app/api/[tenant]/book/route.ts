import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params
    const { clientId, serviceId, employeeId, date, notes } = await request.json()

    if (!clientId || !serviceId || !employeeId || !date) {
      return NextResponse.json({ error: 'Dados incompletos para o agendamento' }, { status: 400 })
    }

    const tenant = await db.tenant.findUnique({
      where: { slug }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })
    }

    // Criar o agendamento
    const booking = await db.booking.create({
      data: {
        date: new Date(date),
        notes,
        tenantId: tenant.id,
        serviceId,
        employeeId,
        clientId,
        status: 'CONFIRMED'
      },
      include: {
        service: true,
        employee: true
      }
    })

    // Simulação do disparo do alerta de confirmação de WhatsApp
    console.log(`[WHATSAPP NOTIFICATION] Enviado alerta de confirmação para o agendamento do cliente ${clientId} no serviço ${booking.service.name} no dia ${booking.date}`)

    return NextResponse.json({
      success: true,
      message: 'Agendamento realizado com sucesso!',
      booking
    })
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
