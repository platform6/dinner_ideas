import { useQuery } from '@tanstack/react-query';

import { fetchDinnersByIds } from '@/features/dinners/api';
import { fetchAssignments, fetchRows } from '@/features/shopping-list/legacy-store-rows';

/** Fetches the 3 picked dinners' full ingredient lists. Disabled until there are exactly 3 ids. */
export function useShoppingListDinners(dinnerIds: string[]) {
  const sortedIds = [...dinnerIds].sort();

  return useQuery({
    queryKey: ['shopping-list', 'dinners', sortedIds] as const,
    queryFn: () => fetchDinnersByIds(sortedIds),
    enabled: sortedIds.length === 3,
  });
}

/**
 * ⚠️ RETIRED-IN-WAITING — see `legacy-store-rows.ts`. The shopping list still sorts by the
 * pre-intent-010 row model until bolt 054 switches it to `item_location_resolution`.
 */
export function useRows() {
  return useQuery({ queryKey: ['store-config', 'rows'], queryFn: fetchRows });
}

export function useAssignments() {
  return useQuery({ queryKey: ['store-config', 'assignments'], queryFn: fetchAssignments });
}
