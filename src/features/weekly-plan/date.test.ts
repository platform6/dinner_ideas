import { describe, expect, it } from 'vitest';

import { formatWeekRange, shiftWeek } from '@/features/weekly-plan/date';

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
