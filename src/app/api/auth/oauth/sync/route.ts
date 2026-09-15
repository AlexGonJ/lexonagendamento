import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: 'Este endpoint foi desativado. Use o fluxo autenticado de login.' }, { status: 410 });
}
