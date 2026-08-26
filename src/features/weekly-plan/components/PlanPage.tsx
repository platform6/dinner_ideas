import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
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

import { useCurrentPlan, useToggleSelection } from '@/features/weekly-plan/hooks';

export function PlanPage() {
  const currentPlan = useCurrentPlan();
  const toggleSelection = useToggleSelection();

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
        Couldn’t load this week’s plan. Try refreshing the page.
      </Alert>
    );
  }

  const plan = currentPlan.data;
  const isLocked = plan?.locked_at != null;
  const selections = plan?.weekly_plan_selections ?? [];

  return (
    <Stack gap={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Heading size="lg">This week’s plan</Heading>
        {!isLocked && <Text color="gray.600">{selections.length}/3 selected</Text>}
      </HStack>

      {toggleSelection.isError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {!plan && (
        <Text color="gray.600">
          No plan yet.{' '}
          <ChakraLink as={RouterLink} to="/">
            Pick dinners from the catalog
          </ChakraLink>{' '}
          to start this week’s plan.
        </Text>
      )}

      {plan && selections.length === 0 && (
        <Text color="gray.600">
          No dinners picked yet.{' '}
          <ChakraLink as={RouterLink} to="/">
            Browse the catalog
          </ChakraLink>{' '}
          to add some.
        </Text>
      )}

      {isLocked && selections.length > 0 && (
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
              {!isLocked && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={toggleSelection.isPending && toggleSelection.variables?.dinnerId === selection.dinner_id}
                  onClick={() =>
                    toggleSelection.mutate({ dinnerId: selection.dinner_id, currentPlan: plan ?? null })
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
