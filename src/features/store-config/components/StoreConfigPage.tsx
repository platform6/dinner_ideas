import { useMemo, useRef, useState } from 'react';
import { Alert, AlertIcon, Center, HStack, Heading, Spinner, Stack, Text } from '@chakra-ui/react';

import { AddStopRow } from '@/features/store-config/components/AddStopRow';
import { AssignSheet } from '@/features/store-config/components/AssignSheet';
import { FirstRunPanel } from '@/features/store-config/components/FirstRunPanel';
import { LocationRow } from '@/features/store-config/components/LocationRow';
import { UnassignedSection } from '@/features/store-config/components/UnassignedSection';
import { AllGroceriesList } from '@/features/store-config/components/AllGroceriesList';
import { CategoryPlacementSection } from '@/features/store-config/components/CategoryPlacementSection';
import {
  useActiveStore,
  useAddLocation,
  useCategoryPlacements,
  useCountPlacementsAtLocation,
  useDeleteLocation,
  useDismissSuggestion,
  useDismissals,
  useInRecipeNameKeys,
  useLocations,
  usePlaceItem,
  useRenameLocation,
  useReorderLocation,
  useResolvedItems,
  useSetCategoryPlacement,
  useUnplaceItem,
  useUnsetCategoryPlacement,
} from '@/features/store-config/hooks';
import type { ResolvedItem } from '@/features/store-config/types';

/**
 * The "Walking path" page (FR-11): ONE ordered list of stops, sections and aisles as visual
 * peers — replacing the two-panel "Rows + Category assignments" layout of intent 001 unit 004.
 *
 * Copy here deliberately avoids the vocabulary of the data model. The page is a "walking path",
 * a location is a "stop"; "placement", "assignment", "inherited" and "unassigned" are
 * implementation words and must not reach the interface.
 *
 * Single column at every width (story 005) — the path is a sequence read top to bottom, and that
 * is true on a phone and on a desktop. The extra desktop width goes to the measure, not to a
 * second panel.
 */
export function StoreConfigPage() {
  const store = useActiveStore();
  const storeId = store.data?.id;
  const locations = useLocations(storeId);
  const resolved = useResolvedItems(storeId);
  const dismissals = useDismissals(storeId);
  const inRecipeNameKeys = useInRecipeNameKeys();

  const addLocation = useAddLocation(store.data);
  const renameLocation = useRenameLocation(storeId);
  const reorderLocation = useReorderLocation(storeId);
  const deleteLocation = useDeleteLocation(storeId);
  const countPlacements = useCountPlacementsAtLocation();
  const placeItem = usePlaceItem(store.data);
  const unplaceItem = useUnplaceItem(storeId);
  const dismissSuggestion = useDismissSuggestion(store.data);
  const categoryPlacements = useCategoryPlacements(storeId);
  const setCategoryPlacement = useSetCategoryPlacement(store.data);
  const unsetCategoryPlacement = useUnsetCategoryPlacement(storeId);

  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removalCount, setRemovalCount] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const assignTriggerRef = useRef<HTMLButtonElement | null>(null);

  const allItems = useMemo(() => resolved.data ?? [], [resolved.data]);

  /** Items grouped by the stop they resolve to — the source of each row's preview and count. */
  const itemsByLocation = useMemo(() => {
    const grouped = new Map<string, ResolvedItem[]>();
    for (const item of allItems) {
      if (!item.locationId) continue;
      const existing = grouped.get(item.locationId);
      if (existing) existing.push(item);
      else grouped.set(item.locationId, [item]);
    }
    for (const items of grouped.values()) items.sort((a, b) => a.itemName.localeCompare(b.itemName));
    return grouped;
  }, [allItems]);

  const unassignedItems = useMemo(
    () =>
      allItems
        .filter((item) => item.state === 'unassigned')
        .sort((a, b) => a.itemName.localeCompare(b.itemName)),
    [allItems],
  );

  /** Pairings this item's owner already rejected — excluded from its suggestions. */
  const dismissedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dismissal of dismissals.data ?? []) {
      if (dismissal.item_id === assigningItemId) ids.add(dismissal.suggested_item_id);
    }
    return ids;
  }, [dismissals.data, assigningItemId]);

  const assigningItem = allItems.find((item) => item.itemId === assigningItemId) ?? null;

  if (store.isLoading || locations.isLoading || resolved.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (store.isError || locations.isError || resolved.isError) {
    return (
      <Alert status="error" borderRadius="field">
        <AlertIcon />
        Couldn&rsquo;t load your walking path. Try refreshing the page.
      </Alert>
    );
  }

  const stops = locations.data ?? [];
  const isBusy = reorderLocation.isPending || deleteLocation.isPending || renameLocation.isPending;
  const isSaving = placeItem.isPending || unplaceItem.isPending;
  const isMovingCategory = setCategoryPlacement.isPending || unsetCategoryPlacement.isPending;

  function openAssignSheet(item: ResolvedItem, trigger: HTMLButtonElement) {
    assignTriggerRef.current = trigger;
    setAssigningItemId(item.itemId);
  }

  function closeAssignSheet() {
    setAssigningItemId(null);
  }

  /**
   * "Remove" reads the placement count first: an empty stop goes immediately with no dialog
   * (story 002), a stop with placements gets the count-stated confirm (story 006).
   */
  function requestRemoval(locationId: string) {
    setPendingRemovalId(locationId);
    setRemovalCount(null);
    countPlacements.mutate(locationId, {
      onSuccess: (count) => {
        if (count === 0) {
          deleteLocation.mutate(locationId, { onSuccess: () => setPendingRemovalId(null) });
          return;
        }
        setRemovalCount(count);
      },
    });
  }

  function cancelRemoval() {
    setPendingRemovalId(null);
    setRemovalCount(null);
  }

  function move(index: number, direction: -1 | 1) {
    const stop = stops[index];
    const neighbour = stops[index + direction];
    if (!stop || !neighbour) return;

    reorderLocation.mutate(
      { locationId: stop.id, newPosition: neighbour.position },
      { onSuccess: () => setAnnouncement(`${stop.name} moved to position ${neighbour.position}`) },
    );
  }

  return (
    <Stack gap={6} maxW={{ base: '100%', md: '720px' }}>
      <Stack gap={1}>
        <HStack gap={2.5} align="baseline" flexWrap="wrap">
          <Heading textStyle="pageTitle" as="h1">
            Walking path
          </Heading>
          {/*
            Read-only in v1, sized and positioned as the future store selector so adding it in
            v2 is a behavioural change only.
          */}
          {store.data && (
            <Text textStyle="meta" color="ink.500" bg="paper.sunken" px={2} py={0.5} borderRadius="control">
              {store.data.name}
            </Text>
          )}
        </HStack>
        <Text textStyle="faint">
          The order you walk your store, top to bottom. Your shopping list follows it.
        </Text>
      </Stack>

      {stops.length === 0 ? (
        <FirstRunPanel onAddFirstStop={() => addLocation.mutate({ name: 'Produce', position: 1 })} />
      ) : (
        <Stack gap={2}>
          {stops.map((stop, index) => (
            <LocationRow
              key={stop.id}
              location={stop}
              items={itemsByLocation.get(stop.id) ?? []}
              isFirst={index === 0}
              isLast={index === stops.length - 1}
              isBusy={isBusy}
              onMoveEarlier={() => move(index, -1)}
              onMoveLater={() => move(index, 1)}
              onRename={(name) => renameLocation.mutate({ locationId: stop.id, name })}
              onRemove={() => deleteLocation.mutate(stop.id, { onSuccess: () => cancelRemoval() })}
              removalCount={pendingRemovalId === stop.id ? removalCount : null}
              isConfirmingRemoval={pendingRemovalId === stop.id}
              onRequestRemoval={() => requestRemoval(stop.id)}
              onCancelRemoval={cancelRemoval}
              onPlaceItem={openAssignSheet}
            />
          ))}

          <AddStopRow
            isAdding={addLocation.isPending}
            onAdd={(name) => addLocation.mutate({ name, position: stops.length + 1 })}
          />
        </Stack>
      )}

      {stops.length > 0 && (
        <Stack gap={3}>
          <CategoryPlacementSection
            placements={categoryPlacements.data ?? []}
            locations={stops}
            isSaving={isMovingCategory}
            onPlace={(category, locationId) => setCategoryPlacement.mutate({ category, locationId })}
            onUnplace={(category) => unsetCategoryPlacement.mutate(category)}
          />

          <AllGroceriesList items={allItems} onMove={openAssignSheet} />

          <UnassignedSection
            unassignedItems={unassignedItems}
            inRecipeNameKeys={inRecipeNameKeys.data ?? new Set()}
            onPlace={openAssignSheet}
          />
        </Stack>
      )}

      <AssignSheet
        item={assigningItem}
        locations={stops}
        allItems={allItems}
        dismissedItemIds={dismissedItemIds}
        isOpen={assigningItemId !== null}
        isSaving={isSaving}
        finalFocusRef={assignTriggerRef as React.RefObject<HTMLButtonElement>}
        onClose={closeAssignSheet}
        onPlace={(locationId) => {
          if (!assigningItemId) return;
          placeItem.mutate({ itemId: assigningItemId, locationId }, { onSuccess: closeAssignSheet });
        }}
        onUnplace={() => {
          if (!assigningItemId) return;
          unplaceItem.mutate(assigningItemId, { onSuccess: closeAssignSheet });
        }}
        onDismissSuggestion={(suggestedItemId) => {
          if (!assigningItemId) return;
          dismissSuggestion.mutate({ itemId: assigningItemId, suggestedItemId });
        }}
      />

      {/* Arrow presses are announced politely — the visual reorder is not enough on its own. */}
      <Text aria-live="polite" position="absolute" left="-10000px">
        {announcement}
      </Text>
    </Stack>
  );
}
