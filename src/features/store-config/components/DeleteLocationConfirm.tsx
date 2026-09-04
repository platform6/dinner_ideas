import { Box, Button, HStack, Heading, Stack, Text } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

/**
 * The one destructive confirm on the page, and the one place `heart.*` is used (story 006).
 *
 * The filled `heart.500` button is styled AT THE CALL SITE rather than via a theme `danger`
 * variant — it is the only filled terracotta button in the application besides intent 009's
 * "Clear all", and that scarcity is what makes it legible as *this changes where things live*.
 * A second one anywhere should reopen the decision properly rather than quietly adding a
 * variant.
 */
export function DeleteLocationConfirm({
  locationName,
  affectedCount,
  isRemoving,
  onKeep,
  onRemove,
}: {
  locationName: string;
  affectedCount: number;
  isRemoving: boolean;
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <Box
      bg="heart.50"
      borderWidth="1px"
      borderColor="heart.200"
      borderRadius="card"
      p={4}
      role="alertdialog"
      aria-label={`Remove ${locationName}?`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onKeep();
      }}
    >
      <Stack gap={3}>
        <HStack gap={2} align="flex-start">
          <Box color="heart.700" mt="2px" flexShrink={0} aria-hidden>
            <uiIcons.warning size={18} strokeWidth={2} />
          </Box>
          <Stack gap={1.5}>
            <Heading as="h3" fontFamily="heading" fontWeight={500} fontSize="md" color="ink.900">
              Remove {locationName}?
            </Heading>
            <Text textStyle="faint" color="ink.700">
              {affectedCount} {affectedCount === 1 ? 'grocery points' : 'groceries point'} here. They&rsquo;ll
              fall back to their category, or to the end of the list if the category has no spot. Nothing is
              deleted.
            </Text>
          </Stack>
        </HStack>

        <HStack gap={2} justify="flex-end">
          <Button variant="outline" borderColor="heart.200" onClick={onKeep} isDisabled={isRemoving}>
            Keep it
          </Button>
          <Button
            bg="heart.500"
            color="paper.base"
            _hover={{ bg: 'heart.700' }}
            _active={{ bg: 'heart.700' }}
            onClick={onRemove}
            isLoading={isRemoving}
          >
            Remove
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
