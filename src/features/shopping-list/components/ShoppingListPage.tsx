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

  const groups = useMemo(() => {
    const built = buildShoppingList(dinners.data ?? []);
    return reorderGroupsByRows(built, rows.data ?? [], assignments.data ?? []);
  }, [dinners.data, rows.data, assignments.data]);
  const text = useMemo(() => formatShoppingListText(groups), [groups]);

  if (currentPlan.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (currentPlan.isError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Couldn’t load your shopping list. Try refreshing the page.
      </Alert>
    );
  }

  if (selections.length < 3) {
    return (
      <Text color="gray.600">
        Pick 3 dinners on{' '}
        <ChakraLink as={RouterLink} to="/">
          the catalog
        </ChakraLink>{' '}
        to see your shopping list.
      </Text>
    );
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
    <Stack gap={4}>
      <Heading size="lg">Shopping list</Heading>

      {dinners.isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {dinners.isError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Couldn’t load the ingredients for your picks. Try refreshing the page.
        </Alert>
      )}

      {dinners.data && (
        <>
          <Stack gap={3}>
            {groups.map((group) => (
              <Box key={group.category}>
                <Heading size="sm" mb={1}>
                  {group.category}
                </Heading>
                <Stack gap={0.5} pl={2}>
                  {group.items.map((item) => (
                    <Text key={`${item.name}-${item.unit}`}>
                      {item.quantity} {item.unit} {item.name}
                    </Text>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <HStack>
            <Checkbox
              isChecked={shouldLock}
              isDisabled={isAlreadyLocked}
              onChange={(e) => setLockChecked(e.target.checked)}
            >
              Also lock this week’s plan
            </Checkbox>
          </HStack>

          <HStack>
            <Button colorScheme="teal" isLoading={isCopying} onClick={() => void handleCopy()}>
              Copy shopping list
            </Button>
          </HStack>

          {lockErrorMessage && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {lockErrorMessage}
            </Alert>
          )}

          {!lockErrorMessage && copyOutcome?.clipboardOk && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              {shouldLock ? 'Copied! This week’s plan is locked in.' : 'Copied!'}
            </Alert>
          )}

          {!lockErrorMessage && copyOutcome && !copyOutcome.clipboardOk && (
            <Stack gap={2}>
              <Text fontSize="sm" color="gray.600">
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
        </>
      )}
    </Stack>
  );
}
