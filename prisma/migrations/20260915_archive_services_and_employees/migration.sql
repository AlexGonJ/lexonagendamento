ALTER TABLE "Service" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");
CREATE INDEX "Employee_tenantId_isActive_idx" ON "Employee"("tenantId", "isActive");
