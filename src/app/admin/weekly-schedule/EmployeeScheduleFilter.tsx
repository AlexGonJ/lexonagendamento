"use client";

import { useRef } from "react";

type EmployeeOption = { id: string; name: string; role: string };

export default function EmployeeScheduleFilter({
  employees,
  selectedEmployeeId,
  weekOffset,
}: {
  employees: EmployeeOption[];
  selectedEmployeeId: string;
  weekOffset: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
      <label htmlFor="weekly-schedule-employee" className="text-sm font-semibold text-gray-700">Visualizar Profissional:</label>
      <form ref={formRef} method="GET" className="flex-1">
        <input type="hidden" name="weekOffset" value={weekOffset} />
        <select
          id="weekly-schedule-employee"
          name="employeeId"
          defaultValue={selectedEmployeeId}
          onChange={() => formRef.current?.requestSubmit()}
          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 cursor-pointer font-medium"
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} ({employee.role})
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
