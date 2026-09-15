import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint desativado. Use o fluxo autenticado de login." },
    { status: 410 }
  );
}
