/**
 * A Location's `name` is free text and its `type` drives display only (FR-2). The aisle number
 * shown in the chip is READ FROM THE NAME and is never a second editable field, so these two
 * helpers are the single place that rule lives — used both when storing `type` on add/rename
 * and when rendering the chip.
 */

const AISLE_PATTERN = /^\s*aisle\s+(\d+)/i;

export type LocationType = 'section' | 'aisle';

/**
 * The same rule the cutover migration applied (`20260904190000`, step 2): a name that begins
 * with "Aisle <n>" is an aisle; everything else is a section. `section` is the safe default —
 * it makes no numeric claim, and the user can rename at any time.
 */
export function inferLocationType(name: string): LocationType {
  return AISLE_PATTERN.test(name) ? 'aisle' : 'section';
}

/**
 * The number for the chip, or `null` when the name carries none — in which case the row renders
 * the section glyph instead, per FR-2's "a name with no parseable number still renders
 * correctly".
 */
export function parseAisleNumber(name: string): string | null {
  return name.match(AISLE_PATTERN)?.[1] ?? null;
}
