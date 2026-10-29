"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

const hourOptions = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

export function HourRangeFields({
  idPrefix,
  initialStart = "12:00",
  initialEnd = "13:00",
}: {
  idPrefix: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const startHour = Number(startTime.slice(0, 2));
  const endTimes = hourOptions.filter((time) => Number(time.slice(0, 2)) > startHour);

  function updateStart(value: string) {
    setStartTime(value);
    if (Number(endTime.slice(0, 2)) <= Number(value.slice(0, 2))) {
      const nextEnd = hourOptions.find((time) => Number(time.slice(0, 2)) > Number(value.slice(0, 2)));
      if (nextEnd) setEndTime(nextEnd);
    }
  }

  const selectClass = "w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${idPrefix}-start`} className="mb-1 block text-sm font-medium text-gray-700">Início</label>
        <select id={`${idPrefix}-start`} name="startTime" required value={startTime} onChange={(event) => updateStart(event.target.value)} className={selectClass}>
          {hourOptions.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-end`} className="mb-1 block text-sm font-medium text-gray-700">Fim</label>
        <select id={`${idPrefix}-end`} name="endTime" required value={endTime} onChange={(event) => setEndTime(event.target.value)} className={selectClass}>
          {endTimes.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
      </div>
    </div>
  );
}

export function ScheduleSubmitButton({ label, disabled = false }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={disabled || pending} aria-live="polite" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
      {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {pending ? "Salvando…" : label}
    </button>
  );
}
