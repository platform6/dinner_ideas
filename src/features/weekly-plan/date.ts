/**
 * Parses a `YYYY-MM-DD` date-only string as a local date (not UTC) — same reasoning as
 * `hooks.ts#todayIsoDate`: `new Date('2026-08-24')` parses as UTC midnight, which is the wrong
 * calendar day for any household west of UTC once local time has passed midnight UTC.
 */
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Shifts a `YYYY-MM-DD` date by a number of whole weeks (negative = earlier). */
export function shiftWeek(isoDate: string, weeks: number): string {
  const date = parseLocalDate(isoDate);
  date.setDate(date.getDate() + weeks * 7);
  return toIsoDate(date);
}

/**
 * Today's date as `YYYY-MM-DD` in the browser's local timezone — for a new plan's `start_date`,
 * and as the week-navigation anchor when no plan exists yet. Deliberately not
 * `toISOString().slice(0, 10)`, which gives the UTC date — wrong for any household west of UTC
 * once local time has passed midnight UTC.
 */
export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/**
 * The start date (`YYYY-MM-DD`) of the planning week that contains `isoDate`, given the
 * household's week-start weekday (`0` = Sunday .. `6` = Saturday). Returns `isoDate` unchanged
 * when it already falls on that weekday. Whole-date local math — no hour arithmetic, so a week
 * spanning a DST transition still yields a 7-calendar-day window (intent 011).
 */
export function planningWeekStart(isoDate: string, weekStartDay: number): string {
  const date = parseLocalDate(isoDate);
  const delta = (date.getDay() - weekStartDay + 7) % 7;
  date.setDate(date.getDate() - delta);
  return toIsoDate(date);
}

/** `planningWeekStart` for today's local date — the current planning week's start. */
export function currentPlanningWeekStart(weekStartDay: number): string {
  return planningWeekStart(todayIsoDate(), weekStartDay);
}

/** Formats a week's start date as a "M/D – M/D" range for the week-navigation header (FR-11). */
export function formatWeekRange(startDate: string): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(shiftWeek(startDate, 1));
  end.setDate(end.getDate() - 1);

  const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${format(start)} – ${format(end)}`;
}
