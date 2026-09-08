import { Button, Text, Tooltip, VStack } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

interface LuckyPickControlProps {
  /** How many slots the press would fill. Zero means there is nothing to do. */
  slotsToFill: number;
  /** Eligible dinners available to draw from, after suppression and already-picked are removed. */
  candidateCount: number;
  /** True when the current plan is locked — picks cannot change at all. */
  isLocked: boolean;
  /** True while the parent's mutation is in flight. */
  isPicking?: boolean;
  onPick: () => void;
}

/**
 * "Surprise me" — fills the week's remaining picks at random, weighted away from dinners eaten
 * recently (intent 016).
 *
 * No confirm step, unlike its siblings `ClearPicksControl` and `LockWeekControl`. Those two are
 * destructive or irreversible; this one only ever ADDS to empty slots, so a mis-tap costs a tap to
 * undo. Intent 009's Clear Picks already owns destructive resetting — clear, then press this.
 *
 * When it cannot act it is disabled AND says why. A control that is simply inert leaves the user
 * guessing whether the app is broken or they are.
 */
export function LuckyPickControl({
  slotsToFill,
  candidateCount,
  isLocked,
  isPicking,
  onPick,
}: LuckyPickControlProps) {
  const reason = isLocked
    ? 'This week is locked in.'
    : slotsToFill <= 0
      ? 'Your week is already full.'
      : candidateCount === 0
        ? 'No dinners left to choose from.'
        : null;

  const isDisabled = reason !== null;
  // Fewer dinners than slots: the press still helps, it just cannot finish the job. Saying so
  // before the tap is kinder than a "ran out" message after it.
  const willRunShort = !isDisabled && candidateCount < slotsToFill;

  const button = (
    <Button
      size="sm"
      variant="outline"
      leftIcon={<uiIcons.empty size={14} strokeWidth={2} />}
      isDisabled={isDisabled}
      isLoading={isPicking}
      onClick={onPick}
    >
      Surprise me
    </Button>
  );

  return (
    <VStack align="flex-start" gap={1}>
      {isDisabled ? (
        // A disabled button swallows pointer events, so the tooltip needs a wrapper to hang on.
        <Tooltip label={reason} openDelay={200}>
          <span>{button}</span>
        </Tooltip>
      ) : (
        button
      )}
      {isDisabled && (
        <Text fontSize="xs" color="ink.300">
          {reason}
        </Text>
      )}
      {willRunShort && (
        <Text fontSize="xs" color="ink.300">
          Only {candidateCount} left to choose from.
        </Text>
      )}
    </VStack>
  );
}
