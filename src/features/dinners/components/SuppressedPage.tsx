import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import { useDinners, useSetDinnerActive, useSuppressedDinners } from '@/features/dinners/hooks';
import { uiIcons } from '@/shared/components/icons';

/**
 * "Not interested" — dinners the wife has hidden from the active catalog, with a "Bring back"
 * action to un-suppress. Its own route (FR-4/FR-11), not a toggle over the catalog grid.
 */
export function SuppressedPage() {
  const suppressed = useSuppressedDinners();
  const active = useDinners();
  const setDinnerActive = useSetDinnerActive();

  if (suppressed.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (suppressed.isError) {
    return (
      <Alert status="error" borderRadius="field">
        <AlertIcon />
        Couldn’t load your hidden dinners. Try refreshing the page.
      </Alert>
    );
  }

  const dinners = suppressed.data ?? [];
  const activeCount = active.data?.length ?? 0;

  return (
    <Stack gap={4}>
      <Box>
        <Heading textStyle="pageTitle" as="h1">
          Not interested
        </Heading>
        <Text textStyle="faint" mt={1}>
          Hidden from the catalog. Bring one back any time.
        </Text>
      </Box>

      {setDinnerActive.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {dinners.length === 0 ? (
        <Text color="ink.400">Nothing hidden yet.</Text>
      ) : (
        <Stack gap={2}>
          {dinners.map((dinner) => (
            <HStack key={dinner.id} justify="space-between" bg="paper.subtle" borderRadius="card" p={3}>
              <HStack gap={3}>
                <Center
                  w="38px"
                  h="38px"
                  borderRadius="control"
                  bg="paper.sunken"
                  color="ink.300"
                  flexShrink={0}
                >
                  <uiIcons.suppress size={17} strokeWidth={1.8} />
                </Center>
                <Box>
                  <Text color="ink.700" fontWeight={500}>
                    {dinner.name}
                  </Text>
                  <Text textStyle="faint">
                    {dinner.cuisine_type} · {dinner.cook_time_minutes} min
                  </Text>
                </Box>
              </HStack>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<uiIcons.restore size={15} strokeWidth={2} />}
                isLoading={setDinnerActive.isPending && setDinnerActive.variables?.id === dinner.id}
                onClick={() => setDinnerActive.mutate({ id: dinner.id, isActive: true })}
              >
                Bring back
              </Button>
            </HStack>
          ))}

          <Box layerStyle="cardDashed" textAlign="center">
            <Text textStyle="faint">
              That's everything you've hidden. {activeCount} dinner{activeCount === 1 ? '' : 's'} still in the
              catalog.
            </Text>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
