"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";

export async function getAuditLogs(limit = 100) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  return prisma.auditLog.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      actorId: true,
      actorRole: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });
}
