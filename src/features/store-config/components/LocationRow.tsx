import { useState } from 'react';
import { Box, Button, HStack, IconButton, Input, Stack, Text } from '@chakra-ui/react';

import { LocationTypeChip } from '@/features/store-config/components/LocationTypeChip';
import { DeleteLocationConfirm } from '@/features/store-config/components/DeleteLocationConfirm';
import type { Location, ResolvedItem } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/** Item rows shown when expanded, before the "+ N more" link takes over. */
const EXPANDED_ITEM_CAP = 4;
/** Names joined into the collapsed one-line preview. */
const PREVIEW_NAME_CAP = 3;

function previewText(items: ResolvedItem[]): string {
  if (items.length === 0) return 'Nothing here yet';

  const shown = items.slice(0, PREVIEW_NAME_CAP).map((item) => item.itemName);
  const remaining = items.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining} more` : shown.join(', ');
}

/**
 * One stop on the walking path (story 002). Collapsed by default; expanding is local state that
 * deliberately does not persist.
 *
 * The leading 12–14px column is empty in v1 and load-bearing: it is the drag-handle region the
 * spec reserves, so adding drag later changes no other measurement in the row.
 */
export function LocationRow({
  location,
  items,
  isFirst,
  isLast,
  isBusy,
  onMoveEarlier,
  onMoveLater,
  onRename,
  onRemove,
  removalCount,
  isConfirmingRemoval,
  onRequestRemoval,
  onCancelRemoval,
}: {
  location: Location;
  items: ResolvedItem[];
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  /** Placements pointing here — only read once removal has been requested. */
  removalCount: number | null;
  isConfirmingRemoval: boolean;
  onRequestRemoval: () => void;
  onCancelRemoval: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(location.name);

  const visibleItems = items.slice(0, EXPANDED_ITEM_CAP);
  const hiddenItemCount = items.length - visibleItems.length;

  function startRename() {
    setDraftName(location.name);
    setIsRenaming(true);
  }

  function saveRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== location.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <Box bg="paper.base" borderWidth="1px" borderColor="line.subtle" borderRadius="card" overflow="hidden">
      <HStack
        gap={2.5}
        px={3}
        py={2.5}
        align="center"
        cursor={isRenaming ? 'default' : 'pointer'}
        onClick={() => {
          if (!isRenaming) setIsExpanded((open) => !open);
        }}
      >
        {/* Reserved drag-handle column — empty in v1, keeps the geometry stable for v2. */}
        <Box w="13px" flexShrink={0} aria-hidden />

        <LocationTypeChip name={location.name} />

        {isRenaming ? (
          <Input
            flex="1"
            size="sm"
            value={draftName}
            aria-label={`Rename ${location.name}`}
            autoFocus
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveRename();
              if (event.key === 'Escape') setIsRenaming(false);
            }}
          />
        ) : (
          <Stack gap={0} flex="1" minW={0}>
            <Text fontFamily="heading" fontWeight={500} fontSize="md" color="ink.900" noOfLines={1}>
              {location.name}
            </Text>
            <Text textStyle="meta" color="ink.500" noOfLines={1}>
              {previewText(items)}
            </Text>
          </Stack>
        )}

        {!isRenaming && (
          <HStack gap={1.5} flexShrink={0} onClick={(event) => event.stopPropagation()}>
            <Text textStyle="meta" color="ink.500" px={1.5} aria-hidden>
              {items.length}
            </Text>
            <IconButton
              size="sm"
              variant="outline"
              aria-label={`Move ${location.name} earlier`}
              icon={<uiIcons.rowUp size={15} strokeWidth={2} />}
              isDisabled={isFirst || isBusy}
              onClick={onMoveEarlier}
            />
            <IconButton
              size="sm"
              variant="outline"
              aria-label={`Move ${location.name} later`}
              icon={<uiIcons.rowDown size={15} strokeWidth={2} />}
              isDisabled={isLast || isBusy}
              onClick={onMoveLater}
            />
            <IconButton
              size="sm"
              variant="quiet"
              aria-label={`Rename ${location.name}`}
              icon={<uiIcons.settings size={15} strokeWidth={2} />}
              onClick={startRename}
            />
            <Box color="ink.400" aria-hidden>
              {isExpanded ? (
                <uiIcons.collapse size={16} strokeWidth={2} />
              ) : (
                <uiIcons.expand size={16} strokeWidth={2} />
              )}
            </Box>
          </HStack>
        )}
      </HStack>

      {isRenaming && (
        <HStack gap={2} px={3} pb={3} pl="54px" justify="space-between">
          <HStack gap={2}>
            <Button size="sm" onClick={saveRename}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
          </HStack>
          <Button size="sm" variant="quiet" color="heart.700" onClick={onRequestRemoval}>
            Remove
          </Button>
        </HStack>
      )}

      {isConfirmingRemoval && removalCount !== null && removalCount > 0 && (
        <Box px={3} pb={3}>
          <DeleteLocationConfirm
            locationName={location.name}
            affectedCount={removalCount}
            isRemoving={isBusy}
            onKeep={onCancelRemoval}
            onRemove={onRemove}
          />
        </Box>
      )}

      {isExpanded && !isRenaming && (
        <Stack gap={0} bg="paper.subtle" borderTopWidth="1px" borderColor="line.subtle" px={3} py={2}>
          {items.length === 0 ? (
            <Text textStyle="meta" color="ink.500" pl="41px" py={1}>
              Nothing here yet
            </Text>
          ) : (
            <>
              {visibleItems.map((item) => (
                <Text key={item.itemId} textStyle="meta" color="ink.700" pl="41px" py={1} noOfLines={1}>
                  {item.itemName}
                </Text>
              ))}
              {hiddenItemCount > 0 && (
                <Text textStyle="meta" color="brand.500" pl="41px" py={1}>
                  + {hiddenItemCount} more
                </Text>
              )}
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}
