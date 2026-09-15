ALTER TABLE "Employee" ADD COLUMN "accessRole" TEXT NOT NULL DEFAULT 'PROFESSIONAL';
ALTER TABLE "Receipt" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'RECEIPT', ADD COLUMN "recordedById" TEXT, ADD COLUMN "amountCents" INTEGER;
CREATE TABLE "CashSession" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "businessDate" TIMESTAMP(3) NOT NULL,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "openingCents" INTEGER NOT NULL,
  "countedCents" INTEGER,
  "expectedCents" INTEGER,
  "differenceCents" INTEGER,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "note" TEXT,
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CashSession_tenantId_businessDate_key" ON "CashSession"("tenantId", "businessDate");
CREATE INDEX "CashSession_tenantId_closedAt_idx" ON "CashSession"("tenantId", "closedAt");
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
