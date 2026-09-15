CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "bookingId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Receipt_tenantId_receivedAt_idx" ON "Receipt"("tenantId", "receivedAt");
CREATE INDEX "Receipt_bookingId_idx" ON "Receipt"("bookingId");
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
