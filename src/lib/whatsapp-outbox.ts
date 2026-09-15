import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";
import { SendWhatsappParams, sendWhatsappMessage } from "@/lib/whatsapp";

type QueueParams = SendWhatsappParams & { eventKey: string; bookingId?: string };

export async function enqueueWhatsappMessage(tx: Prisma.TransactionClient, params: QueueParams) {
  await tx.whatsappOutbox.upsert({
    where: { eventKey: params.eventKey },
    create: {
      tenantId: params.tenantId,
      eventKey: params.eventKey,
      type: params.type,
      recipient: params.recipient,
      bookingId: params.bookingId,
      payload: { data: params.data, overrideMessage: params.overrideMessage ?? null },
    },
    update: {},
  });
}

function parsePayload(payload: Prisma.JsonValue): Pick<SendWhatsappParams, "data" | "overrideMessage"> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = payload as { data?: SendWhatsappParams["data"]; overrideMessage?: string | null };
  return value.data ? { data: value.data, overrideMessage: value.overrideMessage || undefined } : null;
}

export async function processWhatsappOutbox(limit = 50) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
  const candidates = await prisma.whatsappOutbox.findMany({
    where: {
      OR: [
        { status: { in: ["PENDING", "RETRY"] }, nextAttemptAt: { lte: now } },
        { status: "PROCESSING", lockedAt: { lte: staleBefore } },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const claimed = await prisma.$transaction(async (tx) => {
      await acquireEmployeeDayLock(tx, `whatsapp-outbox:${candidate.id}`);
      const current = await tx.whatsappOutbox.findUnique({ where: { id: candidate.id } });
      if (!current || (current.status !== "PENDING" && current.status !== "RETRY" && !(current.status === "PROCESSING" && current.lockedAt && current.lockedAt <= staleBefore))) return null;
      return tx.whatsappOutbox.update({ where: { id: current.id }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
    });
    if (!claimed) continue;
    const payload = parsePayload(claimed.payload);
    if (!payload) {
      await prisma.whatsappOutbox.update({ where: { id: claimed.id }, data: { status: "FAILED", lastError: "Payload inválido", lockedAt: null } });
      failed++;
      continue;
    }
    const result = await sendWhatsappMessage({ tenantId: claimed.tenantId, recipient: claimed.recipient, type: claimed.type as SendWhatsappParams["type"], ...payload });
    if (result.success) {
      await prisma.$transaction([
        prisma.whatsappOutbox.update({ where: { id: claimed.id }, data: { status: "SENT", sentAt: new Date(), lockedAt: null, lastError: null, providerMessageId: result.providerMessageId } }),
        ...(claimed.bookingId ? [prisma.booking.updateMany({ where: { id: claimed.bookingId }, data: { whatsappReminderSent: true } })] : []),
      ]);
      sent++;
      continue;
    }
    const terminal = claimed.attempts >= 3;
    await prisma.whatsappOutbox.update({
      where: { id: claimed.id },
      data: terminal
        ? { status: "FAILED", lockedAt: null, lastError: result.error?.slice(0, 500) || "Falha de envio" }
        : { status: "RETRY", lockedAt: null, lastError: result.error?.slice(0, 500) || "Falha de envio", nextAttemptAt: new Date(Date.now() + 2 ** claimed.attempts * 60_000) },
    });
    if (terminal) failed++; else retried++;
  }
  return { processed: candidates.length, sent, retried, failed };
}

/** At-least-once worker: eventKey deduplicates enqueueing; provider timeouts can still yield duplicate external delivery. */
