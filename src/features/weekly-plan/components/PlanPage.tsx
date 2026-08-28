import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Center,
  Heading,
  HStack,
  IconButton,
  Link as ChakraLink,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';

import { useCurrentPlan, useToggleSelection, useWeekByOffset } from '@/features/weekly-plan/hooks';
import { formatWeekRange } from '@/features/weekly-plan/date';
import { uiIcons } from '@/shared/components/icons';

export function PlanPage() {
  const [offset, setOffset] = useState(0);
  const week = useWeekByOffset(offset);
  const toggleSelection = useToggleSelection();
  // Only needed for the current week's pick/remove actions, which read the live plan snapshot
  // fresh each toggle (see `toggle-selection.ts`) rather than the possibly-stale `week.data`.
  const currentPlan = useCurrentPlan();

  const isCurrentWeek = offset === 0;
  const plan = week.data;
  const isLocked = plan?.locked_at != null;
  const selections = plan?.weekly_plan_selections ?? [];
  // md+ lays the three picks side by side as vertical cards; phone keeps horizontal rows.
  const threeAcross = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? false;
  const isFull = isCurrentWeek && !isLocked && selections.length === 3;

  if (week.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (week.isError) {
    return (
      <Alert status="error" borderRadius="field">
        <AlertIcon />
        Couldn’t load this week’s plan. Try refreshing the page.
      </Alert>
    );
  }

  return (
    <Stack gap={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Text textStyle="eyebrow">{formatWeekRange(week.weekStartDate)}</Text>
          <Heading textStyle="pageTitle" as="h1">
            This week’s plan
          </Heading>
        </Box>
        <HStack gap={2}>
          <IconButton
            aria-label="Previous week"
            icon={<uiIcons.back size={16} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            onClick={() => setOffset((o) => o - 1)}
          />
          <IconButton
            aria-label="Next week"
            icon={<uiIcons.nextWeek size={16} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            isDisabled={isCurrentWeek}
            onClick={() => setOffset((o) => o + 1)}
          />
          {!isCurrentWeek && isLocked && (
            <Badge variant="count">
              <HStack gap={1}>
                <uiIcons.eaten size={13} strokeWidth={2} />
                <Text as="span">Eaten</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
      </HStack>

      {isCurrentWeek && toggleSelection.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {!plan && (
        <Box layerStyle="cardDashed" textAlign="center">
          <uiIcons.allDone size={20} strokeWidth={1.8} color="var(--chakra-colors-ink-300)" />
          <Text textStyle="faint" mt={2}>
            {isCurrentWeek ? (
              <>
                No plan yet.{' '}
                <ChakraLink as={RouterLink} to="/">
                  Pick dinners from the catalog
                </ChakraLink>{' '}
                to start this week’s plan.
              </>
            ) : (
              'No plan this week.'
            )}
          </Text>
        </Box>
      )}

      {plan && selections.length === 0 && isCurrentWeek && (
        <Box layerStyle="cardDashed" textAlign="center">
          <Text textStyle="faint">
            No dinners picked yet.{' '}
            <ChakraLink as={RouterLink} to="/">
              Browse the catalog
            </ChakraLink>{' '}
            to add some.
          </Text>
        </Box>
      )}

      {isCurrentWeek && isLocked && selections.length > 0 && (
        <Text textStyle="faint">
          This plan is locked — its shopping list has already been sent. Pick a dinner from the catalog to
          start next week’s plan.
        </Text>
      )}

      {selections.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 2, md: 3 }}>
          {selections.map((selection, index) => {
            const removeButton = isCurrentWeek && !isLocked && (
              <IconButton
                w="36px"
                h="36px"
                minW="36px"
                variant="outline"
                aria-label={`Remove ${selection.dinners.name}`}
                icon={<uiIcons.remove size={15} strokeWidth={2} />}
                isLoading={
                  toggleSelection.isPending && toggleSelection.variables?.dinnerId === selection.dinner_id
                }
                onClick={() =>
                  toggleSelection.mutate({
                    dinnerId: selection.dinner_id,
                    currentPlan: currentPlan.data ?? null,
                  })
                }
              />
            );
            const badge = (
              <Center
                w={threeAcross ? '28px' : '34px'}
                h={threeAcross ? '28px' : '34px'}
                borderRadius="full"
                bg="brand.500"
                color="paper.base"
                fontWeight={600}
                fontSize="0.8125rem"
                flexShrink={0}
              >
                {index + 1}
              </Center>
            );
            const name = (
              <Text textStyle="cardTitle" fontSize="0.9375rem">
                {selection.dinners.name}
              </Text>
            );
            const meta = (
              <Text textStyle="meta">
                {selection.dinners.cuisine_type} · {selection.dinners.cook_time_minutes} min
              </Text>
            );

            if (threeAcross) {
              return (
                <Stack key={selection.id} layerStyle="cardSelected" p={3.5} gap={2.5}>
                  <HStack justify="space-between" align="flex-start">
                    {badge}
                    {removeButton}
                  </HStack>
                  <Box h="76px" bg="paper.sunken" borderRadius="control" />
                  <Box>
                    {name}
                    {meta}
                  </Box>
                </Stack>
              );
            }

            return (
              <HStack key={selection.id} justify="space-between" layerStyle="cardSelected">
                <HStack gap={3}>
                  {badge}
                  <Box>
                    {name}
                    {meta}
                  </Box>
                </HStack>
                {removeButton}
              </HStack>
            );
          })}
        </SimpleGrid>
      )}

      {isFull && (
        <Box layerStyle="cardDashed" textAlign="center">
          <uiIcons.allDone size={20} strokeWidth={1.8} color="var(--chakra-colors-brand-500)" />
          <Text textStyle="faint" mt={2} mb={3}>
            All three picked. Your shopping list is ready.
          </Text>
          <Button
            as={RouterLink}
            to="/shopping-list"
            leftIcon={<uiIcons.shoppingList size={16} strokeWidth={1.8} />}
          >
            See shopping list
          </Button>
        </Box>
      )}
    </Stack>
  );
}
