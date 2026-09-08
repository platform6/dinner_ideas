import { useQuery } from '@tanstack/react-query';

import { fetchDinnersByIds } from '@/features/dinners/api';

/**
 * Fetches the picked dinners' full ingredient lists. Disabled until the week is full — that is,
 * until there are exactly `dinnersPerWeek` ids (intent 015; was a hard-coded 3).
 *
 * The count is a parameter rather than read here, so the page reads the household setting once and
 * uses the same value for its gate and for this hook. Two readings that could disagree is exactly
 * the bug this intent exists to remove.
 */
export function useShoppingListDinners(dinnerIds: string[], dinnersPerWeek: number) {
  const sortedIds = [...dinnerIds].sort();

  return useQuery({
    queryKey: ['shopping-list', 'dinners', sortedIds] as const,
    queryFn: () => fetchDinnersByIds(sortedIds),
    enabled: sortedIds.length === dinnersPerWeek,
  });
}
