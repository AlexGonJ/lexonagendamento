CREATE TABLE "EmployeeWeeklyAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeWeeklyAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeWeeklyAvailabilityBlock_employeeId_dayOfWeek_idx"
ON "EmployeeWeeklyAvailabilityBlock"("employeeId", "dayOfWeek");

ALTER TABLE "EmployeeWeeklyAvailabilityBlock"
ADD CONSTRAINT "EmployeeWeeklyAvailabilityBlock_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
