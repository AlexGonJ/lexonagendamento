import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { phone, code, email, googleId, appleId, name } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código OTP são obrigatórios' }, { status: 400 })
    }

    // 1. Verificar o código OTP
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

    // Remover verificação usada
    await db.otpVerification.delete({
      where: { id: verification.id }
    })

    // 2. Buscar cliente por telefone
    let client = await db.client.findUnique({
      where: { phone }
    })

    if (client) {
      // Vincular os dados do Google/Apple ao cliente de telefone existente
      client = await db.client.update({
        where: { id: client.id },
        data: {
          email: email || client.email,
          googleId: googleId || client.googleId,
          appleId: appleId || client.appleId,
          name: name || client.name
        }
      })
    } else {
      // Se não existe, cria um novo cliente com todos os dados vinculados
      client = await db.client.create({
        data: {
          phone,
          name,
          email,
          googleId,
          appleId
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Conta vinculada ao telefone com sucesso!',
      client
    })
  } catch (error: any) {
    console.error('Erro ao vincular conta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
