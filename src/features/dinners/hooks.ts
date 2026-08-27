import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addTagToDinner,
  fetchActiveDinners,
  fetchAllTags,
  fetchDinnerFullDetails,
  fetchLastChosenDates,
  fetchSuppressedDinners,
  removeTagFromDinner,
  setDinnerActive,
} from '@/features/dinners/api';

const activeDinnersKey = ['dinners', 'active'] as const;
const suppressedDinnersKey = ['dinners', 'suppressed'] as const;
const lastChosenDatesKey = ['dinners', 'last-chosen'] as const;
const allTagsKey = ['dinners', 'tags'] as const;
const dinnerDetailsKey = (dinnerId: string) => ['dinners', 'details', dinnerId] as const;

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

/** Lazily fetches one dinner's full details (steps/ingredients/tags) — only enabled once its card is expanded (FR-10). */
export function useDinnerFullDetails(dinnerId: string, enabled: boolean) {
  return useQuery({
    queryKey: dinnerDetailsKey(dinnerId),
    queryFn: () => fetchDinnerFullDetails(dinnerId),
    enabled,
  });
}

/** The full tag vocabulary, for the catalog's tag filter (FR-9). */
export function useAllTags() {
  return useQuery({ queryKey: allTagsKey, queryFn: fetchAllTags });
}

export function useAddTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dinnerId, tagName }: { dinnerId: string; tagName: string }) =>
      addTagToDinner(dinnerId, tagName),
    onSuccess: (_data, { dinnerId }) => {
      void queryClient.invalidateQueries({ queryKey: dinnerDetailsKey(dinnerId) });
      void queryClient.invalidateQueries({ queryKey: activeDinnersKey });
      void queryClient.invalidateQueries({ queryKey: suppressedDinnersKey });
      void queryClient.invalidateQueries({ queryKey: allTagsKey });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dinnerId, tagId }: { dinnerId: string; tagId: string }) =>
      removeTagFromDinner(dinnerId, tagId),
    onSuccess: (_data, { dinnerId }) => {
      void queryClient.invalidateQueries({ queryKey: dinnerDetailsKey(dinnerId) });
      void queryClient.invalidateQueries({ queryKey: activeDinnersKey });
      void queryClient.invalidateQueries({ queryKey: suppressedDinnersKey });
    },
  });
}
