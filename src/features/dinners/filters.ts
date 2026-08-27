import type { CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import type { CatalogDinner } from '@/features/dinners/types';
import { daysSinceForSort } from '@/features/dinners/last-chosen';

/**
 * Combines cuisine/tag filtering with sorting for the catalog view.
 *
 * Tag filtering is OR, not AND: a dinner matches if it has *any* of the selected tags, not all
 * of them — chosen because AND semantics on a small, freeform vocabulary tends to produce empty
 * results fast (see bolt `012-weekly-dinner-planner-ui`'s implementation-plan.md).
 *
 * When cook-time sort is off (the default), dinners are ordered by least-recently-made
 * first (never-made ones lead), per story `007-variety-indicator` — not alphabetically.
 * `lastChosenDates` defaults to empty so callers that don't care about variety (e.g. most
 * existing tests) don't need to pass one; with an empty map every dinner ties at "never
 * made" and the alphabetical tie-break below determines order.
 */
export function applyFilters(
  dinners: CatalogDinner[],
  filters: CatalogFilterState,
  lastChosenDates: ReadonlyMap<string, string | null> = new Map(),
): CatalogDinner[] {
  let result = dinners;

  if (filters.cuisine) {
    result = result.filter((dinner) => dinner.cuisine_type === filters.cuisine);
  }
  if (filters.tags.length > 0) {
    result = result.filter((dinner) => dinner.tags.some((tag) => filters.tags.includes(tag)));
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
