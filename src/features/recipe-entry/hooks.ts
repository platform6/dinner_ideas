import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createDinner, fetchAisleHistory } from '@/features/recipe-entry/api';
import { buildAisleHistory, type RecipeDraft } from '@/features/recipe-entry/draft';

/**
 * The aisle the household last used for each ingredient name (intent 019, FR-3).
 *
 * Fetched once when the entry form opens. Typing reads the map in memory, so no keystroke makes a
 * request (NFR-2), and a window refocus doesn't refetch mid-entry. Keyed under `['dinners']`, so
 * `useSaveDinner`'s invalidation refreshes it after every save.
 */
export function useAisleHistory() {
  return useQuery({
    queryKey: ['dinners', 'aisle-history'],
    queryFn: fetchAisleHistory,
    select: buildAisleHistory,
    refetchOnWindowFocus: false,
  });
}

/**
 * Saves a draft as a real dinner (intent 014, story 005).
 *
 * On success the catalog, the tag vocabulary and the walking path all need refreshing: the dinner
 * is new, a hand-typed tag may be new, and the items trigger may have registered groceries that
 * `/store` should now show as unreviewed. Invalidating is cheaper than reasoning about which of
 * those actually changed.
 *
 * The mutation deliberately does NOT clear the draft. A rejection — a duplicate name above all —
 * must leave the page exactly as it was, so the fix costs one edit rather than re-entering every
 * ingredient and step (story 006).
 */
export function useSaveDinner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: RecipeDraft) => createDinner(draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dinners'] });
      // The items registry may have gained entries from the ingredient lines, via the trigger.
      void queryClient.invalidateQueries({ queryKey: ['store-config'] });
    },
  });
}
