import { useEffect, useRef, useState } from 'react';
import { Button, HStack, Text } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

interface ClearPicksControlProps {
  /** Dinners currently selected this week. The control renders nothing at 0. */
  count: number;
  /** Fired when the user confirms the clear. The parent owns the mutation and the undo bar. */
  onClear: () => void;
  /** True while the parent's clear mutation is in flight. */
  isClearing?: boolean;
}

/**
 * "Clear picks" — a quiet button that swaps in place for an inline confirm ("Keep" / "Clear
 * all") rather than opening a modal. The parent owns the mutation, the undo bar, and
 * resetting this control to idle on a pick change (via a `key`). Sibling of `LockWeekControl`
 * (intent 012) — same three-state shape and a11y contract.
 */
export function ClearPicksControl({ count, onClear, isClearing }: ClearPicksControlProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  // Set when the pill closed because "Clear all" fired — the parent then moves focus to the
  // undo bar, so we must not steal it back to the trigger.
  const closedByClear = useRef(false);

  useEffect(() => {
    if (isConfirming) {
      keepRef.current?.focus();
    } else if (wasConfirming.current && !closedByClear.current) {
      // Dismissed via Escape or "Keep" — return focus to the trigger, not to <body>.
      triggerRef.current?.focus();
    }
    wasConfirming.current = isConfirming;
    closedByClear.current = false;
  }, [isConfirming]);

  if (count === 0) return null;

  if (!isConfirming) {
    // The clear spinner rides the idle button: "Clear all" closes the pill on click, so the
    // in-flight state is shown here (same pattern as LockWeekControl, intent 012).
    return (
      <Button
        ref={triggerRef}
        variant="quiet"
        size="sm"
        isLoading={isClearing}
        leftIcon={<uiIcons.restore size={13} strokeWidth={2.2} />}
        onClick={() => setIsConfirming(true)}
      >
        Clear picks
      </Button>
    );
  }

  return (
    <HStack
      role="group"
      aria-label="Confirm clearing this week's picks"
      gap={2}
      flexWrap="wrap"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsConfirming(false);
      }}
    >
      <Text textStyle="meta" whiteSpace="nowrap">
        Clear all {count}?
      </Text>
      <Button
        ref={keepRef}
        size="sm"
        variant="outline"
        borderColor="heart.200"
        color="heart.700"
        _hover={{ bg: 'heart.100' }}
        onClick={() => setIsConfirming(false)}
      >
        Keep
      </Button>
      <Button
        size="sm"
        bg="heart.500"
        color="paper.base"
        _hover={{ bg: 'heart.600' }}
        _active={{ bg: 'heart.700' }}
        isLoading={isClearing}
        onClick={() => {
          closedByClear.current = true;
          setIsConfirming(false);
          onClear();
        }}
      >
        Clear all
      </Button>
    </HStack>
  );
}
