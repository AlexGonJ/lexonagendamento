import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { phone, code, name } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
    }

    // Buscar a verificação mais recente ativa para o telefone e código fornecidos
    const verification = await db.otpVerification.findFirst({
      where: {
        phone,
        code,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!verification) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 })
    }

    // Remover a verificação para que não seja reutilizada
    await db.otpVerification.delete({
      where: { id: verification.id }
    })

    // Buscar ou criar o cliente no banco de dados
    let client = await db.client.findUnique({
      where: { phone }
    })

    if (!client) {
      if (!name) {
        return NextResponse.json({ error: 'Nome é obrigatório para o primeiro cadastro' }, { status: 400 })
      }
      client = await db.client.create({
        data: {
          phone,
          name
        }
      })
    } else if (name) {
      // Atualizar o nome se fornecido
      client = await db.client.update({
        where: { id: client.id },
        data: { name }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticação bem-sucedida',
      client
    })
  } catch (error: any) {
    console.error('Erro ao verificar OTP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
