import { useMemo, useState } from 'react';
import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react';

import type { ResolvedItem } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * "Not on the path yet" (story 004) — the normal resting place for items the user has no
 * opinion about yet.
 *
 * Neutral throughout: no red, no warning styling, and the subtitle states the CONSEQUENCE
 * ("4 groceries sort to the end") rather than the condition. Nothing in this section announces
 * its own absence.
 *
 * Scope: the default list is narrowed to items used in at least one active recipe; the search
 * field widens that to the whole registry, including items used in none. Both scopes stay
 * within unassigned items — showing placed ones under this heading would contradict it.
 */
export function UnassignedSection({
  unassignedItems,
  inRecipeNameKeys,
  onPlace,
}: {
  unassignedItems: ResolvedItem[];
  inRecipeNameKeys: ReadonlySet<string>;
  onPlace: (item: ResolvedItem, trigger: HTMLButtonElement) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const defaultScope = useMemo(
    () => unassignedItems.filter((item) => inRecipeNameKeys.has(item.nameKey)),
    [unassignedItems, inRecipeNameKeys],
  );

  const term = search.trim().toLowerCase();
  // The search field is what reaches past the default scope into the full catalog.
  const visible = term ? unassignedItems.filter((item) => item.nameKey.includes(term)) : defaultScope;

  return (
    <Box borderWidth="1px" borderColor="line.subtle" borderRadius="card" bg="paper.base" mt={4}>
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
            Not on the path yet
          </Text>
          <Text textStyle="meta" color="ink.500">
            {defaultScope.length === 1
              ? '1 grocery sorts to the end'
              : `${defaultScope.length} groceries sort to the end`}
          </Text>
        </Stack>
        <Text textStyle="meta" color="ink.500" bg="paper.sunken" px={2} py={0.5} borderRadius="control">
          {defaultScope.length}
        </Text>
        <Box color="ink.400" aria-hidden>
          {isExpanded ? (
            <uiIcons.collapse size={16} strokeWidth={2} />
          ) : (
            <uiIcons.expand size={16} strokeWidth={2} />
          )}
        </Box>
      </HStack>

      {isExpanded && (
        <Stack gap={2} px={3} pb={3}>
          <Input
            size="sm"
            borderRadius="control"
            placeholder="Search all groceries"
            aria-label="Search all groceries"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {visible.length === 0 ? (
            <Text textStyle="faint" color="ink.500" py={2}>
              {term ? `Nothing matching “${search.trim()}”.` : 'Everything has a spot on the path.'}
            </Text>
          ) : (
            visible.map((item) => (
              <HStack
                key={item.itemId}
                gap={2}
                px={3}
                py={2}
                minH="44px"
                borderWidth="1px"
                borderColor="line.subtle"
                borderRadius="card"
              >
                <Stack gap={0} flex="1" minW={0}>
                  <Text color="ink.900" noOfLines={1}>
                    {item.itemName}
                  </Text>
                  {item.category && (
                    <Text textStyle="meta" color="ink.400">
                      {item.category}
                    </Text>
                  )}
                </Stack>
                <Button
                  size="sm"
                  aria-label={`Place ${item.itemName}`}
                  onClick={(event) => onPlace(item, event.currentTarget)}
                >
                  Place
                </Button>
              </HStack>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}
