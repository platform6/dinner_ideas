import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Heading,
  Link as ChakraLink,
  ListItem,
  OrderedList,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import { useCurrentPlan } from '@/features/weekly-plan/hooks';
import { useDinnersWithSteps } from '@/features/cooking-view/hooks';

export function CookingViewPage() {
  const currentPlan = useCurrentPlan();
  const plan = currentPlan.data;
  const selections = plan?.weekly_plan_selections ?? [];
  const dinnerIds = useMemo(() => (plan?.weekly_plan_selections ?? []).map((s) => s.dinner_id), [plan]);

  const dinners = useDinnersWithSteps(dinnerIds);

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
        Couldn’t load the cooking view. Try refreshing the page.
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
        to see their cooking steps here.
      </Text>
    );
  }

  return (
    <Stack gap={4}>
      <Heading size="lg">Cooking</Heading>

      {dinners.isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {dinners.isError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Couldn’t load the steps for your picks. Try refreshing the page.
        </Alert>
      )}

      {dinners.data?.map((dinner) => (
        <Box key={dinner.id} borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="md" mb={3}>
            {dinner.name}
          </Heading>
          {dinner.dinner_steps.length === 0 ? (
            <Text color="gray.600">No steps available for this dinner yet.</Text>
          ) : (
            <OrderedList spacing={2}>
              {dinner.dinner_steps.map((step) => (
                <ListItem key={step.id}>{step.instruction}</ListItem>
              ))}
            </OrderedList>
          )}
        </Box>
      ))}
    </Stack>
  );
}
