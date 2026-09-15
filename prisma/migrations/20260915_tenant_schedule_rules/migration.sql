ALTER TABLE "Tenant" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE "Tenant" ADD COLUMN "minimumLeadMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "cancellationLeadMinutes" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "TenantHoliday" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "name" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TenantHoliday_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TenantHoliday_tenantId_date_key" ON "TenantHoliday"("tenantId", "date");
ALTER TABLE "TenantHoliday" ADD CONSTRAINT "TenantHoliday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
