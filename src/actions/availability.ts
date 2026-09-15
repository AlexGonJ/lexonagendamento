"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { scheduleClock, scheduleDateTime, scheduleDayBounds, type BookingTimeMode } from "@/lib/schedule-time";

function timeToMinutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function minutesToTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

/** Returns slots as local wall-clock values and respects the tenant's storage convention. */
export async function getAvailableSlots(employeeId: string, dateStr: string, serviceDuration: number, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !Number.isInteger(serviceDuration) || serviceDuration <= 0) return [];
  const employee = await client.employee.findUnique({ where: { id: employeeId }, select: { tenantId: true } });
  if (!employee) return [];
  const tenant = await client.tenant.findUnique({ where: { id: employee.tenantId }, select: { minimumLeadMinutes: true, timezone: true, bookingTimeMode: true } });
  if (!tenant) return [];
  const mode = tenant.bookingTimeMode as BookingTimeMode;
  const { start: startOfDay, end: endOfDay } = scheduleDayBounds(dateStr, tenant.timezone, mode);
  const weekday = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
  const [schedules, timeOff, holiday, bookings, availabilityBlocks] = await Promise.all([
    client.employeeSchedule.findMany({ where: { employeeId, dayOfWeek: weekday } }),
    client.employeeTimeOff.findFirst({ where: { employeeId, date: { gte: new Date(`${dateStr}T00:00:00.000Z`), lte: new Date(`${dateStr}T23:59:59.999Z`) } }, select: { id: true } }),
    client.tenantHoliday.findFirst({ where: { tenantId: employee.tenantId, date: { gte: new Date(`${dateStr}T00:00:00.000Z`), lte: new Date(`${dateStr}T23:59:59.999Z`) } }, select: { id: true } }),
    client.booking.findMany({ where: { employeeId, status: { not: "CANCELLED" }, date: { gte: startOfDay, lte: endOfDay } }, include: { service: true } }),
    client.employeeAvailabilityBlock.findMany({ where: { employeeId, startAt: { lte: endOfDay }, endAt: { gt: startOfDay } }, select: { startAt: true, endAt: true } }),
  ]);
  if (timeOff || holiday || schedules.length === 0) return [];
  const occupied = bookings.map((booking) => { const clock = scheduleClock(booking.date, tenant.timezone, mode); const start = clock.hour * 60 + clock.minute; return { start, end: start + booking.service.duration }; });
  const blocked = availabilityBlocks.map((block) => { const startClock = scheduleClock(block.startAt, tenant.timezone, mode); const endClock = scheduleClock(new Date(block.endAt.getTime() - 1), tenant.timezone, mode); return { start: startClock.hour * 60 + startClock.minute, end: endClock.hour * 60 + endClock.minute + 1 }; });
  const slots: string[] = [];
  for (const schedule of schedules) for (let start = timeToMinutes(schedule.startTime); start + serviceDuration <= timeToMinutes(schedule.endTime); start += 15) {
    const end = start + serviceDuration;
    if (![...occupied, ...blocked].some((block) => start < block.end && end > block.start) && scheduleDateTime(dateStr, minutesToTime(start), tenant.timezone, mode).getTime() > Date.now() + tenant.minimumLeadMinutes * 60_000) slots.push(minutesToTime(start));
  }
  return Array.from(new Set(slots)).sort();
}
