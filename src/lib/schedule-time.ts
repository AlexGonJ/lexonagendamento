export type BookingTimeMode = "LEGACY_UTC_WALL" | "IANA_UTC";

export type ScheduleParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

export function calendarDateString(date: Date, timeZone: string) {
  const value = partsFor(date, timeZone);
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function calendarTimeString(date: Date, timeZone: string) {
  const value = partsFor(date, timeZone);
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

export function weekdayForDateString(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Reads an appointment as business-local wall time in either storage mode. */
export function scheduleParts(date: Date, timeZone: string, mode: BookingTimeMode): ScheduleParts {
  if (mode === "LEGACY_UTC_WALL") {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
  const value = partsFor(date, timeZone);
  return { year: value.year, month: value.month, day: value.day, hour: value.hour, minute: value.minute };
}

export function scheduleDateString(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function scheduleTimeString(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

export function formatScheduleDate(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  return `${String(value.day).padStart(2, "0")}/${String(value.month).padStart(2, "0")}/${value.year}`;
}

export function formatScheduleTime(date: Date, timeZone: string, mode: BookingTimeMode) {
  return scheduleTimeString(date, timeZone, mode);
}

export function formatScheduleDateTime(date: Date, timeZone: string, mode: BookingTimeMode) {
  return `${formatScheduleDate(date, timeZone, mode)} ${formatScheduleTime(date, timeZone, mode)}`;
}

export function formatScheduleMonth(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  const localMidday = new Date(Date.UTC(value.year, value.month - 1, value.day, 12));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" }).format(localMidday).replace(".", "");
}

export function formatScheduleWeekday(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  const localMidday = new Date(Date.UTC(value.year, value.month - 1, value.day, 12));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(localMidday);
}

/** Converts legacy wall-clock storage into the real instant used by integrations/comparisons. */
export function scheduleInstant(date: Date, timeZone: string, mode: BookingTimeMode) {
  if (mode === "IANA_UTC") return new Date(date);
  return zonedDateTimeToUtc(scheduleDateString(date, timeZone, mode), scheduleTimeString(date, timeZone, mode), timeZone);
}

export function addScheduleCalendarDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function scheduleMonthBounds(date: Date, timeZone: string, mode: BookingTimeMode) {
  const value = scheduleParts(date, timeZone, mode);
  const firstDay = `${value.year}-${String(value.month).padStart(2, "0")}-01`;
  const nextMonthStart = new Date(Date.UTC(value.year, value.month, 1, 12));
  const nextMonthDay = `${nextMonthStart.getUTCFullYear()}-${String(nextMonthStart.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return {
    start: scheduleDateTime(firstDay, "00:00", timeZone, mode),
    end: new Date(scheduleDateTime(nextMonthDay, "00:00", timeZone, mode).getTime() - 1),
  };
}

function offsetAt(date: Date, timeZone: string) {
  const value = partsFor(date, timeZone);
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second) - date.getTime();
}

export function zonedDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const time = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match || !time) return new Date(NaN);
  const wallUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]));
  let result = new Date(wallUtc - offsetAt(new Date(wallUtc), timeZone));
  result = new Date(wallUtc - offsetAt(result, timeZone));
  return result;
}

export function scheduleDateTime(dateStr: string, timeStr: string, timeZone: string, mode: BookingTimeMode) {
  return mode === "IANA_UTC" ? zonedDateTimeToUtc(dateStr, timeStr, timeZone) : new Date(`${dateStr}T${timeStr}:00.000Z`);
}

export function scheduleDayBounds(dateStr: string, timeZone: string, mode: BookingTimeMode) {
  if (mode === "LEGACY_UTC_WALL") return { start: new Date(`${dateStr}T00:00:00.000Z`), end: new Date(`${dateStr}T23:59:59.999Z`) };
  const [year, month, day] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return { start: zonedDateTimeToUtc(dateStr, "00:00", timeZone), end: new Date(zonedDateTimeToUtc(nextDate, "00:00", timeZone).getTime() - 1) };
}

export function scheduleClock(date: Date, timeZone: string, mode: BookingTimeMode) {
  if (mode === "LEGACY_UTC_WALL") return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  const value = partsFor(date, timeZone);
  return { hour: value.hour, minute: value.minute };
}
