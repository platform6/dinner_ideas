import { useMemo, useState } from 'react';
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react';

import { findSimilarPlacedItems, type SimilarityCandidate } from '@/features/store-config/similarity';
import type { ResolvedItem } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * Where the item sits now and how it got there — the same phrasing `AllGroceriesList` uses, so
 * the two lists read as one vocabulary rather than two.
 */
function placementLine(item: ResolvedItem): string {
  if (!item.locationName) return 'No spot yet';
  if (item.state === 'placed') return `${item.locationName} · you chose this`;
  return item.viaCategory ? `${item.locationName} · follows ${item.viaCategory}` : item.locationName;
}

/**
 * "New — needs review" (story 004, FR-5).
 *
 * This section replaces the one intent 010 shipped, which listed items whose state was
 * `unassigned`. That population is **empty by construction**: `dinner_ingredients.category` is
 * NOT NULL over five values and the cutover placed all five, so every item inherits a stop and
 * `unassigned` is reachable only for a registry orphan. The section was permanently empty in
 * production, and since it was one of only two ways into the assign flow, most of the registry
 * was unplaceable.
 *
 * The population it was reaching for is **unreviewed** — things that arrived and nobody has
 * checked. That is a normal, common state, which is what intent 010's FR-6 wrongly claimed
 * `unassigned` was.
 *
 * The question each row asks is therefore "is that right?", not "where does this go?" — the item
 * already has a stop. Accepting is a real answer and writes no placement: a category default the
 * user agrees with is a decision, not an absence of one.
 */
export function NeedsReviewSection({
  unreviewedItems,
  allItems,
  dismissedItemIds,
  isSaving,
  onAccept,
  onMove,
  onAcceptSuggestion,
}: {
  unreviewedItems: ResolvedItem[];
  /** The pool similarity draws candidates from — every item in the store. */
  allItems: ResolvedItem[];
  dismissedItemIds: ReadonlySet<string>;
  isSaving: boolean;
  onAccept: (item: ResolvedItem) => void;
  onMove: (item: ResolvedItem, trigger: HTMLButtonElement) => void;
  onAcceptSuggestion: (item: ResolvedItem, locationId: string) => void;
}) {
  const sorted = useMemo(
    () => [...unreviewedItems].sort((a, b) => a.itemName.localeCompare(b.itemName)),
    [unreviewedItems],
  );

  /**
   * Opens itself when there is something to check and stays shut when there is not — a queue
   * the user has to go looking for is a queue that gets ignored, but an empty one demanding
   * attention is worse. `null` means "nobody has toggled it", so the section follows the data
   * until the user overrides it, and then respects the override.
   */
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const isExpanded = expandedOverride ?? sorted.length > 0;

  /**
   * Candidates are items the user has placed EXPLICITLY (intent 010, story 001). An inherited
   * item sits where its category happens to point, which is evidence about the category, not
   * about the item.
   *
   * Consequence worth knowing: a household that has never placed anything by hand has an empty
   * candidate pool, so no row shows a suggestion. That is every household on day one. The
   * feature bootstraps — place a few things and the next arrival gets a suggestion — and the
   * queue works without it, since every row already shows its current stop and offers Accept.
   */
  const candidates = useMemo<SimilarityCandidate[]>(
    () =>
      allItems
        .filter((other) => other.state === 'placed' && other.locationId && other.locationName)
        .map((other) => ({
          itemId: other.itemId,
          name: other.itemName,
          category: other.category,
          locationId: other.locationId as string,
          locationName: other.locationName as string,
        })),
    [allItems],
  );

  return (
    <Box borderWidth="1px" borderColor="line.subtle" borderRadius="card" bg="paper.base">
      <HStack
        as="button"
        type="button"
        w="100%"
        px={3}
        py={3}
        gap={2}
        textAlign="left"
        aria-expanded={isExpanded}
        onClick={() => setExpandedOverride(!isExpanded)}
      >
        <Stack gap={0} flex="1" minW={0}>
          <Text fontFamily="heading" fontWeight={500} fontSize="md" color="ink.900">
            New — needs review
          </Text>
          <Text textStyle="meta" color="ink.500">
            {sorted.length === 0
              ? 'Nothing new to check'
              : sorted.length === 1
                ? '1 grocery nobody has checked yet'
                : `${sorted.length} groceries nobody has checked yet`}
          </Text>
        </Stack>
        {sorted.length > 0 && (
          <Text textStyle="meta" color="ink.500" bg="paper.sunken" px={2} py={0.5} borderRadius="control">
            {sorted.length}
          </Text>
        )}
        <Box color="ink.400" aria-hidden>
          {isExpanded ? (
            <uiIcons.collapse size={16} strokeWidth={2} />
          ) : (
            <uiIcons.expand size={16} strokeWidth={2} />
          )}
        </Box>
      </HStack>

      {isExpanded && (
        <Stack gap={2} bg="paper.subtle" borderTopWidth="1px" borderColor="line.subtle" px={3} py={3}>
          {sorted.length === 0 ? (
            // Vacuously true and calm. Nothing here announces its own absence.
            <Text textStyle="faint" color="ink.500" py={1}>
              Nothing new to check.
            </Text>
          ) : (
            sorted.map((item) => {
              const suggestion = findSimilarPlacedItems(
                { itemId: item.itemId, name: item.itemName, category: item.category },
                candidates,
                dismissedItemIds,
              )[0];

              // A suggestion naming the stop the item already inherits restates the default.
              // Silence is more useful than an agreement with the status quo.
              const isUseful = suggestion && suggestion.locationId !== item.locationId;

              return (
                <Stack
                  key={item.itemId}
                  gap={1.5}
                  px={3}
                  py={2.5}
                  bg="paper.base"
                  borderWidth="1px"
                  borderColor="line.subtle"
                  borderRadius="card"
                >
                  <Stack gap={0} minW={0}>
                    <Text color="ink.900" noOfLines={1}>
                      {item.itemName}
                    </Text>
                    <Text textStyle="meta" color="ink.400" noOfLines={1}>
                      {placementLine(item)}
                    </Text>
                  </Stack>

                  {/*
                    Present only when similarity found something that disagrees with the current
                    stop. When it finds nothing the block is simply absent — omission, never an
                    announcement that there is no suggestion (intent 010, FR-12).
                  */}
                  {isUseful && (
                    <HStack gap={2} minH="44px">
                      <Text textStyle="meta" color="ink.500" flex="1" noOfLines={1}>
                        You put {suggestion.name} in {suggestion.locationName}
                      </Text>
                      <Button
                        size="sm"
                        variant="outline"
                        isDisabled={isSaving}
                        aria-label={`Put ${item.itemName} in ${suggestion.locationName}`}
                        onClick={() => onAcceptSuggestion(item, suggestion.locationId)}
                      >
                        Same spot
                      </Button>
                    </HStack>
                  )}

                  <HStack gap={2}>
                    <Button
                      size="sm"
                      flex="1"
                      isDisabled={isSaving}
                      aria-label={`${item.itemName} is in the right place`}
                      onClick={() => onAccept(item)}
                    >
                      Looks right
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      flex="1"
                      isDisabled={isSaving}
                      aria-label={`Move ${item.itemName}`}
                      onClick={(event) => onMove(item, event.currentTarget)}
                    >
                      Move it
                    </Button>
                  </HStack>
                </Stack>
              );
            })
          )}
        </Stack>
      )}
    </Box>
  );
}
