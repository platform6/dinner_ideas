import { ROSIE_APPROVED_TAG, normalizeTagName } from '@/features/dinners/tags';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/features/store-config/types';
import {
  createIngredientLine,
  createStep,
  type DraftIngredient,
  type DraftStep,
  type RecipeDraft,
} from '@/features/recipe-entry/draft';

/** Why an extraction produced no draft. Bolt 062 turns these into English. */
export type ExtractionFailure =
  /** No JSON object could be recovered. A REFUSAL LANDS HERE — it arrives as HTTP 200 with prose. */
  | 'not-json'
  /** The model said the page has no recipe in it. */
  | 'no-recipe'
  /** Parsed, but a required field is missing or the wrong type. */
  | 'bad-shape'
  /** No steps. A dinner without steps cannot be saved, so it is not reviewable either. */
  | 'no-steps'
  /** A category outside the five, a non-positive quantity, or a non-positive cook time. */
  | 'bad-values';

export type ParseResult =
  { ok: true; draft: RecipeDraft; servingsStated: boolean } | { ok: false; reason: ExtractionFailure };

/**
 * Pulls the JSON object out of the model's reply.
 *
 * The prompt asks for bare JSON, but models add markdown fences and the occasional preamble, so
 * the first `{` to the last `}` is taken. That tolerance is a single, bounded exception — the only
 * one in this file. Everything after it is a strict shape check, because coercion is exactly what
 * turns a malformed response into a plausible-looking wrong draft.
 */
function recoverJson(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Finite, greater than zero. Rejects `Infinity`, `NaN`, negatives and numeric strings alike. */
function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Turns a proxy reply into a draft in unit 001's shape, or into a typed failure.
 *
 * Strict by design (story 003). The one thing that is deliberately lenient is tags: an
 * unrecognised tag is dropped rather than failing the extraction, because "it is simply not a
 * tag". Ingredients get the opposite treatment — see below.
 */
export function parseExtraction(text: string, vocabulary: readonly string[]): ParseResult {
  const raw = recoverJson(text);
  if (!isRecord(raw)) return { ok: false, reason: 'not-json' };

  // The prompt's escape hatch for a page with no recipe in it. Checked before shape, because an
  // honest "no recipe found" is not a malformed response.
  if ('error' in raw) return { ok: false, reason: 'no-recipe' };

  if (
    !isNonEmptyString(raw.name) ||
    !isNonEmptyString(raw.cuisine) ||
    !isNonEmptyString(raw.summary) ||
    !Array.isArray(raw.ingredients) ||
    !Array.isArray(raw.steps)
  ) {
    return { ok: false, reason: 'bad-shape' };
  }

  // Checked before the value rules so a truncated response — which typically loses the tail —
  // reports the thing that actually went wrong.
  const stepValues = raw.steps.filter(isNonEmptyString);
  if (stepValues.length === 0 || stepValues.length !== raw.steps.length) {
    return { ok: false, reason: 'no-steps' };
  }

  if (!isPositiveNumber(raw.cookTimeMinutes) || !Number.isInteger(raw.cookTimeMinutes)) {
    return { ok: false, reason: 'bad-values' };
  }

  if (raw.ingredients.length === 0) return { ok: false, reason: 'bad-shape' };

  const ingredients: DraftIngredient[] = [];
  for (const line of raw.ingredients) {
    if (!isRecord(line) || !isNonEmptyString(line.name)) return { ok: false, reason: 'bad-shape' };
    if (!isPositiveNumber(line.quantity)) return { ok: false, reason: 'bad-values' };
    if (
      typeof line.category !== 'string' ||
      !(INGREDIENT_CATEGORIES as readonly string[]).includes(line.category)
    ) {
      // A bad ingredient FAILS the extraction rather than being dropped — deliberately unlike the
      // tag rule below. A missing tag costs a filter; a missing ingredient costs a shopping-list
      // line and is invisible in review, which is the same family of harm as a dropped step.
      return { ok: false, reason: 'bad-values' };
    }

    ingredients.push({
      ...createIngredientLine(),
      // Numbers become strings here: that is the draft's shape, because a draft is what the form
      // holds mid-edit (bolt 059). This is the one line unit 001's brief anticipated.
      quantity: String(line.quantity),
      unit: typeof line.unit === 'string' ? line.unit.trim() : '',
      name: line.name.trim(),
      category: line.category as IngredientCategory,
    });
  }

  const steps: DraftStep[] = stepValues.map((instruction) => ({
    ...createStep(),
    instruction: instruction.trim(),
  }));

  return {
    ok: true,
    servingsStated: raw.servingsStated !== false,
    draft: {
      name: raw.name.trim(),
      cuisineType: raw.cuisine.trim(),
      cookTimeMinutes: String(raw.cookTimeMinutes),
      summary: raw.summary.trim(),
      ingredients,
      steps,
      tagNames: acceptTags(raw.tags, vocabulary),
    },
  };
}

/**
 * Keeps only tags the household already has. An unrecognised tag is dropped, never a reason to
 * fail the whole extraction (story 003).
 *
 * `rosie-approved` is dropped even when it IS in the vocabulary — it records a family member's
 * opinion, and a model asserting it would fabricate one. The prompt already withholds it; this is
 * the second guard, because "the model was told not to" is not an enforcement.
 */
function acceptTags(value: unknown, vocabulary: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];

  const known = new Set(vocabulary);
  const accepted: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const name = normalizeTagName(entry);
    if (!name || name === ROSIE_APPROVED_TAG) continue;
    if (!known.has(name)) continue;
    if (!accepted.includes(name)) accepted.push(name);
  }
  return accepted;
}
