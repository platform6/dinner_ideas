import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import { mapRemovalError, type RemovalImpact } from '@/features/dinners/api';
import { useRemovalImpact, useRemoveDinner } from '@/features/dinners/hooks';

interface RemoveDinnerDialogProps {
  dinnerId: string;
  dinnerName: string;
  isOpen: boolean;
  onClose: () => void;
  /** "Not interested" — the reversible alternative, offered where removal is refused or unwanted. */
  onHideInstead: () => void;
}

/** Plural helper for the counts the warning states. */
function times(n: number): string {
  return n === 1 ? 'once' : `${n} times`;
}

/**
 * Confirms a permanent removal, after stating exactly what it takes (intent 018, bolt 072).
 *
 * The impact is loaded FIRST and nothing is enabled until it is known: the user decides on facts,
 * not on a hope. Only the lines that apply are shown. The one refusal — this week's locked plan
 * (ADR-15) — disables Remove and offers "Not interested" instead.
 *
 * Cancel is the least-destructive action and takes the initial focus: a permanent action is never
 * one Enter key away. "Not interested" is named in the dialog every time so the two actions read as
 * the different things they are — one hides and can be undone, the other cannot.
 */
export function RemoveDinnerDialog({
  dinnerId,
  dinnerName,
  isOpen,
  onClose,
  onHideInstead,
}: RemoveDinnerDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const impact = useRemovalImpact(dinnerId, isOpen);
  const remove = useRemoveDinner();

  const locked = impact.data?.inCurrentLockedPlan ?? false;
  const canRemove = impact.isSuccess && !locked && !remove.isPending;

  function handleRemove() {
    remove.mutate(dinnerId, { onSuccess: onClose });
  }

  function handleHide() {
    onHideInstead();
    onClose();
  }

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent mx={4}>
          <AlertDialogHeader fontSize="lg">Remove “{dinnerName}”?</AlertDialogHeader>

          <AlertDialogBody>
            {impact.isLoading && (
              <Stack direction="row" align="center" gap={2}>
                <Spinner size="sm" />
                <Text>Checking what this dinner is part of…</Text>
              </Stack>
            )}

            {impact.isError && (
              <Text color="heart.500">
                Couldn’t check what removing it would affect, so it can’t be removed right now.
              </Text>
            )}

            {impact.data && <ImpactLines impact={impact.data} />}

            {remove.isError && (
              <Text color="heart.500" mt={3}>
                {mapRemovalError(remove.error)}
              </Text>
            )}
          </AlertDialogBody>

          <AlertDialogFooter gap={2} flexWrap="wrap">
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleHide}>
              Not interested instead
            </Button>
            <Button
              colorScheme="red"
              onClick={handleRemove}
              isDisabled={!canRemove}
              isLoading={remove.isPending}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

/** Only the lines that apply, in plain words. */
function ImpactLines({ impact }: { impact: RemovalImpact }) {
  if (impact.inCurrentLockedPlan) {
    return (
      <Stack gap={2}>
        <Text>
          It’s in this week’s locked plan, so it can’t be removed until the week is over — removing it now
          would leave your plan a dinner short and change a shopping list you may be using.
        </Text>
        <Text>You can hide it from the catalog with Not interested now, and remove it next week.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      <Text fontWeight={600}>This can’t be undone.</Text>
      {impact.historyCount > 0 && (
        <Text>It’s been cooked {times(impact.historyCount)} — that history goes with it.</Text>
      )}
      {impact.inCurrentDraft && (
        <Text>It’s in this week’s plan — it’ll be taken off, and this week’s shopping list will change.</Text>
      )}
      <Text fontSize="sm" color="ink.300">
        To just hide it, use Not interested instead — that can be undone.
      </Text>
    </Stack>
  );
}
