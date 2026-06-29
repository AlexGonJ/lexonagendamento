import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runInactiveClientRemindersJob } from "@/actions/whatsapp";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
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
      const res = await runInactiveClientRemindersJob(tenant.id);
      results.push({ tenant: tenant.name, id: tenant.id, result: res });
    }

    return NextResponse.json({
      success: true,
      message: "Lembretes de inatividade processados com sucesso.",
      processedTenants: activeTenants.length,
      results
    });
  } catch (err: any) {
    console.error("Erro no cron de inatividade:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
