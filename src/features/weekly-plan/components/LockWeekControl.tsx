import { useEffect, useRef, useState } from 'react';
import { Button, HStack, Text } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

interface LockWeekControlProps {
  /** Dinners currently selected on the plan. The control renders only at exactly 3. */
  selectionCount: number;
  /** Fired when the user confirms the lock. The parent owns the mutation and its error surface. */
  onLock: () => void;
  /** True while the parent's lock mutation is in flight. */
  isLocking?: boolean;
}

/**
 * "Lock in this week" — a button that swaps in place for an inline confirm
 * ("Keep editing" / "Lock it in") rather than opening a modal. The parent owns the mutation,
 * the error alert, and resetting this control to idle after a pick change (via a `key` change).
 * Mirrors the ClearPicksControl interaction shape (intent 009).
 */
export function LockWeekControl({ selectionCount, onLock, isLocking }: LockWeekControlProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isConfirming) keepEditingRef.current?.focus();
  }, [isConfirming]);

  if (selectionCount < 3) return null;

  if (!isConfirming) {
    return (
      <Button
        variant="solid"
        size="sm"
        alignSelf="flex-start"
        isLoading={isLocking}
        leftIcon={<uiIcons.locked size={14} strokeWidth={2.2} />}
        onClick={() => setIsConfirming(true)}
      >
        Lock in this week
      </Button>
    );
  }

  return (
    <HStack
      role="group"
      aria-label="Confirm locking this week's plan"
      gap={2}
      flexWrap="wrap"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsConfirming(false);
      }}
    >
      <Text textStyle="meta" whiteSpace="nowrap">
        Lock in these {selectionCount}? You won’t be able to change this week’s picks.
      </Text>
      <Button ref={keepEditingRef} variant="quiet" size="sm" onClick={() => setIsConfirming(false)}>
        Keep editing
      </Button>
      <Button
        variant="solid"
        size="sm"
        onClick={() => {
          setIsConfirming(false);
          onLock();
        }}
      >
        Lock it in
      </Button>
    </HStack>
  );
}
