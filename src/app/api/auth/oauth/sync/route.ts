import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email, googleId, appleId, name } = await request.json()

    if (!email && !googleId && !appleId) {
      return NextResponse.json({ error: 'Identificadores OAuth ausentes' }, { status: 400 })
    }

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email

    // 1. Tentar encontrar cliente por googleId ou appleId
    let client = null
    if (googleId) {
      client = await db.client.findUnique({ where: { googleId } })
    } else if (appleId) {
      client = await db.client.findUnique({ where: { appleId } })
    }

    // 2. Se não encontrou por ID, tentar por email
    if (!client && normalizedEmail) {
      client = await db.client.findUnique({ where: { email: normalizedEmail } })
      
      // Se encontrou por email, associa o Google/Apple ID a este registro existente
      if (client) {
        client = await db.client.update({
          where: { id: client.id },
          data: {
            googleId: googleId || client.googleId,
            appleId: appleId || client.appleId,
          }
        })
      }
    }

    // 3. Se o cliente foi encontrado e tem telefone cadastrado, login completo!
    if (client && client.phone) {
      return NextResponse.json({
        success: true,
        linked: true,
        client
      })
    }

    // 4. Se encontrou o cliente mas não tem telefone, ou se é um novo registro, precisa vincular
    return NextResponse.json({
      success: true,
      linked: false,
      message: 'Vínculo de telefone necessário',
      oauthData: { email: normalizedEmail, googleId, appleId, name }
    })
  } catch (error) {
    console.error('Erro no sync OAuth:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
