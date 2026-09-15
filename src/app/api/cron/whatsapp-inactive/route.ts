import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { runInactiveClientRemindersJob } from "@/actions/whatsapp";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret");

    const expected = cronSecret ? Buffer.from(cronSecret) : null;
    const provided = providedSecret ? Buffer.from(providedSecret) : null;
    if (!expected || !provided || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

    // Executa a automação de inatividade para todos os estabelecimentos com a opção ativa
    const activeTenants = await prisma.tenant.findMany({
      where: {
        whatsappEnabled: true,
        whatsappInactiveEnabled: true
      },
      select: {
        id: true,
        name: true
      }
    });

    const results = [];
    for (const tenant of activeTenants) {
      const res = await runInactiveClientRemindersJob(tenant.id, cronSecret);
      results.push({ tenant: tenant.name, id: tenant.id, result: res });
    }

    return NextResponse.json({
      success: true,
      message: "Lembretes de inatividade processados com sucesso.",
      processedTenants: activeTenants.length,
      results
    });
  } catch (err) {
    console.error("Erro no cron de inatividade:", err);
    const errMessage = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
