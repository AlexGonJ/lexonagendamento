import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertRateLimit } from '@/lib/rate-limit'

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const { phone, code, name } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, "")

    const ip = getRequestIp(request)

    const phoneLimit = await assertRateLimit(`otp:verify:phone:${cleanPhone}`, {
      limit: 10,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    })
    const ipLimit = await assertRateLimit(`otp:verify:ip:${ip}`, {
      limit: 20,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    })

    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 })
    }

    // Buscar a verificação mais recente ativa para o telefone e código fornecidos
    const verification = await db.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
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
      where: { phone: cleanPhone }
    })

    if (!client) {
      if (!name) {
        return NextResponse.json({ error: 'Nome é obrigatório para o primeiro cadastro' }, { status: 400 })
      }
      client = await db.client.create({
        data: {
          phone: cleanPhone,
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
  } catch (error) {
    console.error('Erro ao verificar OTP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
