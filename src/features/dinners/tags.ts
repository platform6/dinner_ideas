/**
 * Normalizes a user-entered tag name to the same form the DB enforces (FR-9): trimmed,
 * lowercase. Run client-side too so the UI reflects the final value immediately instead of
 * surprising the user with a re-cased tag after refetch — the DB `CHECK` constraint (see
 * `009-dinner-catalog`'s migration) remains the actual enforcement, per ADR-1.
 */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}
