import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchActiveDinners, fetchLastChosenDates, fetchSuppressedDinners, setDinnerActive } from '@/features/dinners/api';

const activeDinnersKey = ['dinners', 'active'] as const;
const suppressedDinnersKey = ['dinners', 'suppressed'] as const;
const lastChosenDatesKey = ['dinners', 'last-chosen'] as const;

export function useDinners() {
  return useQuery({ queryKey: activeDinnersKey, queryFn: fetchActiveDinners });
}

/** Backs the variety indicator — "last made" text and the default catalog sort order. */
export function useLastChosenDates() {
  return useQuery({ queryKey: lastChosenDatesKey, queryFn: fetchLastChosenDates });
}

/** Only fetched when the Suppressed view is actually opened. */
export function useSuppressedDinners(enabled: boolean) {
  return useQuery({ queryKey: suppressedDinnersKey, queryFn: fetchSuppressedDinners, enabled });
}

export function useSetDinnerActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setDinnerActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activeDinnersKey });
      void queryClient.invalidateQueries({ queryKey: suppressedDinnersKey });
    },
  });
}
