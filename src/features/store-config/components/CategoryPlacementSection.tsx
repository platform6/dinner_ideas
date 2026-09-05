import { useState } from 'react';
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react';

import type { CategoryPlacementView, IngredientCategory, Location } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * "Where each kind of thing lives" (story 002, FR-2).
 *
 * A category placement is the bulk lever: moving `Dairy` moves every grocery that inherits from
 * it, in one action, while anything explicitly placed stays exactly where the user put it. That
 * asymmetry is the resolution order made visible, so the copy says it rather than leaving the
 * user to discover it.
 *
 * All five categories are always listed, including any sitting nowhere. A category you cannot
 * see is a category you cannot place — which is how three of this household's stops ended up
 * unreachable in the first place.
 */
export function CategoryPlacementSection({
  placements,
  locations,
  isSaving,
  onPlace,
  onUnplace,
}: {
  placements: CategoryPlacementView[];
  locations: Location[];
  isSaving: boolean;
  onPlace: (category: IngredientCategory, locationId: string) => void;
  onUnplace: (category: IngredientCategory) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<IngredientCategory | null>(null);

  const placedCount = placements.filter((entry) => entry.locationId !== null).length;

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
        onClick={() => setIsExpanded((open) => !open)}
      >
        <Stack gap={0} flex="1" minW={0}>
          <Text fontFamily="heading" fontWeight={500} fontSize="md" color="ink.900">
            Where each kind of thing lives
          </Text>
          <Text textStyle="meta" color="ink.500">
            {placedCount === placements.length
              ? 'Every category has a spot'
              : `${placements.length - placedCount} of ${placements.length} have no spot yet`}
          </Text>
        </Stack>
        <Box color="ink.400" aria-hidden>
          {isExpanded ? (
            <uiIcons.collapse size={16} strokeWidth={2} />
          ) : (
            <uiIcons.expand size={16} strokeWidth={2} />
          )}
        </Box>
      </HStack>

      {isExpanded && (
        <Stack gap={0} bg="paper.subtle" borderTopWidth="1px" borderColor="line.subtle" px={3} py={2}>
          <Text textStyle="faint" color="ink.500" py={1}>
            Moving a category moves everything that follows it. Anything you placed yourself stays put.
          </Text>

          {placements.map((entry) => (
            <Stack key={entry.category} gap={1} py={1.5}>
              <HStack gap={2} minH="44px">
                <Text color="ink.900" flex="1" noOfLines={1}>
                  {entry.category}
                </Text>
                <Text textStyle="meta" color={entry.locationName ? 'ink.500' : 'ink.400'} noOfLines={1}>
                  {entry.locationName ?? 'Nowhere yet'}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={isSaving || locations.length === 0}
                  aria-label={`Move ${entry.category}`}
                  onClick={() =>
                    setOpenCategory((current) => (current === entry.category ? null : entry.category))
                  }
                >
                  Move
                </Button>
              </HStack>

              {openCategory === entry.category && (
                <Stack gap={1} pb={1}>
                  {locations.map((location) => (
                    <Button
                      key={location.id}
                      size="sm"
                      variant={location.id === entry.locationId ? 'solid' : 'outline'}
                      justifyContent="flex-start"
                      isDisabled={isSaving}
                      aria-label={`Put ${entry.category} in ${location.name}`}
                      onClick={() => {
                        onPlace(entry.category, location.id);
                        setOpenCategory(null);
                      }}
                    >
                      {location.name}
                    </Button>
                  ))}

                  {/* Offered only when there is a placement to remove — nothing to undo otherwise. */}
                  {entry.locationId && (
                    <Button
                      size="sm"
                      variant="outline"
                      color="ink.400"
                      justifyContent="flex-start"
                      isDisabled={isSaving}
                      onClick={() => {
                        onUnplace(entry.category);
                        setOpenCategory(null);
                      }}
                    >
                      Take {entry.category} off the path
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
