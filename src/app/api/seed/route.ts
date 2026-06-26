import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function GET() {
  try {
    // Limpar dados anteriores para permitir execuções repetidas do seed
    await db.booking.deleteMany()
    await db.service.deleteMany()
    await db.employee.deleteMany()
    await db.client.deleteMany()
    await db.otpVerification.deleteMany()

    // 1. Criar ou obter o Tenant (Brutus Barbearia)
    const tenant = await db.tenant.upsert({
      where: { slug: 'brutusbarbearia' },
      update: {},
      create: {
        slug: 'brutusbarbearia',
        name: 'Brutus Barbearia',
        description: 'Um momento só seu ✩ ✩ ✩ ✩ ✩',
      }
    })

    // 2. Criar Serviços
    const servicesData = [
      { name: 'Corte de Cabelo', category: 'Cabelo', price: 50.0, duration: 30, description: 'Corte tradicional ou degradê moderno.' },
      { name: 'Barba Completa', category: 'Barba', price: 40.0, duration: 30, description: 'Barboterapia com toalha quente.' },
      { name: 'Combo Cabelo + Barba', category: 'Combos', price: 80.0, duration: 60, description: 'O serviço completo para dar aquele trato.' },
      { name: 'Furinho de Bebê', category: 'Produtos', price: 170.0, duration: 40, description: 'Primeiro brinquinho com aplicador silencioso.' },
      { name: 'Furo bebê', category: 'Serviços', price: 170.0, duration: 45, description: 'Aplicação de brinquinho em bebês com todo carinho.' },
    ]

    for (const s of servicesData) {
      await db.service.create({
        data: {
          name: s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          description: s.description,
          tenantId: tenant.id
        }
      })
    }

    // 3. Criar Funcionários com login e senha
    const employeesData = [
      { name: 'João Dono', role: 'Administrador', email: 'admin@brutus.com', password: 'admin123', isAdmin: true },
      { name: 'Breno Meira', role: 'Barbeiro', email: 'breno@brutus.com', password: 'breno123', isAdmin: false },
      { name: 'Gabriel', role: 'Barbeiro', email: 'gabriel@brutus.com', password: 'gabriel123', isAdmin: false },
      { name: 'Géssica Sousa', role: 'Maquiagem e penteados', email: 'gessica@brutus.com', password: 'gessica123', isAdmin: false },
      { name: 'Nathália Bié', role: 'Enfermeira especialista em piercing', email: 'nathalia@brutus.com', password: 'nathalia123', isAdmin: false },
    ]

    const employees: any[] = []
    for (const emp of employeesData) {
      const dbEmp = await db.employee.create({
        data: {
          name: emp.name,
          role: emp.role,
          email: emp.email,
          passwordHash: hashPassword(emp.password),
          isAdmin: emp.isAdmin,
          tenantId: tenant.id
        }
      })
      employees.push(dbEmp)
    }

    // 4. Buscar serviços recém criados para associar aos agendamentos
    const dbServices = await db.service.findMany({
      where: { tenantId: tenant.id }
    })

    const svcHair = dbServices.find(s => s.name === 'Corte de Cabelo') || dbServices[0]
    const svcCombo = dbServices.find(s => s.name === 'Combo Cabelo + Barba') || dbServices[0]
    const svcBarber = dbServices.find(s => s.name === 'Barba Completa') || dbServices[1]
    const svcBaby = dbServices.find(s => s.name === 'Furo bebê' || s.name === 'Furinho de Bebê') || dbServices[2]

    // 5. Criar Clientes
    const clientsData = [
      { name: 'Carlos Silva', phone: '11999999999' },
      { name: 'André Mendes', phone: '11988888888' },
      { name: 'Mariana Souza', phone: '11977777777' },
      { name: 'Felipe Ramos', phone: '11966666666' }
    ]

    const clients: any[] = []
    for (const c of clientsData) {
      const dbClient = await db.client.create({
        data: {
          name: c.name,
          phone: c.phone
        }
      })
      clients.push(dbClient)
    }

    // 6. Gerar datas em fuso horário de SP (America/Sao_Paulo)
    const getSpDateStr = (offsetDays: number) => {
      const date = new Date()
      date.setDate(date.getDate() + offsetDays)
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
    }

    const yesterdayStr = getSpDateStr(-1)
    const todayStr = getSpDateStr(0)
    const tomorrowStr = getSpDateStr(1)

    // 7. Criar Agendamentos (Ontem, Hoje, Amanhã)
    const bookingsData = [
      // Ontem
      {
        date: new Date(`${yesterdayStr}T15:00:00.000Z`),
        status: 'CONFIRMED',
        serviceId: svcHair.id,
        employeeId: employees.find(e => e.name === 'Breno Meira')?.id || employees[0].id,
        clientId: clients.find(c => c.name === 'Carlos Silva')?.id || clients[0].id,
        notes: 'Corte degradê normal'
      },
      // Hoje (Confirmados, faturamento hoje)
      {
        date: new Date(`${todayStr}T10:00:00.000Z`),
        status: 'CONFIRMED',
        serviceId: svcBarber.id,
        employeeId: employees.find(e => e.name === 'Gabriel')?.id || employees[1].id,
        clientId: clients.find(c => c.name === 'André Mendes')?.id || clients[1].id,
        notes: 'Aparar barba e toalha quente'
      },
      {
        date: new Date(`${todayStr}T14:30:00.000Z`),
        status: 'CONFIRMED',
        serviceId: svcCombo.id,
        employeeId: employees.find(e => e.name === 'Breno Meira')?.id || employees[0].id,
        clientId: clients.find(c => c.name === 'Carlos Silva')?.id || clients[0].id,
        notes: 'Cabelo e barba completos'
      },
      // Hoje (Pendente)
      {
        date: new Date(`${todayStr}T16:00:00.000Z`),
        status: 'PENDING',
        serviceId: svcBaby.id,
        employeeId: employees.find(e => e.name === 'Nathália Bié')?.id || employees[3].id,
        clientId: clients.find(c => c.name === 'Mariana Souza')?.id || clients[2].id,
        notes: 'Primeiro brinco'
      },
      // Hoje (Cancelado)
      {
        date: new Date(`${todayStr}T18:00:00.000Z`),
        status: 'CANCELLED',
        serviceId: svcHair.id,
        employeeId: employees.find(e => e.name === 'Gabriel')?.id || employees[1].id,
        clientId: clients.find(c => c.name === 'Felipe Ramos')?.id || clients[3].id,
        notes: 'Cliente desistiu'
      },
      // Amanhã
      {
        date: new Date(`${tomorrowStr}T09:30:00.000Z`),
        status: 'CONFIRMED',
        serviceId: svcHair.id,
        employeeId: employees.find(e => e.name === 'Breno Meira')?.id || employees[0].id,
        clientId: clients.find(c => c.name === 'André Mendes')?.id || clients[1].id
      },
      {
        date: new Date(`${tomorrowStr}T14:00:00.000Z`),
        status: 'CONFIRMED',
        serviceId: svcCombo.id,
        employeeId: employees.find(e => e.name === 'Gabriel')?.id || employees[1].id,
        clientId: clients.find(c => c.name === 'Felipe Ramos')?.id || clients[3].id
      }
    ]

    for (const b of bookingsData) {
      await db.booking.create({
        data: {
          date: b.date,
          status: b.status,
          tenantId: tenant.id,
          serviceId: b.serviceId,
          employeeId: b.employeeId,
          clientId: b.clientId,
          notes: b.notes
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Banco de dados da Brutus Barbearia semeado com sucesso com agendamentos de teste!',
      tenantId: tenant.id
    })
  } catch (error: any) {
    console.error('Erro ao semear banco:', error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}
