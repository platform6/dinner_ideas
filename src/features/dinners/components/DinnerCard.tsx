import { Badge, Box, Button, Checkbox, HStack, Heading, Stack, Text, Tooltip } from '@chakra-ui/react';

import type { DinnerWithIngredients } from '@/features/dinners/types';

interface SelectionProps {
  isSelected: boolean;
  /** True when 3 dinners are already selected and this one isn't one of them. */
  selectionDisabled: boolean;
  isTogglingSelection: boolean;
  onToggleSelect: (id: string) => void;
}

interface DinnerCardProps {
  dinner: DinnerWithIngredients;
  /** "active" shows a Not-interested action; "suppressed" shows Un-suppress. */
  variant: 'active' | 'suppressed';
  onSuppress: (id: string) => void;
  onUnsuppress: (id: string) => void;
  isMutating: boolean;
  /** Omitted for the Suppressed view — you un-suppress before picking, not from there directly. */
  selection?: SelectionProps;
  /** "Last made 2 weeks ago" / "Never made" — see `last-chosen.ts#formatLastChosen`. */
  lastChosenText?: string;
}

export function DinnerCard({
  dinner,
  variant,
  onSuppress,
  onUnsuppress,
  isMutating,
  selection,
  lastChosenText,
}: DinnerCardProps) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <HStack justify="space-between" align="start" mb={2}>
        <Heading size="sm">{dinner.name}</Heading>
        {dinner.rosie_approved && (
          <Badge colorScheme="pink" flexShrink={0}>
            Rosie-approved
          </Badge>
        )}
      </HStack>
      <Text fontSize="sm" color="gray.600" mb={1}>
        {dinner.cuisine_type} · {dinner.cook_time_minutes} min
      </Text>
      {lastChosenText && (
        <Text fontSize="xs" color="gray.500" mb={3}>
          {lastChosenText}
        </Text>
      )}
      <Stack gap={2} align="start">
        {selection && (
          <Tooltip
            label="Already have 3 picked — remove one first"
            isDisabled={!selection.selectionDisabled}
          >
            <Checkbox
              isChecked={selection.isSelected}
              isDisabled={selection.selectionDisabled || selection.isTogglingSelection}
              onChange={() => selection.onToggleSelect(dinner.id)}
              aria-label={`Pick ${dinner.name} for this week`}
            >
              Pick for this week
            </Checkbox>
          </Tooltip>
        )}
        {variant === 'active' ? (
          <Button size="sm" variant="outline" isLoading={isMutating} onClick={() => onSuppress(dinner.id)}>
            Not interested
          </Button>
        ) : (
          <Button size="sm" colorScheme="teal" isLoading={isMutating} onClick={() => onUnsuppress(dinner.id)}>
            Un-suppress
          </Button>
        )}
      </Stack>
    </Box>
  );
}
