/**
 * Normalizes a user-entered tag name to the same form the DB enforces (FR-9): trimmed,
 * lowercase. Run client-side too so the UI reflects the final value immediately instead of
 * surprising the user with a re-cased tag after refetch — the DB `CHECK` constraint (see
 * `009-dinner-catalog`'s migration) remains the actual enforcement, per ADR-1.
 */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The "rosie-approved" heart (002-kitchen-table-theme, story 007) is presentation-only: it
 * checks for a tag literally named `rosie-approved`, reconciling the original design handoff
 * (which modeled this as a boolean column) with the generic tag system built in
 * 001-weekly-dinner-planner. Tag names are already lowercase-normalized at write time, so an
 * exact match is sufficient here.
 */
export const ROSIE_APPROVED_TAG = 'rosie-approved';

export function isRosieApproved(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).includes(ROSIE_APPROVED_TAG);
}
