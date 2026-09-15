import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processWhatsappOutbox } from "@/lib/whatsapp-outbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");
  const expected = expectedSecret ? Buffer.from(expectedSecret) : null;
  const provided = providedSecret ? Buffer.from(providedSecret) : null;
  if (!expected || !provided || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }
  try {
    const result = await processWhatsappOutbox();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Erro ao processar fila de WhatsApp:", error);
    return NextResponse.json({ success: false, error: "Não foi possível processar a fila." }, { status: 500 });
  }
}
