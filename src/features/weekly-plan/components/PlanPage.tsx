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
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import { useCurrentPlan, useToggleSelection, useWeekByOffset } from '@/features/weekly-plan/hooks';
import { formatWeekRange } from '@/features/weekly-plan/date';

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

  if (week.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (week.isError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Couldn’t load this week’s plan. Try refreshing the page.
      </Alert>
    );
  }

  return (
    <Stack gap={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            aria-label="Previous week"
            onClick={() => setOffset((o) => o - 1)}
          >
            ◀
          </Button>
          <Heading size="lg">{formatWeekRange(week.weekStartDate)}</Heading>
          <Button
            size="sm"
            variant="outline"
            aria-label="Next week"
            isDisabled={isCurrentWeek}
            onClick={() => setOffset((o) => o + 1)}
          >
            ▶
          </Button>
        </HStack>
        <HStack gap={3}>
          {!isCurrentWeek && isLocked && <Badge colorScheme="green">Eaten</Badge>}
          {isCurrentWeek && !isLocked && <Text color="gray.600">{selections.length}/3 selected</Text>}
        </HStack>
      </HStack>

      {isCurrentWeek && toggleSelection.isError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {!plan && (
        <Text color="gray.600">
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
      )}

      {plan && selections.length === 0 && isCurrentWeek && (
        <Text color="gray.600">
          No dinners picked yet.{' '}
          <ChakraLink as={RouterLink} to="/">
            Browse the catalog
          </ChakraLink>{' '}
          to add some.
        </Text>
      )}

      {isCurrentWeek && isLocked && selections.length > 0 && (
        <Text color="gray.600" fontSize="sm">
          This plan is locked — its shopping list has already been sent. Pick a dinner from the catalog to
          start next week’s plan.
        </Text>
      )}

      {selections.length > 0 && (
        <Stack gap={2}>
          {selections.map((selection) => (
            <HStack key={selection.id} justify="space-between" borderWidth="1px" borderRadius="md" p={3}>
              <Box>
                <Text fontWeight="medium">{selection.dinners.name}</Text>
                <Text fontSize="sm" color="gray.600">
                  {selection.dinners.cuisine_type} · {selection.dinners.cook_time_minutes} min
                </Text>
              </Box>
              {isCurrentWeek && !isLocked && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={
                    toggleSelection.isPending && toggleSelection.variables?.dinnerId === selection.dinner_id
                  }
                  onClick={() =>
                    toggleSelection.mutate({
                      dinnerId: selection.dinner_id,
                      currentPlan: currentPlan.data ?? null,
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </HStack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
