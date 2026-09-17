import { readYield } from '@/features/recipe-entry/scale';

/**
 * What to tell the user about an imported draft's quantities. Exported for its own test.
 *
 * Every import is "as written" since bolt 070, so the note always says so — the question is only
 * what the page's numbers are FOR. When the page's single yield already matches the household,
 * saying "NOT adjusted to 5" about quantities that are for 5 would be true and misleading.
 */
export function importQuantityNote(sourceYield: string | null, servingsPerDinner: number): string {
  if (!sourceYield) {
    return `That page didn’t say how many it serves, so these quantities are exactly as written — they have NOT been adjusted to ${servingsPerDinner}. Check them before saving.`;
  }
  const reading = readYield(sourceYield);
  if (reading.kind === 'single' && reading.servings === servingsPerDinner) {
    return `These quantities are as the page wrote them — for ${sourceYield}, which matches your household.`;
  }
  return `These quantities are as the page wrote them — for ${sourceYield}. They have NOT been adjusted to ${servingsPerDinner}.`;
}
