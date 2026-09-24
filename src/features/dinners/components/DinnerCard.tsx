import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Center,
  HStack,
  Heading,
  Input,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  OrderedList,
  Spinner,
  Stack,
  Text,
  UnorderedList,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';

import { useAddTag, useDinnerFullDetails, useRemoveTag } from '@/features/dinners/hooks';
import { isRosieApproved } from '@/features/dinners/tags';
import type { CatalogDinner } from '@/features/dinners/types';
import { RemoveDinnerDialog } from '@/features/dinners/components/RemoveDinnerDialog';
import { cardMenuDistance } from '@/features/dinners/components/card-menu-offset';
import { categoryIcon, cuisineIcon, metaIcons, stepIcon, uiIcons } from '@/shared/components/icons';

interface SelectionProps {
  isSelected: boolean;
  /** True when the week already holds `dinners_per_week` picks and this one isn't one of them. */
  selectionDisabled: boolean;
  isTogglingSelection: boolean;
  onToggleSelect: (id: string) => void;
}

interface DinnerCardProps {
  dinner: CatalogDinner;
  /** Suppress ("Not interested") lives in this card's overflow menu, per FR-5 — not a persistent
   * button. Suppressed dinners no longer render through this component at all; they get their
   * own row layout on `SuppressedPage`. */
  onSuppress: (id: string) => void;
  isMutating: boolean;
  selection: SelectionProps;
  /** "Last made 2 weeks ago" / "Never made" — see `last-chosen.ts#formatLastChosen`. */
  lastChosenText?: string;
}

/** Expandable "Details" section (FR-10): ordered steps, ingredients, and tag management (FR-9). */
function DinnerCardDetails({ dinnerId }: { dinnerId: string }) {
  const details = useDinnerFullDetails(dinnerId, true);
  const addTag = useAddTag();
  const removeTag = useRemoveTag();
  const [newTagName, setNewTagName] = useState('');

  function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    addTag.mutate({ dinnerId, tagName: name });
    setNewTagName('');
  }

  if (details.isLoading) {
    return (
      <Center py={3}>
        <Spinner size="sm" />
      </Center>
    );
  }

  if (details.isError || !details.data) {
    return (
      <Alert status="error" borderRadius="field" fontSize="sm">
        <AlertIcon />
        Couldn’t load details for this dinner.
      </Alert>
    );
  }

  const { dinner_steps, dinner_ingredients, tags } = details.data;

  return (
    <Stack gap={3} pt={3} borderTopWidth="1px" borderColor="line.subtle" mt={2}>
      <Box>
        <Text textStyle="sectionLabel" mb={1.5}>
          Ingredients
        </Text>
        {dinner_ingredients.length === 0 ? (
          <Text textStyle="faint">No ingredients recorded.</Text>
        ) : (
          <UnorderedList styleType="none" ms={0} spacing={1}>
            {dinner_ingredients.map((ingredient) => {
              const CategoryIcon = categoryIcon(ingredient.category);
              return (
                <ListItem key={ingredient.id}>
                  <HStack gap={2} fontSize="0.8125rem" color="ink.700">
                    <CategoryIcon size={14} strokeWidth={1.8} color="var(--chakra-colors-ink-400)" />
                    <Text as="span">
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </Text>
                  </HStack>
                </ListItem>
              );
            })}
          </UnorderedList>
        )}
      </Box>

      <Box>
        <Text textStyle="sectionLabel" mb={1.5}>
          Steps
        </Text>
        {dinner_steps.length === 0 ? (
          <Text textStyle="faint">No steps recorded.</Text>
        ) : (
          <OrderedList styleType="none" ms={0} spacing={1.5}>
            {dinner_steps.map((step) => {
              const StepIcon = stepIcon(step.instruction);
              return (
                <ListItem key={step.id}>
                  <HStack align="start" gap={2} fontSize="0.8125rem" color="ink.700">
                    <StepIcon
                      size={14}
                      strokeWidth={1.8}
                      color="var(--chakra-colors-brand-500)"
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    />
                    <Text as="span">{step.instruction}</Text>
                  </HStack>
                </ListItem>
              );
            })}
          </OrderedList>
        )}
      </Box>

      <Box>
        <Text textStyle="sectionLabel" mb={1.5}>
          Tags
        </Text>
        <Wrap mb={2}>
          {tags.map((tag) => (
            <WrapItem key={tag.id}>
              <Badge variant="muted" display="flex" alignItems="center" gap={1}>
                {tag.name}
                <CloseButton
                  size="sm"
                  aria-label={`Remove tag ${tag.name}`}
                  isDisabled={removeTag.isPending}
                  onClick={() => removeTag.mutate({ dinnerId, tagId: tag.id })}
                />
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
        <HStack>
          <Input
            size="sm"
            maxW="10rem"
            placeholder="Add a tag"
            aria-label="New tag name"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTag();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddTag}
            isLoading={addTag.isPending}
            isDisabled={!newTagName.trim()}
          >
            +
          </Button>
        </HStack>
        {addTag.isError && (
          <Text textStyle="faint" color="heart.500" mt={1}>
            Couldn’t add that tag, try again.
          </Text>
        )}
      </Box>
    </Stack>
  );
}

/**
 * The pick control (FR-2/FR-3): a 3-state pill — outline "Pick" -> solid "Picked" -> locked
 * "Full" once `dinners_per_week` are already chosen — backed by a real `Checkbox` so the existing
 * `getByRole('checkbox', { name: 'Pick X for this week' })` test contract (and the underlying
 * accessibility semantics) keep working unchanged. The pill visual replaces the checkbox's
 * default control/label rendering via `sx`, not the input itself.
 */
function PickPill({ dinner, selection }: { dinner: CatalogDinner; selection: SelectionProps }) {
  const isLocked = selection.selectionDisabled && !selection.isSelected;
  const Icon = selection.isSelected ? uiIcons.check : isLocked ? uiIcons.locked : uiIcons.add;
  const label = selection.isSelected ? 'Picked' : isLocked ? 'Full' : 'Pick';

  return (
    <Checkbox
      isChecked={selection.isSelected}
      isDisabled={selection.selectionDisabled || selection.isTogglingSelection}
      onChange={() => selection.onToggleSelect(dinner.id)}
      aria-label={`Pick ${dinner.name} for this week`}
      sx={{ '.chakra-checkbox__control': { display: 'none' } }}
    >
      <HStack
        as="span"
        gap={1.5}
        px={3}
        // The catalog's primary action, so it meets the 44px minimum on a phone (intent 024, FR-1).
        // Hard-coded here rather than inherited: the pill is a styled `Checkbox`, not a `Button`.
        h={['44px', null, '34px']}
        borderRadius="chip"
        borderWidth="1px"
        fontSize="0.75rem"
        fontWeight={600}
        borderColor={selection.isSelected ? 'brand.500' : isLocked ? 'paper.sunken' : 'line.brand'}
        bg={selection.isSelected ? 'brand.500' : isLocked ? 'paper.sunken' : 'transparent'}
        color={selection.isSelected ? 'paper.base' : isLocked ? 'ink.300' : 'brand.500'}
      >
        <Icon size={14} strokeWidth={2.2} />
        <Text as="span">{label}</Text>
      </HStack>
    </Checkbox>
  );
}

export function DinnerCard({ dinner, onSuppress, isMutating, selection, lastChosenText }: DinnerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Opens the action menu below the whole header block, so a wrapped title stays readable (intent
  // 019, FR-7). A Popper offset function, measured each time the menu is positioned: Chakra applies
  // custom `modifiers` after its own, to let callers override them. Refs only, so it never changes.
  const menuModifiers = useMemo(
    () => [
      {
        name: 'offset',
        options: {
          offset: ({ placement }: { placement: string }) => [
            0,
            cardMenuDistance(
              placement,
              menuButtonRef.current?.getBoundingClientRect().bottom ?? null,
              headerRef.current?.getBoundingClientRect().bottom ?? null,
            ),
          ],
        },
      },
    ],
    [],
  );
  const CuisineIcon = cuisineIcon(dinner.cuisine_type);
  const isLocked = selection.selectionDisabled && !selection.isSelected;
  const visibleTags = dinner.tags.filter((tag) => tag !== 'rosie-approved');

  return (
    <Box
      layerStyle={selection.isSelected ? 'cardSelected' : 'card'}
      // This Box is the catalog grid's item. Open, it spans the whole row so no card sits beside a
      // tall empty space (intent 019, FR-4). `1 / -1` covers however many columns the grid has, and
      // at one column changes nothing. The grid never backfills, so order stays as listed.
      gridColumn={isExpanded ? '1 / -1' : undefined}
      opacity={isLocked ? 0.55 : 1}
      transition="opacity 0.15s ease, border-color 0.12s ease"
      _hover={{ borderColor: 'line.brand' }}
    >
      <HStack ref={headerRef} justify="space-between" align="start" mb={2} gap={2}>
        <HStack align="start" gap={3}>
          <Center w="76px" h="76px" borderRadius="control" bg="paper.sunken" color="ink.300" flexShrink={0}>
            <CuisineIcon size={30} strokeWidth={1.5} />
          </Center>
          <Box>
            <Heading textStyle="cardTitle">{dinner.name}</Heading>
            <HStack gap={2} mt={1} textStyle="meta">
              <HStack gap={1}>
                <CuisineIcon size={13} strokeWidth={1.8} />
                <Text as="span">{dinner.cuisine_type}</Text>
              </HStack>
              <HStack gap={1}>
                <metaIcons.cookTime size={13} strokeWidth={1.8} />
                <Text as="span">{dinner.cook_time_minutes} min</Text>
              </HStack>
            </HStack>
          </Box>
        </HStack>
        <HStack gap={1} flexShrink={0}>
          {isRosieApproved(dinner.tags) && (
            <Box color="heart.500" aria-label="Rosie approved" title="Rosie approved">
              <metaIcons.rosieApproved size={17} strokeWidth={1.8} fill="currentColor" />
            </Box>
          )}
          {/* FR-5: "Not interested" lives here, not as a persistent button on the card face —
              a rare, destructive-feeling action shouldn't sit next to the primary pick action. */}
          <Menu placement="bottom-end" modifiers={menuModifiers}>
            <MenuButton
              ref={menuButtonRef}
              as={Button}
              variant="ghost"
              size="sm"
              aria-label={`More actions for ${dinner.name}`}
              isLoading={isMutating}
            >
              <uiIcons.overflowMenu size={17} strokeWidth={2} />
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => onSuppress(dinner.id)}>Not interested</MenuItem>
              {/* Intent 018, bolt 072: permanent, so it asks first (the ellipsis) and reads as
                  destructive (red) — never to be mistaken for "Not interested", which hides and can
                  be undone from the Suppressed page. */}
              <MenuItem color="heart.500" onClick={() => setIsRemoving(true)}>
                Remove…
              </MenuItem>
            </MenuList>
          </Menu>
          <RemoveDinnerDialog
            dinnerId={dinner.id}
            dinnerName={dinner.name}
            isOpen={isRemoving}
            onClose={() => setIsRemoving(false)}
            onHideInstead={() => onSuppress(dinner.id)}
          />
        </HStack>
      </HStack>

      {visibleTags.length > 0 && (
        <Wrap mb={2}>
          {visibleTags.map((tag) => (
            <WrapItem key={tag}>
              <Badge variant="muted">{tag}</Badge>
            </WrapItem>
          ))}
        </Wrap>
      )}

      {lastChosenText && (
        <HStack textStyle="faint" gap={1} mb={3}>
          {lastChosenText.toLowerCase().includes('never') ? (
            <metaIcons.neverMade size={13} strokeWidth={1.8} />
          ) : (
            <metaIcons.lastMade size={13} strokeWidth={1.8} />
          )}
          <Text as="span">{lastChosenText}</Text>
        </HStack>
      )}

      <HStack justify="space-between" align="center">
        <PickPill dinner={dinner} selection={selection} />
        <Button
          size="sm"
          variant="ghost"
          rightIcon={isExpanded ? <uiIcons.collapse size={14} /> : <uiIcons.expand size={14} />}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          Details
        </Button>
      </HStack>
      {isExpanded && <DinnerCardDetails dinnerId={dinner.id} />}
    </Box>
  );
}
