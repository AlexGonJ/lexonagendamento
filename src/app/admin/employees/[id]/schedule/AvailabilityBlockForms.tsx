"use client";

import { useState } from "react";
import { addEmployeeAvailabilityBlock, addEmployeeWeeklyAvailabilityBlock } from "@/actions/schedule";
import { HourRangeFields, ScheduleSubmitButton } from "./ScheduleFormControls";

const days = [
  { value: 1, label: "Seg", full: "Segunda-feira" },
  { value: 2, label: "Ter", full: "Terça-feira" },
  { value: 3, label: "Qua", full: "Quarta-feira" },
  { value: 4, label: "Qui", full: "Quinta-feira" },
  { value: 5, label: "Sex", full: "Sexta-feira" },
  { value: 6, label: "Sáb", full: "Sábado" },
  { value: 0, label: "Dom", full: "Domingo" },
];
type LunchMode = "weekdays" | "everyday" | "custom";

export default function AvailabilityBlockForms({ employeeId }: { employeeId: string }) {
  const [lunchMode, setLunchMode] = useState<LunchMode>("weekdays");
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const lunchDays = lunchMode === "weekdays"
    ? [1, 2, 3, 4, 5]
    : lunchMode === "everyday"
      ? [0, 1, 2, 3, 4, 5, 6]
      : customDays;

  function toggleDay(day: number) {
    setCustomDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]);
  }

  return (
    <div className="space-y-6">
      <form action={addEmployeeAvailabilityBlock} className="space-y-4">
        <input type="hidden" name="employeeId" value={employeeId} />
        <div>
          <label htmlFor="availability-date" className="mb-1 block text-sm font-medium text-gray-700">Data</label>
          <input id="availability-date" type="date" name="date" required className="w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <HourRangeFields idPrefix="availability" initialStart="12:00" initialEnd="13:00" />
        <div>
          <label htmlFor="availability-reason" className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
          <input id="availability-reason" type="text" name="reason" placeholder="Ex.: consulta, compromisso" className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <ScheduleSubmitButton label="Bloquear período nesta data" />
      </form>

      <div className="border-t border-gray-200 pt-5">
        <h3 className="font-semibold text-gray-900">Almoço semanal recorrente</h3>
        <p className="mt-1 text-sm text-gray-500">Bloqueia este intervalo toda semana, sem precisar escolher uma data.</p>
        <form action={addEmployeeWeeklyAvailabilityBlock} className="mt-4 space-y-4">
          <input type="hidden" name="employeeId" value={employeeId} />
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-700">Repetir em</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["weekdays", "Segunda a sexta"],
                ["everyday", "Todos os dias"],
                ["custom", "Escolher dias"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setLunchMode(value)} aria-pressed={lunchMode === value} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${lunchMode === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {lunchMode === "custom" && (
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-gray-700">Dias da semana</legend>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => {
                  const selected = customDays.includes(day.value);
                  return <button key={day.value} type="button" onClick={() => toggleDay(day.value)} aria-pressed={selected} className={`min-w-12 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>{day.label}</button>;
                })}
              </div>
            </fieldset>
          )}

          {lunchDays.map((day) => <input key={day} type="hidden" name="dayOfWeek" value={day} />)}
          <HourRangeFields idPrefix="lunch" initialStart="12:00" initialEnd="13:00" />
          <input type="hidden" name="reason" value="Almoço" />
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lunchDays.length ? `Almoço bloqueado toda semana: ${lunchDays.map((day) => days.find((item) => item.value === day)?.full).join(", ")}.` : "Escolha ao menos um dia."}
          </p>
          <ScheduleSubmitButton disabled={lunchDays.length === 0} label="Salvar horário de almoço" />
        </form>
      </div>
    </div>
  );
}
