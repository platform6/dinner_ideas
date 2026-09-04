import { Heading, Stack } from '@chakra-ui/react';

import { ClaudeAiCard } from '@/features/settings/ClaudeAiCard';
import { PlanningWeekCard } from '@/features/settings/PlanningWeekCard';

/**
 * `/settings` — a routed page (not a modal) so household settings have a home. Holds the
 * "Claude / AI" card (intent 007) and the "Planning week" card (intent 011).
 */
export function SettingsPage() {
  return (
    <Stack spacing={6}>
      <Heading as="h1" size="md">
        Settings
      </Heading>
      <ClaudeAiCard />
      <PlanningWeekCard />
    </Stack>
  );
}
