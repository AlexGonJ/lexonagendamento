"use client";

import { useMemo, useState } from "react";
import { addScheduleBlock } from "@/actions/schedule";
import { HourRangeFields, ScheduleSubmitButton } from "./ScheduleFormControls";

const weekDays = [
  { value: 1, label: "Seg", full: "Segunda-feira" },
  { value: 2, label: "Ter", full: "Terça-feira" },
  { value: 3, label: "Qua", full: "Quarta-feira" },
  { value: 4, label: "Qui", full: "Quinta-feira" },
  { value: 5, label: "Sex", full: "Sexta-feira" },
  { value: 6, label: "Sáb", full: "Sábado" },
  { value: 0, label: "Dom", full: "Domingo" },
];

type ApplyMode = "one" | "weekdays" | "everyday" | "custom";

export default function ScheduleBlockForm({ employeeId }: { employeeId: string }) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [applyMode, setApplyMode] = useState<ApplyMode>("one");
  const [customDays, setCustomDays] = useState<number[]>([1]);

  const selectedDays = useMemo(() => {
    if (applyMode === "weekdays") return [1, 2, 3, 4, 5];
    if (applyMode === "everyday") return [0, 1, 2, 3, 4, 5, 6];
    if (applyMode === "custom") return customDays;
    return [selectedDay];
  }, [applyMode, customDays, selectedDay]);

  const daySummary = selectedDays
    .map((day) => weekDays.find((item) => item.value === day)?.full)
    .filter(Boolean)
    .join(", ");

  function toggleCustomDay(day: number) {
    setCustomDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]);
  }

  return (
    <form action={addScheduleBlock} className="space-y-5">
      <input type="hidden" name="employeeId" value={employeeId} />

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">Aplicar horário em</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["one", "Um dia"],
            ["weekdays", "Segunda a sexta"],
            ["everyday", "Todos os dias"],
            ["custom", "Escolher dias"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setApplyMode(value)}
              aria-pressed={applyMode === value}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${applyMode === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {applyMode === "one" && (
        <div>
          <label htmlFor="schedule-day" className="mb-1 block text-sm font-medium text-gray-700">Dia da semana</label>
          <select
            id="schedule-day"
            value={selectedDay}
            onChange={(event) => setSelectedDay(Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {weekDays.map((day) => <option key={day.value} value={day.value}>{day.full}</option>)}
          </select>
        </div>
      )}

      {applyMode === "custom" && (
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-gray-700">Selecione os dias</legend>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => {
              const selected = customDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleCustomDay(day.value)}
                  aria-pressed={selected}
                  className={`min-w-12 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selectedDays.map((day) => <input key={day} type="hidden" name="dayOfWeek" value={day} />)}

      <HourRangeFields idPrefix="schedule" initialStart="09:00" initialEnd="18:00" />

      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
        {selectedDays.length ? `Este período será aplicado em: ${daySummary}.` : "Escolha ao menos um dia para continuar."}
      </p>

      <ScheduleSubmitButton disabled={selectedDays.length === 0} label={`Salvar horário${selectedDays.length > 1 ? ` em ${selectedDays.length} dias` : ""}`} />
    </form>
  );
}
