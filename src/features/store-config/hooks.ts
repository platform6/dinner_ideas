import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addLocation,
  countPlacementsAtLocation,
  deleteLocation,
  dismissSuggestion,
  fetchActiveStore,
  fetchDismissals,
  fetchInRecipeNameKeys,
  fetchLocations,
  fetchResolvedItems,
  placeItem,
  renameLocation,
  reorderLocation,
  unplaceItem,
} from '@/features/store-config/api';
import type { Store } from '@/features/store-config/types';

const storeKey = ['store-config', 'store'] as const;
const locationsKey = (storeId: string) => ['store-config', 'locations', storeId] as const;
const resolutionKey = (storeId: string) => ['store-config', 'resolution', storeId] as const;

export function useActiveStore() {
  return useQuery({ queryKey: storeKey, queryFn: fetchActiveStore });
}

export function useLocations(storeId: string | undefined) {
  return useQuery({
    queryKey: locationsKey(storeId ?? ''),
    queryFn: () => fetchLocations(storeId as string),
    enabled: Boolean(storeId),
  });
}

export function useResolvedItems(storeId: string | undefined) {
  return useQuery({
    queryKey: resolutionKey(storeId ?? ''),
    queryFn: () => fetchResolvedItems(storeId as string),
    enabled: Boolean(storeId),
  });
}

/**
 * Every path mutation invalidates BOTH the locations and the resolution query: adding, moving,
 * renaming or removing a stop changes where items resolve, and the two must never be shown out
 * of step with each other.
 */
function usePathMutation<TVariables, TResult>(
  storeId: string | undefined,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (!storeId) return;
      void queryClient.invalidateQueries({ queryKey: locationsKey(storeId) });
      void queryClient.invalidateQueries({ queryKey: resolutionKey(storeId) });
    },
  });
}

export function useAddLocation(store: Store | null | undefined) {
  return usePathMutation(store?.id, ({ name, position }: { name: string; position: number }) =>
    addLocation(store as Store, name, position),
  );
}

export function useRenameLocation(storeId: string | undefined) {
  return usePathMutation(storeId, ({ locationId, name }: { locationId: string; name: string }) =>
    renameLocation(locationId, name),
  );
}

export function useReorderLocation(storeId: string | undefined) {
  return usePathMutation(
    storeId,
    ({ locationId, newPosition }: { locationId: string; newPosition: number }) =>
      reorderLocation(locationId, newPosition),
  );
}

export function useDeleteLocation(storeId: string | undefined) {
  return usePathMutation(storeId, (locationId: string) => deleteLocation(locationId));
}

/**
 * Reads the placement count for a stop on demand — before the destructive confirm decides
 * whether it needs to appear at all (story 006). Not a `useQuery`: it is a one-shot read
 * triggered by pressing "Remove", not page state.
 */
export function useCountPlacementsAtLocation() {
  return useMutation({ mutationFn: (locationId: string) => countPlacementsAtLocation(locationId) });
}

const dismissalsKey = (storeId: string) => ['store-config', 'dismissals', storeId] as const;
const inRecipeKey = ['store-config', 'in-recipe-name-keys'] as const;

export function useDismissals(storeId: string | undefined) {
  return useQuery({
    queryKey: dismissalsKey(storeId ?? ''),
    queryFn: () => fetchDismissals(storeId as string),
    enabled: Boolean(storeId),
  });
}

/** The default scope of "Not on the path yet" — ingredients used by at least one active dinner. */
export function useInRecipeNameKeys() {
  return useQuery({ queryKey: inRecipeKey, queryFn: fetchInRecipeNameKeys });
}

/**
 * Placing and unplacing both invalidate the resolution query — that view is what every part of
 * the page reads its state from, so a placement that did not refresh it would leave the pills,
 * the previews and the unassigned section disagreeing.
 */
export function usePlaceItem(store: Store | null | undefined) {
  return usePathMutation(store?.id, ({ itemId, locationId }: { itemId: string; locationId: string }) =>
    placeItem(store as Store, itemId, locationId),
  );
}

export function useUnplaceItem(storeId: string | undefined) {
  return usePathMutation(storeId, (itemId: string) => unplaceItem(storeId as string, itemId));
}

export function useDismissSuggestion(store: Store | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, suggestedItemId }: { itemId: string; suggestedItemId: string }) =>
      dismissSuggestion(store as Store, itemId, suggestedItemId),
    onSuccess: () => {
      if (!store) return;
      void queryClient.invalidateQueries({ queryKey: dismissalsKey(store.id) });
    },
  });
}
