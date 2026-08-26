import { useQuery } from '@tanstack/react-query';

import { fetchDinnersByIds } from '@/features/dinners/api';

/** Fetches the 3 picked dinners' full ingredient lists. Disabled until there are exactly 3 ids. */
export function useShoppingListDinners(dinnerIds: string[]) {
  const sortedIds = [...dinnerIds].sort();

  return useQuery({
    queryKey: ['shopping-list', 'dinners', sortedIds] as const,
    queryFn: () => fetchDinnersByIds(sortedIds),
    enabled: sortedIds.length === 3,
  });
}
