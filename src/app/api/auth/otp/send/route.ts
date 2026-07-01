import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertRateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const { phone, captchaToken } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    const ip = getRequestIp(request);

    const phoneLimit = await assertRateLimit(`otp:send:phone:${cleanPhone}`, {
      limit: 3,
      windowMs: 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    const ipLimit = await assertRateLimit(`otp:send:ip:${ip}`, {
      limit: 10,
      windowMs: 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json({ error: 'Muitas solicitações. Tente novamente em alguns minutos.' }, { status: 429 })
    }

    const captchaResult = await verifyTurnstileToken(captchaToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json({ error: captchaResult.error }, { status: 400 });
    }

    // Gerar código OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos de validade

    // Salvar OTP no banco
    await db.otpVerification.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt,
      },
    })

    // Simulando disparo de WhatsApp pela Meta API
    console.log(`[WHATSAPP OTP] Código enviado para ${cleanPhone}: ${code}`)

    // Retorna o código no modo de teste para facilitar o desenvolvimento local
    return NextResponse.json({ 
      success: true, 
      message: 'Código enviado via WhatsApp',
      code: process.env.NODE_ENV !== 'production' ? code : undefined 
    })
  } catch (error) {
    console.error('Erro ao enviar OTP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
