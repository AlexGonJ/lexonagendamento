ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "servicePrice" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "serviceDuration" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Booking_tenantId_employeeId_date_idx" ON "Booking"("tenantId", "employeeId", "date");
CREATE INDEX IF NOT EXISTS "Booking_customerSubscriptionId_status_idx" ON "Booking"("customerSubscriptionId", "status");

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_resourceType_resourceId_status_key"
  ON "PaymentWebhookEvent"("provider", "resourceType", "resourceId", "status");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_tenantId_createdAt_idx"
  ON "PaymentWebhookEvent"("tenantId", "createdAt");
