ALTER TABLE "TenantPlan" ADD COLUMN "billingPeriod" TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE "TenantPlan" ADD COLUMN "providerResourceId" TEXT;
ALTER TABLE "TenantPlan" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantPlan" ADD COLUMN "cancelledAt" TIMESTAMP(3);
CREATE INDEX "TenantPlan_tenantId_status_endDate_idx" ON "TenantPlan"("tenantId", "status", "endDate");
