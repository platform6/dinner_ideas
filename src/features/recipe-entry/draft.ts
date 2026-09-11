import { normalizeTagName } from '@/features/dinners/tags';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/features/store-config/types';

/**
 * The recipe draft: everything a user fills in before a dinner exists (intent 014, unit 001).
 *
 * This shape is an INTERFACE, not an implementation detail. Unit 002 (import) produces one of
 * these from a Claude response and hands it to the same editors, so it must stay serializable —
 * no React state handles, no functions, no class instances.
 *
 * Numeric fields are held as STRINGS. A draft is what the form holds mid-edit, and a number-typed
 * state cannot faithfully represent "0." or "" while someone is still typing; snapping those to a
 * number as they type is the bug that makes numeric inputs feel broken. Parsing happens once, in
 * validation (and, later, in bolt 060's save) via `parsePositiveNumber`. Unit 002 stringifies at
 * its boundary — one line there buys a lossless round-trip here.
 */
export interface RecipeDraft {
  name: string;
  cuisineType: string;
  /** Minutes, as typed. `dinners.cook_time_minutes` is `integer check (> 0)`. */
  cookTimeMinutes: string;
  /**
   * The one-line summary — `dinners.instructions`, which is `not null` with no default.
   *
   * Note for anyone wiring this up: the column is required by the schema but is currently
   * rendered NOWHERE in the app. The catalog card shows ingredients, steps and tags; the cooking
   * view shows `dinner_steps`. Do not tell the user this line appears on the card.
   */
  summary: string;
  ingredients: DraftIngredient[];
  steps: DraftStep[];
  /** Normalized tag names. NOT ids — no `tags` row is created until save (see below). */
  tagNames: string[];
}

export interface DraftIngredient {
  /** Client-only, stable for the life of the line. Never sent to the database. */
  id: string;
  /** As typed. `dinner_ingredients.quantity` is `numeric check (> 0)`. */
  quantity: string;
  unit: string;
  name: string;
  category: IngredientCategory;
}

export interface DraftStep {
  /** Client-only, stable for the life of the line. Never sent to the database. */
  id: string;
  instruction: string;
}

/** A validation failure that names the field it belongs to, so the UI never says "form invalid". */
export interface DraftProblem {
  /** `name`, `cookTimeMinutes`, `ingredients`, `ingredients.<lineId>.quantity`, `steps`, … */
  field: string;
  message: string;
}

/**
 * Line ids come from a counter rather than `crypto.randomUUID()`. They only need to be unique
 * within one draft, they never reach the database, and a counter is deterministic — which makes
 * tests readable and removes a dependency on what the test environment exposes as `crypto`.
 */
let lineCounter = 0;
function nextLineId(prefix: string): string {
  lineCounter += 1;
  return `${prefix}-${lineCounter}`;
}

export function createIngredientLine(): DraftIngredient {
  return { id: nextLineId('ing'), quantity: '', unit: '', name: '', category: 'Produce' };
}

export function createStep(): DraftStep {
  return { id: nextLineId('step'), instruction: '' };
}

/** A blank draft, opening with one ingredient line and one step so the editors are not empty boxes. */
export function createEmptyDraft(): RecipeDraft {
  return {
    name: '',
    cuisineType: '',
    cookTimeMinutes: '',
    summary: '',
    ingredients: [createIngredientLine()],
    steps: [createStep()],
    tagNames: [],
  };
}

/**
 * Parses a typed numeric field. Returns `null` for anything that is not a finite number strictly
 * greater than zero — which is exactly the set both `check (cook_time_minutes > 0)` and
 * `check (quantity > 0)` reject. Per ADR-1 the database remains the enforcement; this stops the
 * client from ever knowingly sending a bad value.
 */
export function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Step numbers are DERIVED from array order, never stored on the draft.
 *
 * This is why removing a middle step cannot produce a gap: there is no `step_number` field to fall
 * out of step with the array. `unique (dinner_id, step_number)` and `check (step_number > 0)` are
 * unviolatable by construction rather than by a renumbering routine somebody has to remember to
 * call. Both the editor's displayed numbers and bolt 060's rows come from here.
 */
export function numberedSteps(steps: readonly DraftStep[]): Array<DraftStep & { stepNumber: number }> {
  return steps.map((step, index) => ({ ...step, stepNumber: index + 1 }));
}

/** Moves a step, returning a new array. Out-of-range indices are a no-op, not a crash. */
export function moveStep(steps: readonly DraftStep[], from: number, to: number): DraftStep[] {
  if (from < 0 || from >= steps.length || to < 0 || to >= steps.length || from === to) {
    return [...steps];
  }
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Adds a tag name to the draft, or removes it if already attached — selecting an attached tag
 * detaches it (story 008). Normalization is `normalizeTagName`, reused rather than reimplemented,
 * so a name differing only by case or surrounding space resolves to the one already there instead
 * of creating a near-duplicate.
 *
 * Nothing is written to `tags` here. A draft holds NAMES: creating rows as they are typed would
 * mean an abandoned draft permanently pollutes a shared, household-wide vocabulary that has no
 * delete UI. Bolt 060 resolves these names at save, when the user has actually committed.
 */
export function toggleTagName(tagNames: readonly string[], rawName: string): string[] {
  const name = normalizeTagName(rawName);
  if (!name) return [...tagNames];
  return tagNames.includes(name) ? tagNames.filter((t) => t !== name) : [...tagNames, name];
}

/**
 * Every reason this draft cannot be saved, each naming its field.
 *
 * Pure, and takes the whole draft — so the rules can be tested without rendering anything, and a
 * caller cannot accidentally check only some of them.
 */
export function validateDraft(draft: RecipeDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];

  if (!draft.name.trim()) {
    problems.push({ field: 'name', message: 'Give the dinner a name.' });
  }
  if (!draft.cuisineType.trim()) {
    problems.push({ field: 'cuisineType', message: 'Say what kind of food this is.' });
  }
  if (!draft.summary.trim()) {
    problems.push({ field: 'summary', message: 'Add a one-line summary of the dinner.' });
  }

  const cookTime = parsePositiveNumber(draft.cookTimeMinutes);
  if (cookTime === null) {
    problems.push({ field: 'cookTimeMinutes', message: 'Cook time must be more than zero minutes.' });
  } else if (!Number.isInteger(cookTime)) {
    // `cook_time_minutes` is `integer`; a decimal would be silently truncated by Postgres.
    problems.push({ field: 'cookTimeMinutes', message: 'Cook time must be a whole number of minutes.' });
  }

  if (draft.ingredients.length === 0) {
    problems.push({ field: 'ingredients', message: 'Add at least one ingredient.' });
  }
  for (const line of draft.ingredients) {
    if (!line.name.trim()) {
      problems.push({
        field: `ingredients.${line.id}.name`,
        message: 'Name this ingredient, or remove the line.',
      });
    }
    if (parsePositiveNumber(line.quantity) === null) {
      problems.push({
        field: `ingredients.${line.id}.quantity`,
        message: 'Quantity must be more than zero.',
      });
    }
    if (!INGREDIENT_CATEGORIES.includes(line.category)) {
      problems.push({
        field: `ingredients.${line.id}.category`,
        message: 'Pick which part of the store this comes from.',
      });
    }
  }

  if (draft.steps.length === 0) {
    problems.push({ field: 'steps', message: 'Add at least one cooking step.' });
  }
  for (const step of draft.steps) {
    if (!step.instruction.trim()) {
      problems.push({ field: `steps.${step.id}`, message: 'Write this step, or remove it.' });
    }
  }

  return problems;
}

/** Convenience for the submit button; `validateDraft` remains the thing that says WHY. */
export function isDraftComplete(draft: RecipeDraft): boolean {
  return validateDraft(draft).length === 0;
}

/** The message for one field, or `undefined`. Lets each input render its own problem. */
export function problemFor(problems: readonly DraftProblem[], field: string): string | undefined {
  return problems.find((problem) => problem.field === field)?.message;
}
