/**
 * Vietnam Timezone (Asia/Ho_Chi_Minh, UTC+07:00) Utility
 * Ensures all scheduling and booking operations are evaluated in canonical laboratory time,
 * independent of browser/machine local timezone.
 */

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface VietnamDateTimeParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  hours: number;
  minutes: number;
  seconds: number;
}

export function parseVietnamParts(dateOrIso: string | Date | null | undefined): VietnamDateTimeParts | null {
  if (!dateOrIso) return null;
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (Number.isNaN(d.getTime())) return null;

  const vn = new Date(d.getTime() + VIETNAM_OFFSET_MS);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    dayOfWeek: vn.getUTCDay(),
    hours: vn.getUTCHours(),
    minutes: vn.getUTCMinutes(),
    seconds: vn.getUTCSeconds()
  };
}

export function toVietnamDateString(dateOrIso: string | Date | null | undefined): string {
  const parts = parseVietnamParts(dateOrIso);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function toVietnamTimeString(dateOrIso: string | Date | null | undefined): string {
  const parts = parseVietnamParts(dateOrIso);
  if (!parts) return "";
  return `${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`;
}

export function toVietnamHour(dateOrIso: string | Date | null | undefined): number {
  const parts = parseVietnamParts(dateOrIso);
  return parts ? parts.hours : 0;
}

export function vietnamTimeToIso(dateStr: string, timeStr: string): string {
  // Ensure time has seconds for unambiguous +07:00 parsing
  const cleanTime = timeStr.trim();
  const timeWithSeconds = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  const parsed = new Date(`${dateStr.trim()}T${timeWithSeconds}+07:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid Vietnam date/time input");
  }
  return parsed.toISOString();
}

export function formatVietnamDateTime(dateOrIso: string | Date | null | undefined): string {
  const parts = parseVietnamParts(dateOrIso);
  if (!parts) return "—";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year} ${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`;
}

export function getVietnamTodayDateString(): string {
  return toVietnamDateString(new Date());
}

export function getVietnamTomorrowDateString(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return toVietnamDateString(tomorrow);
}
