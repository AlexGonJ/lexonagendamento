export type BookingTimeMode = "LEGACY_UTC_WALL" | "IANA_UTC";

function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
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
