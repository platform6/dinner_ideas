import { Alert, AlertIcon, Box, Heading, Select, Stack, Text } from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';
import { SERVINGS_PER_DINNER_RANGE } from '@/features/settings/api';
import { useServingsPerDinner, useUpdateServingsPerDinner } from '@/features/settings/hooks';

/**
 * 1..12 — the same range as the `check` on `households.servings_per_dinner` (intent 018, bolt 069).
 * Offering exactly the stored range makes an out-of-range value unreachable rather than merely
 * rejected, the same reasoning as `PLAN_SIZES` on the planning-week card.
 */
const SERVING_SIZES = Array.from(
  { length: SERVINGS_PER_DINNER_RANGE.max - SERVINGS_PER_DINNER_RANGE.min + 1 },
  (_, i) => SERVINGS_PER_DINNER_RANGE.min + i,
);

/**
 * `/settings` card for how many people the household cooks for (intent 018).
 *
 * Its own card rather than a third control on "Planning week": that card holds facts about the
 * WEEK, and this is not one. Keeping them apart also keeps "dinners per week" and "servings per
 * dinner" from sharing a label — two numbers about different things (bolt 069 domain model).
 *
 * The explanation is not decoration (Checkpoint 1: "make it explain itself"). Its last sentence is
 * ADR-14 said where the user makes the change: nothing already saved is rescaled.
 */
export function RecipesCard() {
  const { role, householdId } = useAuth();
  const isOwner = role === 'owner';

  const servings = useServingsPerDinner();
  const update = useUpdateServingsPerDinner(householdId);

  const servingsPerDinner = servings.data ?? 3;

  return (
    <Box
      borderWidth="1px"
      borderColor="line.subtle"
      borderRadius="field"
      bg="paper.base"
      p={{ base: 5, md: 6 }}
    >
      <Heading as="h2" size="sm" mb={1}>
        Recipes
      </Heading>
      <Text fontSize="sm" color="ink.300" mb={4}>
        How many people you usually cook for. It&rsquo;s the target when you choose to scale an imported
        recipe, and the guide when you type quantities in. Changing it never alters recipes you&rsquo;ve
        already saved.
      </Text>

      {servings.isError && (
        <Alert status="error" borderRadius="field" fontSize="sm" mb={4}>
          <AlertIcon />
          Couldn&rsquo;t load the recipe settings.
        </Alert>
      )}

      <Stack spacing={2} maxW="260px">
        <Text fontSize="sm" fontWeight={600}>
          Servings per dinner
        </Text>
        <Select
          size="sm"
          aria-label="Servings per dinner"
          isDisabled={!isOwner || servings.isLoading || update.isPending}
          value={servingsPerDinner}
          onChange={(e) => update.mutate(Number(e.target.value))}
        >
          {SERVING_SIZES.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? '1 person' : `${n} people`}
            </option>
          ))}
        </Select>
        {update.isError && (
          <Text fontSize="xs" color="heart.500">
            Couldn&rsquo;t save that — the number of servings is unchanged.
          </Text>
        )}
      </Stack>

      {!isOwner && (
        <Text fontSize="xs" color="ink.300" mt={4}>
          Ask a household owner to change this.
        </Text>
      )}
    </Box>
  );
}
