import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided) return false;
  const expectedValue = Buffer.from(expected);
  const providedValue = Buffer.from(provided);
  return expectedValue.length === providedValue.length && timingSafeEqual(expectedValue, providedValue);
}

/** Ends public booking access after the paid period; admin data remains available for regularization/export. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  const now = new Date();
  try {
    const expired = await prisma.tenantPlan.findMany({ where: { status: "ACTIVE", endDate: { lte: now } }, select: { id: true, tenantId: true } });
    if (expired.length === 0) return NextResponse.json({ success: true, expiredPlans: 0 });
    await prisma.$transaction(async (tx) => {
      await tx.tenantPlan.updateMany({ where: { id: { in: expired.map((plan) => plan.id) }, status: "ACTIVE" }, data: { status: "EXPIRED" } });
      for (const tenantId of [...new Set(expired.map((plan) => plan.tenantId))]) {
        const stillActive = await tx.tenantPlan.count({ where: { tenantId, status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gt: now } }] } });
        if (stillActive === 0) await tx.tenant.update({ where: { id: tenantId }, data: { isActive: false } });
      }
    });
    return NextResponse.json({ success: true, expiredPlans: expired.length });
  } catch (error) {
    console.error("Erro ao expirar assinaturas:", error);
    return NextResponse.json({ success: false, error: "Não foi possível processar assinaturas vencidas." }, { status: 500 });
  }
}
