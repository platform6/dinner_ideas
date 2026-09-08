import { Alert, AlertIcon, Box, Heading, Select, Stack, Text } from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';
import {
  useDinnersPerWeek,
  useUpdateDinnersPerWeek,
  useUpdateWeekStartDay,
  useWeekStartDay,
} from '@/features/settings/hooks';

/** 0 = Sunday .. 6 = Saturday — index is the stored `households.week_start_day` value. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * 1..7 — the same range as the `check` on `households.dinners_per_week` (intent 015, bolt 063).
 * Offering exactly the stored range makes an out-of-range value unreachable rather than merely
 * rejected, and leaves no second rule to keep in step with the database.
 */
const PLAN_SIZES = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * `/settings` card for the planning-week start weekday (intent 011). Visible to every
 * household member; the control is owner-only — RLS ("Household updatable by an owner") is the
 * real gate, this is just the UI gate. The `Select` is driven by the query value, so a failed
 * write leaves the shown weekday unchanged.
 */
export function PlanningWeekCard() {
  const { role, householdId } = useAuth();
  const isOwner = role === 'owner';

  const setting = useWeekStartDay();
  const update = useUpdateWeekStartDay(householdId);

  const planSize = useDinnersPerWeek();
  const updatePlanSize = useUpdateDinnersPerWeek(householdId);

  const weekStartDay = setting.data ?? 0;
  const dinnersPerWeek = planSize.data ?? 3;

  return (
    <Box
      borderWidth="1px"
      borderColor="line.subtle"
      borderRadius="field"
      bg="paper.base"
      p={{ base: 5, md: 6 }}
    >
      <Heading as="h2" size="sm" mb={1}>
        Planning week
      </Heading>
      <Text fontSize="sm" color="ink.300" mb={4}>
        Your dinner plan starts fresh each {WEEKDAYS[weekStartDay]}. Changing this affects the current week
        immediately.
      </Text>

      {(setting.isError || planSize.isError) && (
        <Alert status="error" borderRadius="field" fontSize="sm" mb={4}>
          <AlertIcon />
          Couldn&rsquo;t load the planning-week settings.
        </Alert>
      )}

      <Stack spacing={2} maxW="260px">
        <Text fontSize="sm" fontWeight={600}>
          Week starts on
        </Text>
        <Select
          size="sm"
          aria-label="Week starts on"
          isDisabled={!isOwner || setting.isLoading || update.isPending}
          value={weekStartDay}
          onChange={(e) => update.mutate(Number(e.target.value))}
        >
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </Select>
        {update.isError && (
          <Text fontSize="xs" color="heart.500">
            Couldn&rsquo;t save that — the week start is unchanged.
          </Text>
        )}
      </Stack>

      <Stack spacing={2} maxW="260px" mt={5}>
        <Text fontSize="sm" fontWeight={600}>
          Dinners per week
        </Text>
        <Select
          size="sm"
          aria-label="Dinners per week"
          isDisabled={!isOwner || planSize.isLoading || updatePlanSize.isPending}
          value={dinnersPerWeek}
          onChange={(e) => updatePlanSize.mutate(Number(e.target.value))}
        >
          {PLAN_SIZES.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? '1 dinner' : `${n} dinners`}
            </option>
          ))}
        </Select>
        {/*
          One number moves four screens, which is not obvious from a dropdown. Saying so here is
          cheaper than the confusion of a plan page that suddenly wants a different count.
        */}
        <Text fontSize="xs" color="ink.300">
          Your plan, shopping list and cooking view all follow this number.
        </Text>
        {updatePlanSize.isError && (
          <Text fontSize="xs" color="heart.500">
            Couldn&rsquo;t save that — the number of dinners is unchanged.
          </Text>
        )}
      </Stack>

      {/* One hint for the whole card: both controls are owner-only, and saying so twice reads
          like a bug rather than emphasis. */}
      {!isOwner && (
        <Text fontSize="xs" color="ink.300" mt={4}>
          Ask a household owner to change this.
        </Text>
      )}
    </Box>
  );
}
