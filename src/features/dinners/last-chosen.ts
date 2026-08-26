/** Whole days between `dateString` and `now` (defaults to the real current time). */
export function daysSince(dateString: string, now: Date = new Date()): number {
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** "Never made" / "Made today" / "Last made N day(s)/week(s)/month(s)/year(s) ago". */
export function formatLastChosen(lastChosenDate: string | null, now: Date = new Date()): string {
  if (!lastChosenDate) return 'Never made';

  const days = daysSince(lastChosenDate, now);
  if (days <= 0) return 'Made today';
  if (days < 7) return `Last made ${days} day${days === 1 ? '' : 's'} ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Last made ${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Last made ${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(days / 365);
  return `Last made ${years} year${years === 1 ? '' : 's'} ago`;
}

/** Sort key for "least recently made first" — never-made dinners sort to the front. */
export function daysSinceForSort(lastChosenDate: string | null | undefined, now: Date = new Date()): number {
  if (!lastChosenDate) return Number.POSITIVE_INFINITY;
  return daysSince(lastChosenDate, now);
}
