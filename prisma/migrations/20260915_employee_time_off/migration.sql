CREATE TABLE "EmployeeTimeOff" ("id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EmployeeTimeOff_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "EmployeeTimeOff_employeeId_date_key" ON "EmployeeTimeOff"("employeeId", "date");
CREATE INDEX "EmployeeTimeOff_date_idx" ON "EmployeeTimeOff"("date");
ALTER TABLE "EmployeeTimeOff" ADD CONSTRAINT "EmployeeTimeOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
