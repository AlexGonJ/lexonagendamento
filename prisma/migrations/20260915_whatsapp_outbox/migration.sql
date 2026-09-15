CREATE TABLE "WhatsappOutbox" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappOutbox_eventKey_key" ON "WhatsappOutbox"("eventKey");
CREATE INDEX "WhatsappOutbox_status_nextAttemptAt_idx" ON "WhatsappOutbox"("status", "nextAttemptAt");
CREATE INDEX "WhatsappOutbox_tenantId_createdAt_idx" ON "WhatsappOutbox"("tenantId", "createdAt");
ALTER TABLE "WhatsappOutbox" ADD CONSTRAINT "WhatsappOutbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
