/**
 * Decides which ingredient lines are "the same grocery" on the shopping list (intent 023, FR-1).
 *
 * Deliberately NOT `nameKey` (`reorder.ts`): that one must stay identical to `items.name_key` in the
 * database, because it is how a line finds its registry item. This is a looser grouping used only
 * to build the list, so the two are kept apart.
 *
 * Tuned for PRECISION, like `similarity.ts`. A missed merge costs one extra line; a wrong merge
 * hides a grocery inside another one (NFR-2). So the only thing removed is the prep note after the
 * first comma ("onion, diced" → "onion").
 *
 * A prep word BEFORE the name is kept on purpose. In the household's catalog it almost always names
 * how the product is sold ("diced tomatoes" is a can, "shredded cheese" is a bag), and stripping it
 * merged canned tomatoes into fresh ones. Decided by the product owner during bolt 080's browser check.
 */

/**
 * The name a line shows: the raw name up to its first comma, capitalization kept (FR-3). A name
 * that is nothing but a note (", diced") keeps its raw, trimmed form rather than going blank.
 */
export function plainLabel(name: string): string {
  const commaAt = name.indexOf(',');
  const beforeComma = (commaAt === -1 ? name : name.slice(0, commaAt)).replace(/\s+/g, ' ').trim();
  return beforeComma || name.trim();
}

/** Two ingredient lines with the same merge key are one line on the shopping list (FR-1). */
export function mergeKey(name: string): string {
  return plainLabel(name).toLowerCase();
}

/**
 * Two amounts with the same unit key are summed on a line (FR-2). A unit's singular and plural are
 * the same unit ("cup" / "cups", "lb" / "lbs"); a trailing "ss" is left alone. Nothing is converted.
 */
export function unitKey(unit: string): string {
  const key = unit.trim().toLowerCase();
  return key.length > 2 && key.endsWith('s') && !key.endsWith('ss') ? key.slice(0, -1) : key;
}
