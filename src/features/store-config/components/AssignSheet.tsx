import { useMemo } from 'react';
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Heading,
  IconButton,
  Stack,
  Text,
} from '@chakra-ui/react';

import { LocationTypeChip } from '@/features/store-config/components/LocationTypeChip';
import { findSimilarPlacedItems, type SimilarityCandidate } from '@/features/store-config/similarity';
import type { Location, ResolvedItem } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * One line of the item's current state, in plain words. This is where the resolution chain
 * becomes visible to the user, so it names the mechanism rather than showing a badge — the
 * whole point of FR-6's three states being legible without a legend.
 */
function resolutionLine(item: ResolvedItem): string {
  const prefix = item.category ? `${item.category} · ` : '';

  if (item.state === 'placed') return `${prefix}placed in ${item.locationName}`;
  if (item.state === 'inherited') return `${prefix}following ${item.viaCategory} to ${item.locationName}`;
  return `${prefix}not placed`;
}

/**
 * The assign flow (story 003): a bottom sheet opened from any placement pill or a "Place"
 * action.
 *
 * Built on Chakra's `Drawer` deliberately — it provides the focus trap, `Escape` close, and
 * focus return to the trigger that the story requires, correctly and without hand-rolling three
 * things that regress silently.
 *
 * Suggestions are computed here rather than fetched: candidates are the resolution rows already
 * loaded whose state is `placed`, which is exactly story 001's rule that **inherited placements
 * are never evidence**.
 */
export function AssignSheet({
  item,
  locations,
  allItems,
  dismissedItemIds,
  isOpen,
  isSaving,
  finalFocusRef,
  onClose,
  onPlace,
  onUnplace,
  onDismissSuggestion,
}: {
  item: ResolvedItem | null;
  locations: Location[];
  /** Every resolved item in the store — the pool the suggestion candidates are drawn from. */
  allItems: ResolvedItem[];
  dismissedItemIds: ReadonlySet<string>;
  isOpen: boolean;
  isSaving: boolean;
  finalFocusRef?: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onPlace: (locationId: string) => void;
  onUnplace: () => void;
  onDismissSuggestion: (suggestedItemId: string) => void;
}) {
  const suggestions = useMemo(() => {
    if (!item) return [];

    // Only items with an EXPLICIT placement are evidence (story 001). An inherited item sits
    // where its category happens to point, which says nothing about this item.
    const candidates: SimilarityCandidate[] = allItems
      .filter((other) => other.state === 'placed' && other.locationId && other.locationName)
      .map((other) => ({
        itemId: other.itemId,
        name: other.itemName,
        category: other.category,
        locationId: other.locationId as string,
        locationName: other.locationName as string,
      }));

    return findSimilarPlacedItems(
      { itemId: item.itemId, name: item.itemName, category: item.category },
      candidates,
      dismissedItemIds,
    );
  }, [item, allItems, dismissedItemIds]);

  if (!item) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="bottom" finalFocusRef={finalFocusRef}>
      <DrawerOverlay bg="rgba(35,32,25,0.32)" />
      <DrawerContent borderTopRadius="card" bg="paper.base" maxH="85vh">
        <DrawerBody px={4} py={4}>
          <Stack gap={5}>
            <Stack gap={0.5}>
              <Text textStyle="meta" color="ink.400">
                Where do you find it
              </Text>
              <Heading as="h2" fontFamily="heading" fontWeight={500} fontSize="lg" color="ink.900">
                {item.itemName}
              </Heading>
              <Text textStyle="faint" color="ink.500">
                {resolutionLine(item)}
              </Text>
            </Stack>

            {/*
              When nothing clears the cutoff this block is simply absent — no "no suggestions
              found" copy. The flow has one shape either way, so a precision-tuned algorithm
              that stays quiet costs the user nothing but two taps.
            */}
            {suggestions.length > 0 && (
              <Box bg="brand.50" borderWidth="1px" borderColor="line.brandSubtle" borderRadius="card" p={3}>
                <Stack gap={2.5}>
                  <Text textStyle="sectionLabel">You put something like it here</Text>
                  {suggestions.map((suggestion) => (
                    <HStack
                      key={suggestion.itemId}
                      gap={2}
                      bg="paper.base"
                      borderWidth="1px"
                      borderColor="line.brand"
                      borderRadius="control"
                      p={2.5}
                    >
                      <Stack gap={0} flex="1" minW={0}>
                        <Text color="ink.900" noOfLines={1}>
                          {suggestion.name.toLowerCase()}
                        </Text>
                        <Text textStyle="meta" color="ink.500" noOfLines={1}>
                          {suggestion.locationName}
                        </Text>
                      </Stack>
                      <Button size="sm" onClick={() => onPlace(suggestion.locationId)} isDisabled={isSaving}>
                        Same spot
                      </Button>
                      <IconButton
                        size="sm"
                        variant="outline"
                        aria-label={`Not like ${suggestion.name}`}
                        icon={<uiIcons.remove size={14} strokeWidth={2} />}
                        onClick={() => onDismissSuggestion(suggestion.itemId)}
                        isDisabled={isSaving}
                      />
                    </HStack>
                  ))}
                </Stack>
              </Box>
            )}

            <Stack gap={2}>
              <Text textStyle="sectionLabel">
                {suggestions.length > 0 ? 'Or pick a spot' : 'Pick a spot'}
              </Text>
              {locations.map((location) => {
                const isCurrent = item.state === 'placed' && item.locationId === location.id;

                return (
                  <HStack
                    key={location.id}
                    as="button"
                    type="button"
                    gap={2.5}
                    w="100%"
                    minH="44px"
                    px={3}
                    py={2}
                    textAlign="left"
                    borderWidth="1px"
                    borderColor={isCurrent ? 'line.brand' : 'line.subtle'}
                    borderRadius="card"
                    bg="paper.base"
                    aria-label={`Put ${item.itemName} in ${location.name}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => onPlace(location.id)}
                    disabled={isSaving}
                  >
                    <LocationTypeChip name={location.name} />
                    <Text flex="1" color="ink.900" noOfLines={1}>
                      {location.name}
                    </Text>
                    {isCurrent && (
                      <Box color="brand.500" aria-hidden>
                        <uiIcons.check size={16} strokeWidth={2.5} />
                      </Box>
                    )}
                  </HStack>
                );
              })}
            </Stack>

            {/* Offered only for an explicit placement — there is nothing to remove otherwise. */}
            {item.state === 'placed' && (
              <Button variant="outline" color="ink.400" onClick={onUnplace} isDisabled={isSaving}>
                Take it off the path
              </Button>
            )}
          </Stack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
