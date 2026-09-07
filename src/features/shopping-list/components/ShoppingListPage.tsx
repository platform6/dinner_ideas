import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Checkbox,
  CloseButton,
  Heading,
  HStack,
  IconButton,
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
  Textarea,
  useBreakpointValue,
} from '@chakra-ui/react';

import { useCurrentPlan } from '@/features/weekly-plan/hooks';
import { buildShoppingList } from '@/features/shopping-list/aggregate';
import { nameKey, reorderGroupsByLocation } from '@/features/shopping-list/reorder';
import { formatShoppingListText } from '@/features/shopping-list/format';
import { useShoppingListDinners } from '@/features/shopping-list/hooks';
import { AssignSheet } from '@/features/store-config/components/AssignSheet';
import {
  useActiveStore,
  useDismissSuggestion,
  useDismissals,
  useLocations,
  useMarkItemReviewed,
  usePlaceItem,
  useResolvedItems,
  useUnplaceItem,
} from '@/features/store-config/hooks';
import type { ResolvedItem } from '@/features/store-config/types';
import { categoryIcon, uiIcons } from '@/shared/components/icons';

function itemKey(category: string, name: string, unit: string) {
  return `${category}-${name}-${unit}`;
}

export function ShoppingListPage() {
  const currentPlan = useCurrentPlan();
  const plan = currentPlan.data;
  const selections = plan?.weekly_plan_selections ?? [];
  const dinnerIds = useMemo(() => (plan?.weekly_plan_selections ?? []).map((s) => s.dinner_id), [plan]);

  const dinners = useShoppingListDinners(dinnerIds);
  // The shopping list reads the SAME resolution view the store-config page does (unit 1,
  // story 004) — one definition of where an ingredient sorts, two consumers.
  const store = useActiveStore();
  const storeId = store.data?.id;
  const resolved = useResolvedItems(storeId);
  // Unit 3: the move affordance reuses `/store`'s flow wholesale — same sheet, same suggestions,
  // same writes. Only the entry point is new.
  const locations = useLocations(storeId);
  const dismissals = useDismissals(storeId);
  const placeItem = usePlaceItem(store.data);
  const unplaceItem = useUnplaceItem(storeId);
  const markReviewed = useMarkItemReviewed(storeId);
  const dismissSuggestion = useDismissSuggestion(store.data);

  const isLocked = plan?.locked_at != null;

  // md+: the Copy control sits in the page header and the list flows into two columns;
  // phone keeps the sticky footer and a single column (a phone affordance — review finding 3).
  const actionsInHeader = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? false;

  const [isCopying, setIsCopying] = useState(false);
  const [copyOutcome, setCopyOutcome] = useState<{ clipboardOk: boolean } | null>(null);
  // Purely local "picked up in the store" state — never persisted, resets on remount.
  //
  // Keyed by category-name-unit, NOT by anything positional: a move changes where an item sits in
  // the store, never its category, name or unit, so every key survives a re-sort untouched and
  // this Set needs no migration. `preserves check state across a move` pins that.
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  /** The line the assign sheet is open for — its registry id, plus its row key for scroll anchoring. */
  const [assigning, setAssigning] = useState<{ itemId: string; rowKey: string } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const assignTriggerRef = useRef<HTMLButtonElement | null>(null);
  const rowNodes = useRef(new Map<string, HTMLElement>());
  const scrollAnchor = useRef<{ rowKey: string; top: number } | null>(null);

  const groups = useMemo(() => {
    const built = buildShoppingList(dinners.data ?? []);
    return reorderGroupsByLocation(built, resolved.data ?? []);
  }, [dinners.data, resolved.data]);

  const allItems = useMemo(() => resolved.data ?? [], [resolved.data]);
  const stops = useMemo(() => locations.data ?? [], [locations.data]);

  /**
   * Aggregated line → registry item, by the SAME identity rule the sort uses (`items.name_key`).
   * Imported rather than re-derived: two copies of that normalisation is the drift `reorder.ts`
   * warns about, just spread across two files.
   */
  const itemByNameKey = useMemo(() => {
    const byKey = new Map<string, ResolvedItem>();
    for (const item of allItems) byKey.set(item.nameKey, item);
    return byKey;
  }, [allItems]);

  const assigningItem = allItems.find((item) => item.itemId === assigning?.itemId) ?? null;

  const dismissedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dismissal of dismissals.data ?? []) {
      if (dismissal.item_id === assigning?.itemId) ids.add(dismissal.suggested_item_id);
    }
    return ids;
  }, [dismissals.data, assigning?.itemId]);

  /**
   * Keeps the row the user just moved under their thumb.
   *
   * A re-sort shifts every group below the change, which mid-shop means a part-checked list slides
   * out from under the reader — the one outcome the story calls worse than not offering the move at
   * all. So: record the moved row's viewport offset at the moment of the write, and after the new
   * order paints, scroll by whatever it drifted.
   *
   * Runs on `groups` identity rather than on the order alone so a move that does NOT reorder still
   * clears the anchor; a stale one would misapply itself to somebody else's re-sort later.
   */
  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    if (!anchor) return;
    scrollAnchor.current = null;

    const node = rowNodes.current.get(anchor.rowKey);
    if (!node) return;

    const drift = node.getBoundingClientRect().top - anchor.top;
    if (drift !== 0) window.scrollBy(0, drift);
  }, [groups]);
  const text = useMemo(() => formatShoppingListText(groups), [groups]);
  const itemCount = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);

  if (currentPlan.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (currentPlan.isError) {
    return (
      <Alert status="error" borderRadius="field">
        <AlertIcon />
        Couldn’t load your shopping list. Try refreshing the page.
      </Alert>
    );
  }

  if (selections.length < 3) {
    return (
      <Text textStyle="faint">
        Pick 3 dinners on{' '}
        <ChakraLink as={RouterLink} to="/">
          the catalog
        </ChakraLink>{' '}
        to see your shopping list.
      </Text>
    );
  }

  const canMove = stops.length > 0;
  const isSavingMove = placeItem.isPending || unplaceItem.isPending;

  function toggleItem(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openMoveSheet(item: ResolvedItem, rowKey: string, trigger: HTMLButtonElement) {
    assignTriggerRef.current = trigger;
    setMoveError(null);
    setAssigning({ itemId: item.itemId, rowKey });
  }

  /**
   * Writes an ITEM placement and nothing else. From the shopping list a move means "this thing is
   * here", never "everything like it is here" — so the category-placement hooks are not imported
   * into this file at all. Unreachable beats a comment asking for restraint.
   *
   * Moving an item IS reviewing it: the user has just said where it belongs. Same rule as `/store`.
   */
  function handlePlace(locationId: string) {
    if (!assigning) return;
    const { itemId, rowKey } = assigning;

    const node = rowNodes.current.get(rowKey);
    scrollAnchor.current = node ? { rowKey, top: node.getBoundingClientRect().top } : null;

    setMoveError(null);
    placeItem.mutate(
      { itemId, locationId },
      {
        onSuccess: () => {
          markReviewed.mutate(itemId);
          setAssigning(null);
        },
        onError: () => {
          // Nothing was written, so nothing moves. The list is rendered from refetched server
          // state and never optimistically, which is what makes "unchanged" true rather than
          // merely intended.
          scrollAnchor.current = null;
          setAssigning(null);
          setMoveError(`Couldn’t move ${assigningItem?.itemName ?? 'that item'}. Try again.`);
        },
      },
    );
  }

  async function handleCopy() {
    if (!plan) return;
    setIsCopying(true);
    setCopyOutcome(null);

    let clipboardOk = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      clipboardOk = false;
    }

    setCopyOutcome({ clipboardOk });
    setIsCopying(false);
  }

  const copyButton = (
    <Button
      size="lg"
      width={{ base: 'full', md: 'auto' }}
      isLoading={isCopying}
      leftIcon={<uiIcons.copy size={16} strokeWidth={2} />}
      onClick={() => void handleCopy()}
    >
      Copy shopping list
    </Button>
  );

  // Locking is a deliberate action on /plan now (intent 012) — copying no longer locks.
  const lockNudge = !isLocked ? (
    <Text textStyle="meta" color="ink.400">
      This week isn’t locked in yet —{' '}
      <ChakraLink as={RouterLink} to="/plan">
        lock it on This Week
      </ChakraLink>{' '}
      to save it to your history.
    </Text>
  ) : null;

  return (
    <Stack gap={4}>
      <HStack justify="space-between" gap={3}>
        <Box>
          <Text textStyle="eyebrow">
            {selections.length} dinners · {itemCount} items
          </Text>
          <Heading textStyle="pageTitle" as="h1">
            Shopping list
          </Heading>
        </Box>
        {actionsInHeader ? (
          <Stack align="flex-end" gap={1} flexShrink={0}>
            {copyButton}
            {lockNudge}
          </Stack>
        ) : (
          <Center w="40px" h="40px" borderRadius="control" bg="brand.100" color="brand.500" flexShrink={0}>
            <uiIcons.copy size={18} strokeWidth={1.8} />
          </Center>
        )}
      </HStack>

      {dinners.isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {dinners.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t load the ingredients for your picks. Try refreshing the page.
        </Alert>
      )}

      {/*
        A failed move closes the sheet and says so here. The sheet is a bottom drawer with an
        overlay, so a message left underneath it would be a message nobody reads.
      */}
      {moveError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          <Text flex={1}>{moveError}</Text>
          <CloseButton onClick={() => setMoveError(null)} />
        </Alert>
      )}

      {dinners.data && (
        <>
          <Box sx={{ columns: { base: 1, md: 2 }, columnGap: '28px' }}>
            {groups.map((group) => {
              const CategoryIcon = categoryIcon(group.category);
              return (
                <Box key={group.category} mb={4} sx={{ breakInside: 'avoid' }}>
                  <HStack gap={2} mb={2}>
                    <CategoryIcon size={15} strokeWidth={1.8} color="var(--chakra-colors-brand-500)" />
                    <Text textStyle="sectionLabel">{group.category}</Text>
                    <Box flex={1} h="1px" bg="line.subtle" />
                  </HStack>
                  <Stack gap={1.5}>
                    {group.items.map((item) => {
                      const key = itemKey(group.category, item.name, item.unit);
                      const isChecked = checkedItems.has(key);
                      // No stops means nowhere to move it to; no registry match means nothing to
                      // place. Either way the row renders exactly as it did before this unit.
                      const target = canMove ? itemByNameKey.get(nameKey(item.name)) : undefined;
                      return (
                        <HStack
                          key={key}
                          ref={(node: HTMLDivElement | null) => {
                            if (node) rowNodes.current.set(key, node);
                            else rowNodes.current.delete(key);
                          }}
                          gap={0}
                          w="full"
                          borderRadius="control"
                          _hover={{ bg: 'paper.subtle' }}
                        >
                          {/*
                            The checkbox and the move control are SIBLINGS, not nested. A button
                            inside the checkbox's label would sit inside the <label> and toggle the
                            check on its way through — the label keeps `flex={1}`, so checking off
                            still owns the row bar one button's width.
                          */}
                          <Checkbox
                            size="md"
                            isChecked={isChecked}
                            onChange={() => toggleItem(key)}
                            flex={1}
                            minW={0}
                            px={2}
                            py={1}
                            alignItems="center"
                            sx={{ '.chakra-checkbox__label': { flex: 1, ml: 3 } }}
                          >
                            <HStack as="span" gap={3}>
                              <Text
                                as="span"
                                fontWeight={500}
                                color={isChecked ? 'ink.200' : 'ink.500'}
                                minW="56px"
                                textDecoration={isChecked ? 'line-through' : 'none'}
                              >
                                {item.quantity} {item.unit}
                              </Text>
                              <Text
                                as="span"
                                color={isChecked ? 'ink.200' : 'ink.900'}
                                textDecoration={isChecked ? 'line-through' : 'none'}
                              >
                                {item.name}
                              </Text>
                            </HStack>
                          </Checkbox>

                          {target && (
                            <IconButton
                              size="sm"
                              variant="ghost"
                              color="ink.300"
                              minW="44px"
                              minH="44px"
                              flexShrink={0}
                              aria-label={`Move ${item.name}`}
                              icon={<uiIcons.storeConfig size={16} strokeWidth={1.8} />}
                              onClick={(event) => openMoveSheet(target, key, event.currentTarget)}
                            />
                          )}
                        </HStack>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Box>

          {copyOutcome?.clipboardOk && (
            <Alert status="success" borderRadius="field">
              <AlertIcon />
              Copied!
            </Alert>
          )}

          {copyOutcome && !copyOutcome.clipboardOk && (
            <Stack gap={2}>
              <Text textStyle="faint">
                Couldn’t copy automatically — select the text below to copy manually.
              </Text>
              <Textarea
                readOnly
                value={text}
                rows={10}
                onFocus={(e) => e.target.select()}
                fontFamily="mono"
              />
            </Stack>
          )}

          {/* Phone only: a sticky footer, lifted clear of the 70px tab bar. At md+ these controls
              live in the page header instead — sticky footers are a phone affordance (finding 3). */}
          {!actionsInHeader && (
            <Box
              position="sticky"
              bottom="70px"
              bg="paper.base"
              pt={3}
              borderTopWidth="1px"
              borderColor="line.subtle"
            >
              <Stack gap={2}>
                {copyButton}
                {lockNudge}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/*
        Unit 002's sheet, unmodified — same component, same suggestion rules, same copy. A second
        implementation of "where does this go" would be a second thing to keep in step.
      */}
      <AssignSheet
        item={assigningItem}
        locations={stops}
        allItems={allItems}
        dismissedItemIds={dismissedItemIds}
        isOpen={assigning !== null}
        isSaving={isSavingMove}
        finalFocusRef={assignTriggerRef as React.RefObject<HTMLButtonElement>}
        onClose={() => setAssigning(null)}
        onPlace={handlePlace}
        onUnplace={() => {
          if (!assigning) return;
          unplaceItem.mutate(assigning.itemId, { onSuccess: () => setAssigning(null) });
        }}
        onDismissSuggestion={(suggestedItemId) => {
          if (!assigning) return;
          dismissSuggestion.mutate({ itemId: assigning.itemId, suggestedItemId });
        }}
      />
    </Stack>
  );
}
