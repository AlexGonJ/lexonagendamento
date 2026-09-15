ALTER TABLE "Tenant" ADD COLUMN "bookingTimeMode" TEXT NOT NULL DEFAULT 'LEGACY_UTC_WALL';
ALTER TABLE "Tenant" ADD COLUMN "bookingTimezoneMigratedAt" TIMESTAMP(3);

CREATE TABLE "EmployeeAvailabilityBlock" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeAvailabilityBlock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmployeeAvailabilityBlock_employeeId_startAt_endAt_idx" ON "EmployeeAvailabilityBlock"("employeeId", "startAt", "endAt");
ALTER TABLE "EmployeeAvailabilityBlock" ADD CONSTRAINT "EmployeeAvailabilityBlock_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
