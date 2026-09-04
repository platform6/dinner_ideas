import { Alert, AlertIcon, Box, Heading, Select, Stack, Text } from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';
import { useUpdateWeekStartDay, useWeekStartDay } from '@/features/settings/hooks';

/** 0 = Sunday .. 6 = Saturday — index is the stored `households.week_start_day` value. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

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

  const weekStartDay = setting.data ?? 0;

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

      {setting.isError && (
        <Alert status="error" borderRadius="field" fontSize="sm" mb={4}>
          <AlertIcon />
          Couldn&rsquo;t load the planning-week setting.
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
        {!isOwner && (
          <Text fontSize="xs" color="ink.300">
            Ask a household owner to change this.
          </Text>
        )}
        {update.isError && (
          <Text fontSize="xs" color="heart.500">
            Couldn&rsquo;t save that — the week start is unchanged.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
