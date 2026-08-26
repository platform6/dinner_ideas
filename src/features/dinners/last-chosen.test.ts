import { describe, expect, it } from 'vitest';

import { daysSince, daysSinceForSort, formatLastChosen } from '@/features/dinners/last-chosen';

const now = new Date('2026-08-26T12:00:00Z');

function daysAgo(n: number): string {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('daysSince', () => {
  it('computes whole days between two dates', () => {
    expect(daysSince(daysAgo(5), now)).toBe(5);
  });

  it('returns 0 for the same day', () => {
    expect(daysSince(now.toISOString(), now)).toBe(0);
  });
});

describe('formatLastChosen', () => {
  it('returns "Never made" for null', () => {
    expect(formatLastChosen(null, now)).toBe('Never made');
  });

  it('returns "Made today" for the same day', () => {
    expect(formatLastChosen(now.toISOString(), now)).toBe('Made today');
  });

  it('formats singular and plural days', () => {
    expect(formatLastChosen(daysAgo(1), now)).toBe('Last made 1 day ago');
    expect(formatLastChosen(daysAgo(3), now)).toBe('Last made 3 days ago');
  });

  it('formats weeks once past 6 days', () => {
    expect(formatLastChosen(daysAgo(7), now)).toBe('Last made 1 week ago');
    expect(formatLastChosen(daysAgo(20), now)).toBe('Last made 2 weeks ago');
  });

  it('formats months once past 29 days', () => {
    expect(formatLastChosen(daysAgo(30), now)).toBe('Last made 1 month ago');
    expect(formatLastChosen(daysAgo(90), now)).toBe('Last made 3 months ago');
  });

  it('formats years once past 364 days', () => {
    expect(formatLastChosen(daysAgo(365), now)).toBe('Last made 1 year ago');
    expect(formatLastChosen(daysAgo(800), now)).toBe('Last made 2 years ago');
  });
});

describe('daysSinceForSort', () => {
  it('treats null and undefined as Infinity, so never-made sorts first', () => {
    expect(daysSinceForSort(null, now)).toBe(Number.POSITIVE_INFINITY);
    expect(daysSinceForSort(undefined, now)).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns the actual day count for a chosen date', () => {
    expect(daysSinceForSort(daysAgo(10), now)).toBe(10);
  });
});
