"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rescheduleBooking } from "@/actions/booking";

export default function BookingRescheduleForm({
  bookingId,
  initialDate,
  initialTime,
}: {
  bookingId: string;
  initialDate: string;
  initialTime: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setIsError(false);
    try {
      const result = await rescheduleBooking(bookingId, date, time);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error || "Não foi possível reagendar.");
        return;
      }
      setMessage("Agendamento reagendado.");
      router.refresh();
    } catch (error) {
      console.error("Erro inesperado ao reagendar atendimento", error);
      setIsError(true);
      setMessage("Não foi possível reagendar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1">
      <input
        name="date"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        required
        className="w-28 rounded border border-gray-300 px-1 py-1 text-xs"
        aria-label="Nova data"
      />
      <input
        name="time"
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
        required
        className="w-20 rounded border border-gray-300 px-1 py-1 text-xs"
        aria-label="Novo horário"
      />
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isSaving ? "Salvando…" : "Reagendar"}
      </button>
      {message && (
        <span role={isError ? "alert" : "status"} className={`basis-full text-xs ${isError ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </span>
      )}
    </form>
  );
}
