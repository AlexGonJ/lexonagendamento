import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type AuditEvent = {
  tenantId?: string | null;
  actorId?: string | null;
  actorRole: "ADMIN" | "EMPLOYEE" | "CLIENT" | "SUPER_ADMIN" | "SYSTEM";
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAuditEvent(event: AuditEvent) {
  try {
    await prisma.auditLog.create({ data: event });
  } catch (error) {
    console.error("Não foi possível registrar evento de auditoria", {
      action: event.action,
      entityType: event.entityType,
      error,
    });
  }
}
