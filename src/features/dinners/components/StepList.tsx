import { HStack, ListItem, OrderedList, Text } from '@chakra-ui/react';

import type { DinnerStep } from '@/features/dinners/types';
import { stepIcon } from '@/shared/components/icons';

/**
 * A dinner's steps in the order given, each with its step icon (intent 026). Shared by the
 * catalog card's Details and This week. The Cook tab keeps its own larger step rows for the stove.
 * Callers supply their own "Steps" label.
 */
export function StepList({ steps }: { steps: DinnerStep[] }) {
  if (steps.length === 0) {
    return <Text textStyle="faint">No steps recorded.</Text>;
  }

  return (
    <OrderedList styleType="none" ms={0} spacing={1.5}>
      {steps.map((step) => {
        const StepIcon = stepIcon(step.instruction);
        return (
          <ListItem key={step.id}>
            <HStack align="start" gap={2} fontSize="0.8125rem" color="ink.700">
              <StepIcon
                size={14}
                strokeWidth={1.8}
                color="var(--chakra-colors-brand-500)"
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <Text as="span">{step.instruction}</Text>
            </HStack>
          </ListItem>
        );
      })}
    </OrderedList>
  );
}
