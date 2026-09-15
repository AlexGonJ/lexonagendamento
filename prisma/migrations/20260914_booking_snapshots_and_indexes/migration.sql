ALTER TABLE "Booking"
  ADD COLUMN "servicePrice" DOUBLE PRECISION,
  ADD COLUMN "serviceDuration" INTEGER,
  ADD COLUMN "commissionRate" DOUBLE PRECISION,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "Booking_tenantId_employeeId_date_idx" ON "Booking"("tenantId", "employeeId", "date");
CREATE INDEX "Booking_customerSubscriptionId_status_idx" ON "Booking"("customerSubscriptionId", "status");

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_resourceType_resourceId_status_key"
  ON "PaymentWebhookEvent"("provider", "resourceType", "resourceId", "status");
CREATE INDEX "PaymentWebhookEvent_tenantId_createdAt_idx"
  ON "PaymentWebhookEvent"("tenantId", "createdAt");
