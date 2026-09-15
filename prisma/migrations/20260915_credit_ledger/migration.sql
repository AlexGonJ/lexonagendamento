CREATE TABLE "CreditLedgerEntry" (
  "id" TEXT NOT NULL,
  "customerSubscriptionId" TEXT NOT NULL,
  "bookingId" TEXT,
  "eventKey" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditLedgerEntry_eventKey_key" ON "CreditLedgerEntry"("eventKey");
CREATE INDEX "CreditLedgerEntry_customerSubscriptionId_createdAt_idx" ON "CreditLedgerEntry"("customerSubscriptionId", "createdAt");
CREATE INDEX "CreditLedgerEntry_bookingId_idx" ON "CreditLedgerEntry"("bookingId");
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_customerSubscriptionId_fkey" FOREIGN KEY ("customerSubscriptionId") REFERENCES "CustomerSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
