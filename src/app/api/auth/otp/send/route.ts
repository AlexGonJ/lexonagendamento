import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    // Gerar código OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos de validade

    // Salvar OTP no banco
    await db.otpVerification.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    })

    // Simulando disparo de WhatsApp pela Meta API
    console.log(`[WHATSAPP OTP] Código enviado para ${phone}: ${code}`)

    // Retorna o código no modo de teste para facilitar o desenvolvimento local
    return NextResponse.json({ 
      success: true, 
      message: 'Código enviado via WhatsApp',
      code: process.env.NODE_ENV !== 'production' ? code : undefined 
    })
  } catch (error: any) {
    console.error('Erro ao enviar OTP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
