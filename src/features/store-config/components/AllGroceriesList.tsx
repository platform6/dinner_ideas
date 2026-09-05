import { useMemo, useState } from 'react';
import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react';

import type { ResolvedItem } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * Says where an item sits and HOW it got there, so the row answers "is that right?" rather than
 * just "where is it?".
 *
 * The distinction matters: an inherited stop is a rule the user can change wholesale by moving
 * the category, while a chosen stop is a decision about this one thing. Collapsing them into
 * "Produce" for both would hide which lever to pull.
 */
function placementLine(item: ResolvedItem): string {
  if (!item.locationName) return 'No spot yet';
  if (item.state === 'placed') return `${item.locationName} · you chose this`;
  return item.viaCategory ? `${item.locationName} · follows ${item.viaCategory}` : item.locationName;
}

/**
 * Every grocery in the household registry, searchable by name (story 001, FR-1).
 *
 * This is the list that makes the assign flow reachable at all. Before it, the only ways in were
 * a section scoped to `unassigned` — a state that is empty by construction, since every item
 * inherits a stop from its category — and a per-stop list capped at four items. Roughly 20 of
 * 121 groceries could be reached, and only from the stop they already sat at.
 *
 * Scope is deliberately EVERY item in every placement state. Narrowing it by state is exactly
 * the mistake that made the previous section useless.
 */
export function AllGroceriesList({
  items,
  onMove,
}: {
  items: ResolvedItem[];
  onMove: (item: ResolvedItem, trigger: HTMLButtonElement) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => [...items].sort((a, b) => a.itemName.localeCompare(b.itemName)), [items]);

  // Matches `items.name_key` — lower(btrim(name)) — so the client and the database agree on
  // identity without a join, the same rule reorder.ts follows.
  const term = search.trim().toLowerCase();
  const matches = term ? sorted.filter((item) => item.nameKey.includes(term)) : sorted;

  // Searching narrows; it never reorders. Alphabetical throughout, so an item does not move
  // under the finger between one keystroke and the next.
  //
  // NOT capped. A first draft rendered only the first 30 unsearched rows with a "search to
  // narrow" note — honest, and search still reached everything. It came out anyway: this bolt
  // exists because a display cap made most of the registry unreachable, and answering that by
  // adding a different cap invites the same class of bug back. The section is collapsed by
  // default, so nothing renders until asked for; 121 rows is trivial, and if a household ever
  // reaches the ~500 the NFR targets, the answer is virtualization, not truncation.

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
            All groceries
          </Text>
          <Text textStyle="meta" color="ink.500">
            {items.length === 1 ? '1 grocery' : `${items.length} groceries`} — find anything and move it
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
        <Stack gap={2} bg="paper.subtle" borderTopWidth="1px" borderColor="line.subtle" px={3} py={3}>
          <Input
            size="sm"
            value={search}
            placeholder="Search groceries"
            aria-label="Search groceries"
            onChange={(event) => setSearch(event.target.value)}
          />

          {matches.length === 0 ? (
            <Text textStyle="faint" color="ink.500" py={2}>
              {term ? `Nothing matching "${search.trim()}".` : 'No groceries yet.'}
            </Text>
          ) : (
            <Stack gap={1}>
              {matches.map((item) => (
                <HStack
                  key={item.itemId}
                  gap={2}
                  px={3}
                  py={2}
                  minH="44px"
                  bg="paper.base"
                  borderWidth="1px"
                  borderColor="line.subtle"
                  borderRadius="card"
                >
                  <Stack gap={0} flex="1" minW={0}>
                    <Text color="ink.900" noOfLines={1}>
                      {item.itemName}
                    </Text>
                    <Text textStyle="meta" color="ink.400" noOfLines={1}>
                      {placementLine(item)}
                    </Text>
                  </Stack>
                  <Button
                    size="sm"
                    aria-label={`Move ${item.itemName}`}
                    onClick={(event) => onMove(item, event.currentTarget)}
                  >
                    Move
                  </Button>
                </HStack>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
