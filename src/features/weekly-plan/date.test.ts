import { describe, expect, it } from 'vitest';

import {
  currentPlanningWeekStart,
  formatWeekRange,
  planningWeekStart,
  shiftWeek,
  todayIsoDate,
} from '@/features/weekly-plan/date';

describe('shiftWeek', () => {
  it('shifts forward by whole weeks', () => {
    expect(shiftWeek('2026-08-24', 1)).toBe('2026-08-31');
    expect(shiftWeek('2026-08-24', 2)).toBe('2026-09-07');
  });

  it('shifts backward by whole weeks', () => {
    expect(shiftWeek('2026-08-24', -1)).toBe('2026-08-17');
  });

  it('is a no-op for an offset of 0', () => {
    expect(shiftWeek('2026-08-24', 0)).toBe('2026-08-24');
  });

  it('crosses a month boundary correctly', () => {
    expect(shiftWeek('2026-08-31', 1)).toBe('2026-09-07');
  });

  it('crosses a year boundary correctly', () => {
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
  });
});

describe('formatWeekRange', () => {
  it('formats a 7-day range as "M/D – M/D"', () => {
    expect(formatWeekRange('2026-08-24')).toBe('8/24 – 8/30');
  });

  it('formats a range that crosses a month boundary', () => {
    expect(formatWeekRange('2026-08-31')).toBe('8/31 – 9/6');
  });
});

describe('planningWeekStart', () => {
  // 2026-09-02 is a Wednesday; 2026-09-06 a Sunday; 2026-08-31 a Monday.
  it('returns the date unchanged when it already falls on the week-start weekday', () => {
    expect(planningWeekStart('2026-09-06', 0)).toBe('2026-09-06'); // Sunday, start = Sunday
  });

  it('walks back to the most recent week-start weekday', () => {
    expect(planningWeekStart('2026-09-02', 0)).toBe('2026-08-30'); // Wed -> prior Sunday
    expect(planningWeekStart('2026-09-02', 1)).toBe('2026-08-31'); // Wed -> prior Monday
    expect(planningWeekStart('2026-09-02', 6)).toBe('2026-08-29'); // Wed -> prior Saturday
  });

  it('handles the day before and the day after the boundary', () => {
    expect(planningWeekStart('2026-09-05', 0)).toBe('2026-08-30'); // Sat -> prior Sunday
    expect(planningWeekStart('2026-09-07', 0)).toBe('2026-09-06'); // Mon -> that Sunday
  });

  it('covers every week-start weekday from one reference date', () => {
    // 2026-09-02 is a Wednesday (getDay() === 3).
    const expected = [
      '2026-08-30', // 0 Sun
      '2026-08-31', // 1 Mon
      '2026-09-01', // 2 Tue
      '2026-09-02', // 3 Wed (same day)
      '2026-08-27', // 4 Thu
      '2026-08-28', // 5 Fri
      '2026-08-29', // 6 Sat
    ];
    expected.forEach((iso, weekStartDay) => {
      expect(planningWeekStart('2026-09-02', weekStartDay)).toBe(iso);
    });
  });

  it('crosses a month boundary', () => {
    expect(planningWeekStart('2026-10-01', 0)).toBe('2026-09-27'); // Thu -> prior Sunday
  });

  it('crosses a year boundary', () => {
    expect(planningWeekStart('2027-01-01', 0)).toBe('2026-12-27'); // Fri -> prior Sunday
  });

  it('yields a 7-calendar-day window across a DST transition (US spring-forward 2026-03-08)', () => {
    const start = planningWeekStart('2026-03-10', 0); // Tue -> Sunday 2026-03-08
    expect(start).toBe('2026-03-08');
    expect(shiftWeek(start, 1)).toBe('2026-03-15');
  });

  it('is pure — same inputs, same output', () => {
    expect(planningWeekStart('2026-09-02', 0)).toBe(planningWeekStart('2026-09-02', 0));
  });
});

describe('currentPlanningWeekStart', () => {
  it('is planningWeekStart anchored on today', () => {
    expect(currentPlanningWeekStart(0)).toBe(planningWeekStart(todayIsoDate(), 0));
  });
});
