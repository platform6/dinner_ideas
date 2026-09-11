import type { RecipeDraft } from '@/features/recipe-entry/draft';

/**
 * Scaling an imported draft, in code (intent 018, bolt 070).
 *
 * Before intent 018 the extraction prompt asked a language model to divide every quantity by a
 * ratio it also had to infer. It was exact on the pages tested, but it was arithmetic on
 * shopping-list numbers done where no test could reach it, that nobody could undo, and that hid
 * the page's own numbers. Now the model reports what the page says and this module multiplies.
 *
 * Two words that must not be confused (bolt 069 domain model):
 *   - **yield**: what a recipe PAGE says it serves — "4", "8–10", "Makes 24 cookies". A fact about
 *     a source, carried verbatim.
 *   - **servings per dinner**: how many people the HOUSEHOLD cooks for. A target.
 * Scaling goes from a yield to a household's servings, and only when the user asks (FR-4).
 */

/** What a page's yield means as a number — or honestly that it means no single number. */
export type YieldReading =
  { kind: 'single'; servings: number } | { kind: 'range'; low: number; high: number } | { kind: 'unknown' };

/**
 * Reads a yield as the page stated it.
 *
 * Deliberately conservative: when in doubt it is `unknown`, because a wrong base produces wrong
 * quantities that look right. "Makes 24 cookies" is a count of pieces, not of people, so it is
 * unknown rather than 24.
 *
 * **A range is reported, never collapsed** (intent 018, Checkpoint 2). "8–10" has no correct single
 * reading; the user supplies the base if they want to scale from it.
 */
export function readYield(statedYield: string | null | undefined): YieldReading {
  if (!statedYield) return { kind: 'unknown' };
  const text = statedYield.trim().toLowerCase();

  // Pieces, not people: "makes 24", "24 cookies", "12 muffins" …
  if (/\b(makes|cookies?|muffins?|pieces?|bars?|slices?|loaf|loaves|cups?|jars?|dozen)\b/.test(text)) {
    return { kind: 'unknown' };
  }

  const range = text.match(
    /^(?:serves\s+)?(\d+)\s*(?:–|—|-|to)\s*(\d+)(?:\s*(?:servings?|people|persons?))?$/,
  );
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (low > 0 && high > low) return { kind: 'range', low, high };
    return { kind: 'unknown' };
  }

  const single = text.match(/^(?:serves\s+)?(\d+)(?:\s*(?:servings?|people|persons?))?$/);
  if (single) {
    const servings = Number(single[1]);
    if (servings > 0) return { kind: 'single', servings };
  }

  return { kind: 'unknown' };
}

/** The smallest quantity a scaled ingredient may round to: ⅛. See `roundForKitchen`. */
const SMALLEST_STEP = 0.125;

/**
 * The rounding rule, written down (bolt 070 implementation plan §5).
 *
 * 1 cup scaled by ⅓ is 0.333… cup, which nobody can measure; rounding badly recreates the harm
 * intent 018 began with, from the other direction. So:
 *
 *   ≥ 10       → nearest whole     (grams, millilitres, counts; a tenth of a gram is noise)
 *   1 to < 10  → nearest ¼         (tablespoons, cups, pounds; quarters are on every measure)
 *   < 1        → nearest ⅛         (the smallest common measure)
 *   → 0        → ⅛, the floor      (`quantity > 0` in the database; an ingredient must not vanish)
 *
 * Units are not converted — 0.375 cup stays cups. Exported so the rule has one table-driven test.
 */
export function roundForKitchen(value: number): number {
  let rounded: number;
  if (value >= 10) rounded = Math.round(value);
  else if (value >= 1) rounded = Math.round(value * 4) / 4;
  else rounded = Math.round(value * 8) / 8;
  return rounded > 0 ? rounded : SMALLEST_STEP;
}

/**
 * Scales every ingredient quantity from `fromServings` to `toServings`, returning a NEW draft.
 *
 * - **Non-destructive**: the input is not touched, so the caller can keep it for undo (FR-3).
 * - **Identity is exact**: scaling 4 → 4 returns the quantities unchanged, NOT rounded — otherwise
 *   "0.33" would quietly become "0.375" on a scale that did nothing.
 * - A quantity that is not a positive number (the user may have edited it) is left exactly as it
 *   is. There is nothing to multiply, and the form's own validation will say so on save.
 *
 * `fromServings` and `toServings` must be positive integers; anything else is a programming error.
 */
export function scaleDraft(draft: RecipeDraft, fromServings: number, toServings: number): RecipeDraft {
  for (const [name, n] of [
    ['fromServings', fromServings],
    ['toServings', toServings],
  ] as const) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`${name} must be a positive integer, got ${n}`);
  }

  if (fromServings === toServings) {
    return { ...draft, ingredients: draft.ingredients.map((line) => ({ ...line })) };
  }

  const ratio = toServings / fromServings;
  return {
    ...draft,
    ingredients: draft.ingredients.map((line) => {
      const quantity = Number(line.quantity.trim());
      if (!line.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) return { ...line };
      return { ...line, quantity: String(roundForKitchen(quantity * ratio)) };
    }),
  };
}
