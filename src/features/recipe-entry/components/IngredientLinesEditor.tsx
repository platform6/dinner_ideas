import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Grid,
  IconButton,
  Input,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';

import { problemFor, type DraftIngredient, type DraftProblem } from '@/features/recipe-entry/draft';
import { ScaleControl, type ScaledState } from '@/features/recipe-entry/components/ScaleControl';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/features/store-config/types';
import { uiIcons } from '@/shared/components/icons';

/**
 * Units the founding fifty actually use. Suggested, never enforced — the column is free text and
 * constraining it would reject a legitimate "sprig" or "handful".
 */
const UNIT_SUGGESTIONS = ['lb', 'oz', 'cups', 'each', 'tbsp', 'tsp', 'cloves', 'packet'] as const;

interface IngredientLinesEditorProps {
  lines: readonly DraftIngredient[];
  problems: readonly DraftProblem[];
  showProblems: boolean;
  onChange: (lines: DraftIngredient[]) => void;
  onAddLine: () => void;
  /**
   * How many people the household cooks for (`households.servings_per_dinner`, intent 018). Passed
   * in rather than fetched here so the editor stays presentational. Required, with no default: a
   * default would be a hard-coded 3 by another name, which is what FR-6 removes.
   */
  servingsPerDinner: number;
  /**
   * Present when the draft came from an import, carrying what the page said it serves or makes
   * (verbatim, or null). An import's quantities are always the page's own (bolt 070), so the editor
   * says what they are for — beside the guidance, where the user is already reading. Absent or null
   * for a dinner typed in by hand.
   */
  importSource?: { sourceYield: string | null } | null;
  /** Set once the user has chosen to scale an imported draft (bolt 071); null until then. */
  scaled?: ScaledState | null;
  /** Scale every quantity from `fromServings` to the household's size. Only ever user-initiated. */
  onScale?: (fromServings: number) => void;
  /** Put the page's own quantities back. */
  onUndoScale?: () => void;
}

/**
 * The ingredient editor (story 003): quantity, unit, name, and which part of the store it comes
 * from — the four things `dinner_ingredients` holds.
 *
 * Each line is keyed by its own stable `id`, never by array index. With an index key, removing
 * line 2 would hand line 3 the key line 2 had, and any state React tracks by key — cursor
 * position, an in-progress IME composition — would follow the key rather than the data. That is
 * precisely the "silently shifts values between rows" failure the story rules out.
 */
export function IngredientLinesEditor({
  lines,
  problems,
  showProblems,
  onChange,
  onAddLine,
  servingsPerDinner,
  importSource,
  scaled = null,
  onScale = () => {},
  onUndoScale = () => {},
}: IngredientLinesEditorProps) {
  const problem = (field: string) => (showProblems ? problemFor(problems, field) : undefined);

  function patchLine(id: string, patch: Partial<DraftIngredient>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id));
  }

  return (
    <Stack gap={3}>
      {/*
        GUIDANCE for what is being typed, not a statement about the catalog (ADR-14): since intent
        018 a stored dinner's quantities are what the household cooks, and an import kept as
        written is not "for N". The old line also named a particular family ("two adults and one
        small child"), which is only true of one particular 3 — so it is gone rather than derived.
      */}
      <Text textStyle="faint">
        Enter quantities for {servingsPerDinner} — the number your household cooks for.
      </Text>

      {importSource && (
        <ScaleControl
          sourceYield={importSource.sourceYield}
          servingsPerDinner={servingsPerDinner}
          scaled={scaled}
          onScale={onScale}
          onUndo={onUndoScale}
        />
      )}

      {problem('ingredients') && (
        <Text color="red.500" fontSize="sm">
          {problem('ingredients')}
        </Text>
      )}

      <Stack gap={2}>
        {lines.map((line) => {
          const quantityProblem = problem(`ingredients.${line.id}.quantity`);
          const nameProblem = problem(`ingredients.${line.id}.name`);

          return (
            <Grid
              key={line.id}
              gap={2}
              alignItems="start"
              templateColumns={{ base: '1fr 1fr auto', sm: '90px 110px 1fr 150px auto' }}
              templateAreas={{
                base: `"quantity unit remove" "name name name" "category category category"`,
                sm: `"quantity unit name category remove"`,
              }}
            >
              <FormControl gridArea="quantity" isInvalid={Boolean(quantityProblem)}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  size="sm"
                  aria-label="Quantity"
                  placeholder="1"
                  value={line.quantity}
                  onChange={(event) => patchLine(line.id, { quantity: event.target.value })}
                />
                <FormErrorMessage fontSize="xs">{quantityProblem}</FormErrorMessage>
              </FormControl>

              <Box gridArea="unit">
                <Input
                  list="unit-suggestions"
                  size="sm"
                  aria-label="Unit"
                  placeholder="lb"
                  value={line.unit}
                  onChange={(event) => patchLine(line.id, { unit: event.target.value })}
                />
              </Box>

              <FormControl gridArea="name" isInvalid={Boolean(nameProblem)}>
                <Input
                  size="sm"
                  aria-label="Ingredient"
                  placeholder="Chicken thighs"
                  value={line.name}
                  onChange={(event) => patchLine(line.id, { name: event.target.value })}
                />
                <FormErrorMessage fontSize="xs">{nameProblem}</FormErrorMessage>
              </FormControl>

              {/*
                A Select over INGREDIENT_CATEGORIES, imported rather than re-listed. The five
                values are a CHECK constraint on the column; a second copy here would drift from
                it the first time the constraint changes.
              */}
              <Box gridArea="category">
                <Select
                  size="sm"
                  aria-label="Part of the store"
                  value={line.category}
                  onChange={(event) =>
                    patchLine(line.id, { category: event.target.value as IngredientCategory })
                  }
                >
                  {INGREDIENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box gridArea="remove" justifySelf="end">
                <IconButton
                  aria-label={`Remove ${line.name || 'this ingredient'}`}
                  icon={<uiIcons.remove size={15} strokeWidth={2} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLine(line.id)}
                />
              </Box>
            </Grid>
          );
        })}
      </Stack>

      <datalist id="unit-suggestions">
        {UNIT_SUGGESTIONS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      <Box>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<uiIcons.add size={14} strokeWidth={2} />}
          onClick={onAddLine}
        >
          Add an ingredient
        </Button>
      </Box>
    </Stack>
  );
}
