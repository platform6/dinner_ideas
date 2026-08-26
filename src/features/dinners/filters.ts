import type { CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import type { DinnerWithIngredients } from '@/features/dinners/types';
import { daysSinceForSort } from '@/features/dinners/last-chosen';

/**
 * Combines cuisine/Rosie-approved filtering with sorting for the catalog view.
 *
 * When cook-time sort is off (the default), dinners are ordered by least-recently-made
 * first (never-made ones lead), per story `007-variety-indicator` — not alphabetically.
 * `lastChosenDates` defaults to empty so callers that don't care about variety (e.g. most
 * existing tests) don't need to pass one; with an empty map every dinner ties at "never
 * made" and the alphabetical tie-break below determines order.
 */
export function applyFilters(
  dinners: DinnerWithIngredients[],
  filters: CatalogFilterState,
  lastChosenDates: ReadonlyMap<string, string | null> = new Map()
): DinnerWithIngredients[] {
  let result = dinners;

  if (filters.cuisine) {
    result = result.filter((dinner) => dinner.cuisine_type === filters.cuisine);
  }
  if (filters.rosieApprovedOnly) {
    result = result.filter((dinner) => dinner.rosie_approved);
  }

  if (filters.sortByCookTime) {
    result = [...result].sort((a, b) => a.cook_time_minutes - b.cook_time_minutes);
  } else {
    result = [...result].sort((a, b) => {
      const aDays = daysSinceForSort(lastChosenDates.get(a.id));
      const bDays = daysSinceForSort(lastChosenDates.get(b.id));
      // Not a plain subtraction: when both are "never made" (Infinity), bDays - aDays is
      // NaN, not 0, which would silently skip the tie-break below.
      return aDays !== bDays ? bDays - aDays : a.name.localeCompare(b.name);
    });
  }

  return result;
}
