import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Heading,
  HStack,
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import { useCurrentPlan } from '@/features/weekly-plan/hooks';
import { useDinnersWithSteps } from '@/features/cooking-view/hooks';
import { cuisineIcon, metaIcons, stepIcon, uiIcons } from '@/shared/components/icons';

export function CookingViewPage() {
  const currentPlan = useCurrentPlan();
  const plan = currentPlan.data;
  const selections = plan?.weekly_plan_selections ?? [];
  const dinnerIds = useMemo(() => (plan?.weekly_plan_selections ?? []).map((s) => s.dinner_id), [plan]);

  const dinners = useDinnersWithSteps(dinnerIds);
  // Independent per-card expand state — several cards may be open at once.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        Couldn’t load the cooking view. Try refreshing the page.
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
        to see their cooking steps here.
      </Text>
    );
  }

  return (
    <Stack gap={4}>
      <Heading textStyle="pageTitle" as="h1">
        Cooking
      </Heading>

      {dinners.isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {dinners.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t load the steps for your picks. Try refreshing the page.
        </Alert>
      )}

      {dinners.data?.map((dinner) => {
        const isExpanded = expandedIds.has(dinner.id);
        const CuisineIcon = cuisineIcon(dinner.cuisine_type);
        const stepCount = dinner.dinner_steps.length;

        return (
          <Box
            key={dinner.id}
            layerStyle={isExpanded ? 'cardSelected' : 'card'}
            transition="border-color 0.12s ease"
            _hover={isExpanded ? undefined : { borderColor: 'line.brand' }}
          >
            <Box
              as="button"
              type="button"
              display="flex"
              width="full"
              alignItems="center"
              justifyContent="space-between"
              textAlign="left"
              cursor="pointer"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${dinner.name}`}
              onClick={() => toggle(dinner.id)}
            >
              <HStack gap={3}>
                <Center
                  w="44px"
                  h="44px"
                  borderRadius="control"
                  bg="paper.sunken"
                  color="ink.300"
                  flexShrink={0}
                >
                  <CuisineIcon size={20} strokeWidth={1.5} />
                </Center>
                <Box>
                  <Heading textStyle="cardTitle">{dinner.name}</Heading>
                  <HStack textStyle="meta" gap={1}>
                    <metaIcons.cookTime size={13} strokeWidth={1.8} />
                    <Text as="span">
                      {dinner.cook_time_minutes} min · {stepCount} step{stepCount === 1 ? '' : 's'}
                    </Text>
                  </HStack>
                </Box>
              </HStack>
              {isExpanded ? (
                <uiIcons.collapse size={18} strokeWidth={2} />
              ) : (
                <uiIcons.expand size={18} strokeWidth={2} />
              )}
            </Box>

            {isExpanded &&
              (stepCount === 0 ? (
                <Text textStyle="faint" mt={3}>
                  No steps available for this dinner yet.
                </Text>
              ) : (
                <Stack gap={2} mt={3}>
                  {dinner.dinner_steps.map((step) => {
                    const StepIcon = stepIcon(step.instruction);
                    return (
                      <HStack key={step.id} bg="paper.base" borderRadius="control" p={2} gap={2.5}>
                        <Center
                          w="30px"
                          h="30px"
                          borderRadius="control"
                          bg="paper.subtle"
                          color="brand.500"
                          flexShrink={0}
                        >
                          <StepIcon size={15} strokeWidth={1.8} />
                        </Center>
                        <Text fontSize="0.8125rem" color="ink.700">
                          {step.instruction}
                        </Text>
                      </HStack>
                    );
                  })}
                </Stack>
              ))}
          </Box>
        );
      })}
    </Stack>
  );
}
