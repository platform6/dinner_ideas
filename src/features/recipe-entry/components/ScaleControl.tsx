import { useState } from 'react';
import { Alert, Button, HStack, Input, Stack, Text } from '@chakra-ui/react';

import { importQuantityNote } from '@/features/recipe-entry/components/import-quantity-note';
import { readYield } from '@/features/recipe-entry/scale';
import { uiIcons } from '@/shared/components/icons';

export interface ScaledState {
  from: number;
  to: number;
  /** False once the user edits an ingredient after scaling — the numbers are theirs now. */
  canUndo: boolean;
}

interface ScaleControlProps {
  /** What the page said it serves or makes, verbatim, or null. */
  sourceYield: string | null;
  /** How many the household cooks for — the target, never applied without being asked (FR-4). */
  servingsPerDinner: number;
  /** Set once the user has scaled; null while the quantities are still the page's own. */
  scaled: ScaledState | null;
  onScale: (fromServings: number) => void;
  onUndo: () => void;
}

/**
 * The note about an imported draft's quantities, and the choice to scale them (intent 018, bolt 071).
 *
 * **Offered, never applied** (FR-4). The quantities arrive as the page wrote them; nothing here runs
 * until the user presses it. That default is what resolves the household-versus-dish tension — a
 * tray of bark imports as a tray, and the button simply goes unpressed. Do not make this automatic
 * "because the household size is right there" (bolt 071 brief; ADR-14).
 *
 * What is offered depends on what the page's yield means (`readYield`):
 *   - a single count ≠ the household → "Scale from 4 to 5", naming both numbers
 *   - a range → a box for the base, **empty**: pre-filling it would be the app picking a number out
 *     of the range, which Checkpoint 2 left to the user
 *   - pieces or prose ("Makes 24 cookies") → no control, and it says why
 *   - no yield → no control; the note already says the page gave none
 */
export function ScaleControl({ sourceYield, servingsPerDinner, scaled, onScale, onUndo }: ScaleControlProps) {
  const [rangeBase, setRangeBase] = useState('');
  const reading = readYield(sourceYield);

  if (scaled) {
    return (
      <Alert layerStyle="notice" role="status">
        <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
        <Stack gap={2}>
          <Text>
            Scaled from {scaled.from} to {scaled.to} — rounded to what a kitchen can measure.
            {!scaled.canUndo && ' You’ve edited the quantities since, so they’re yours now.'}
          </Text>
          {scaled.canUndo && (
            <HStack>
              <Button size="sm" variant="outline" onClick={onUndo}>
                Undo — use the page’s quantities
              </Button>
            </HStack>
          )}
        </Stack>
      </Alert>
    );
  }

  const parsedBase = Number(rangeBase);
  const rangeBaseIsValid = rangeBase.trim() !== '' && Number.isInteger(parsedBase) && parsedBase > 0;

  return (
    <Alert layerStyle="notice" role="status">
      <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
      <Stack gap={2}>
        <Text>{importQuantityNote(sourceYield, servingsPerDinner)}</Text>

        {reading.kind === 'single' && reading.servings !== servingsPerDinner && (
          <HStack>
            <Button size="sm" variant="outline" onClick={() => onScale(reading.servings)}>
              Scale from {reading.servings} to {servingsPerDinner}
            </Button>
          </HStack>
        )}

        {reading.kind === 'range' && (
          <Stack gap={1}>
            <Text fontSize="sm">
              The page says {sourceYield}. To scale to {servingsPerDinner}, enter the number to scale from.
            </Text>
            <HStack>
              <Input
                size="sm"
                maxW="90px"
                inputMode="numeric"
                aria-label="Scale from how many servings"
                value={rangeBase}
                onChange={(event) => setRangeBase(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                isDisabled={!rangeBaseIsValid}
                onClick={() => onScale(parsedBase)}
              >
                Scale to {servingsPerDinner}
              </Button>
            </HStack>
          </Stack>
        )}

        {reading.kind === 'unknown' && sourceYield && (
          <Text fontSize="sm">
            “{sourceYield}” isn’t a number of people, so there’s nothing to scale from.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}
