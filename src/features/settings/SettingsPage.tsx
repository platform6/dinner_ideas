import { Heading, Stack } from '@chakra-ui/react';

import { ClaudeAiCard } from '@/features/settings/ClaudeAiCard';

/**
 * `/settings` — a routed page (not a modal) so later household settings (e.g. `dinners_per_week`)
 * have a home. For intent 007 it holds a single "Claude / AI" card.
 */
export function SettingsPage() {
  return (
    <Stack spacing={6}>
      <Heading as="h1" size="md">
        Settings
      </Heading>
      <ClaudeAiCard />
    </Stack>
  );
}
