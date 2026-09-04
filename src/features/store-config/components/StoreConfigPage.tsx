import { useMemo, useState } from 'react';
import { Alert, AlertIcon, Center, Heading, Spinner, Stack, Text } from '@chakra-ui/react';

import { AddStopRow } from '@/features/store-config/components/AddStopRow';
import { LocationRow } from '@/features/store-config/components/LocationRow';
import {
  useActiveStore,
  useAddLocation,
  useCountPlacementsAtLocation,
  useDeleteLocation,
  useLocations,
  useRenameLocation,
  useReorderLocation,
  useResolvedItems,
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
 * Placing an individual ingredient is bolt 053 — this bolt builds the path the placements will
 * point at.
 */
export function StoreConfigPage() {
  const store = useActiveStore();
  const storeId = store.data?.id;
  const locations = useLocations(storeId);
  const resolved = useResolvedItems(storeId);

  const addLocation = useAddLocation(store.data);
  const renameLocation = useRenameLocation(storeId);
  const reorderLocation = useReorderLocation(storeId);
  const deleteLocation = useDeleteLocation(storeId);
  const countPlacements = useCountPlacementsAtLocation();

  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removalCount, setRemovalCount] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /** Items grouped by the stop they resolve to — the source of each row's preview and count. */
  const itemsByLocation = useMemo(() => {
    const grouped = new Map<string, ResolvedItem[]>();
    for (const item of resolved.data ?? []) {
      if (!item.locationId) continue;
      const existing = grouped.get(item.locationId);
      if (existing) existing.push(item);
      else grouped.set(item.locationId, [item]);
    }
    for (const items of grouped.values()) items.sort((a, b) => a.itemName.localeCompare(b.itemName));
    return grouped;
  }, [resolved.data]);

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
      {
        onSuccess: () => setAnnouncement(`${stop.name} moved to position ${neighbour.position}`),
      },
    );
  }

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading textStyle="pageTitle" as="h1">
          Walking path
        </Heading>
        <Text textStyle="faint">
          The order you walk your store, top to bottom. Your shopping list follows it.
        </Text>
      </Stack>

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
          />
        ))}

        <AddStopRow
          isAdding={addLocation.isPending}
          onAdd={(name) => addLocation.mutate({ name, position: stops.length + 1 })}
        />
      </Stack>

      {/* Arrow presses are announced politely — the visual reorder is not enough on its own. */}
      <Text aria-live="polite" position="absolute" left="-10000px">
        {announcement}
      </Text>
    </Stack>
  );
}
