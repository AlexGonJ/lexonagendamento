ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "Employee_tenantId_isActive_idx" ON "Employee"("tenantId", "isActive");
