import { useQuery } from '@tanstack/react-query';

import { fetchDinnersWithStepsByIds } from '@/features/dinners/api';

/**
 * Fetches the picked dinners' ordered steps. Disabled until the week is full — that is, until
 * there are exactly `dinnersPerWeek` ids (intent 015; was a hard-coded 3).
 */
export function useDinnersWithSteps(dinnerIds: string[], dinnersPerWeek: number) {
  const sortedIds = [...dinnerIds].sort();

  return useQuery({
    queryKey: ['cooking-view', 'dinners', sortedIds] as const,
    queryFn: () => fetchDinnersWithStepsByIds(sortedIds),
    enabled: sortedIds.length === dinnersPerWeek,
  });
}
