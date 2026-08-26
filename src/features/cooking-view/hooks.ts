import { useQuery } from '@tanstack/react-query';

import { fetchDinnersWithStepsByIds } from '@/features/dinners/api';

/** Fetches the 3 picked dinners' ordered steps. Disabled until there are exactly 3 ids. */
export function useDinnersWithSteps(dinnerIds: string[]) {
  const sortedIds = [...dinnerIds].sort();

  return useQuery({
    queryKey: ['cooking-view', 'dinners', sortedIds] as const,
    queryFn: () => fetchDinnersWithStepsByIds(sortedIds),
    enabled: sortedIds.length === 3,
  });
}
