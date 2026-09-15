import { Prisma } from "@prisma/client";

type Executor = Prisma.TransactionClient;

export async function debitSubscriptionCredit(
  tx: Executor,
  subscriptionId: string,
  bookingId: string,
  where: Prisma.CustomerSubscriptionWhereInput
) {
  const debit = await tx.customerSubscription.updateMany({
    where: { ...where, id: subscriptionId, remainingSlots: { gt: 0 } },
    data: { remainingSlots: { decrement: 1 } },
  });
  if (debit.count !== 1) throw new Error("A assinatura não possui mais créditos disponíveis.");
  await tx.creditLedgerEntry.create({
    data: { customerSubscriptionId: subscriptionId, bookingId, eventKey: `booking:${bookingId}:debit`, delta: -1, reason: "BOOKING_CREATED" },
  });
}

export async function refundSubscriptionCredit(tx: Executor, subscriptionId: string, bookingId: string) {
  await tx.creditLedgerEntry.create({
    data: { customerSubscriptionId: subscriptionId, bookingId, eventKey: `booking:${bookingId}:refund`, delta: 1, reason: "BOOKING_CANCELLED" },
  });
  await tx.customerSubscription.update({ where: { id: subscriptionId }, data: { remainingSlots: { increment: 1 } } });
}
