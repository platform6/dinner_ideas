import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Checkbox,
  Heading,
  HStack,
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';

import { useCurrentPlan, useLockPlan } from '@/features/weekly-plan/hooks';
import { useShoppingListDinners } from '@/features/shopping-list/hooks';
import { buildShoppingList } from '@/features/shopping-list/aggregate';
import { reorderGroupsByRows } from '@/features/shopping-list/reorder';
import { formatShoppingListText } from '@/features/shopping-list/format';
import { useAssignments, useRows } from '@/features/store-config/hooks';
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
  const lockPlan = useLockPlan();
  const rows = useRows();
  const assignments = useAssignments();

  const isAlreadyLocked = plan?.locked_at != null;
  const [lockChecked, setLockChecked] = useState(true);
  const shouldLock = isAlreadyLocked || lockChecked;

  const [isCopying, setIsCopying] = useState(false);
  const [copyOutcome, setCopyOutcome] = useState<{ clipboardOk: boolean } | null>(null);
  const [lockErrorMessage, setLockErrorMessage] = useState<string | null>(null);
  // Purely local "picked up in the store" state — never persisted, resets on remount.
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const built = buildShoppingList(dinners.data ?? []);
    return reorderGroupsByRows(built, rows.data ?? [], assignments.data ?? []);
  }, [dinners.data, rows.data, assignments.data]);
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

  function toggleItem(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCopy() {
    if (!plan) return;
    setIsCopying(true);
    setLockErrorMessage(null);
    setCopyOutcome(null);

    let clipboardOk = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      clipboardOk = false;
    }

    if (shouldLock && !isAlreadyLocked) {
      try {
        await lockPlan.mutateAsync(plan.id);
      } catch {
        setLockErrorMessage("Couldn't lock the plan, try again.");
        setIsCopying(false);
        return;
      }
    }

    setCopyOutcome({ clipboardOk });
    setIsCopying(false);
  }

  return (
    <Stack gap={4} pb={20}>
      <HStack justify="space-between" gap={3}>
        <Box>
          <Text textStyle="eyebrow">
            {selections.length} dinners · {itemCount} items
          </Text>
          <Heading textStyle="pageTitle" as="h1">
            Shopping list
          </Heading>
        </Box>
        <Center w="40px" h="40px" borderRadius="control" bg="brand.100" color="brand.500" flexShrink={0}>
          <uiIcons.copy size={18} strokeWidth={1.8} />
        </Center>
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

      {dinners.data && (
        <>
          <Stack gap={4}>
            {groups.map((group) => {
              const CategoryIcon = categoryIcon(group.category);
              return (
                <Box key={group.category}>
                  <HStack gap={2} mb={2}>
                    <CategoryIcon size={15} strokeWidth={1.8} color="var(--chakra-colors-brand-500)" />
                    <Text textStyle="sectionLabel">{group.category}</Text>
                    <Box flex={1} h="1px" bg="line.subtle" />
                  </HStack>
                  <Stack gap={1.5}>
                    {group.items.map((item) => {
                      const key = itemKey(group.category, item.name, item.unit);
                      const isChecked = checkedItems.has(key);
                      return (
                        <HStack key={key} gap={3}>
                          <Checkbox
                            size="md"
                            isChecked={isChecked}
                            onChange={() => toggleItem(key)}
                            aria-label={`Mark ${item.name} as picked up`}
                          />
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
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          {lockErrorMessage && (
            <Alert status="error" borderRadius="field">
              <AlertIcon />
              {lockErrorMessage}
            </Alert>
          )}

          {!lockErrorMessage && copyOutcome?.clipboardOk && (
            <Alert status="success" borderRadius="field">
              <AlertIcon />
              {shouldLock ? 'Copied! This week’s plan is locked in.' : 'Copied!'}
            </Alert>
          )}

          {!lockErrorMessage && copyOutcome && !copyOutcome.clipboardOk && (
            <Stack gap={2}>
              <Text textStyle="faint">
                Couldn’t copy automatically — select the text below to copy manually.
                {shouldLock ? ' This week’s plan is locked in.' : ''}
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

          <Box
            position="sticky"
            bottom={0}
            bg="paper.base"
            pt={3}
            borderTopWidth="1px"
            borderColor="line.subtle"
          >
            <Stack gap={3}>
              <Checkbox
                isChecked={shouldLock}
                isDisabled={isAlreadyLocked}
                onChange={(e) => setLockChecked(e.target.checked)}
              >
                Also lock this week’s plan
              </Checkbox>
              <Button
                size="lg"
                width="full"
                isLoading={isCopying}
                leftIcon={<uiIcons.copy size={16} strokeWidth={2} />}
                onClick={() => void handleCopy()}
              >
                Copy shopping list
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
