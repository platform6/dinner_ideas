import { supabase } from '@/shared/lib/supabase';
import { numberedSteps, parsePositiveNumber, type RecipeDraft } from '@/features/recipe-entry/draft';

/**
 * Creates a dinner — the row, its ingredient lines, its cooking steps and its tags — in ONE
 * database transaction (ADR-13).
 *
 * This is a single RPC on purpose. PostgREST inserts are separate HTTP calls, so writing the four
 * tables from here would leave a window in which the dinner row is committed and queryable with no
 * ingredients: another household member's catalog would list it and could pick it for the week.
 * That window exists on the path where nothing goes wrong, so no amount of cleanup closes it.
 *
 * Returns the new dinner's id.
 */
export async function createDinner(draft: RecipeDraft): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_dinner', {
    p_name: draft.name.trim(),
    p_cuisine_type: draft.cuisineType.trim(),
    // `parsePositiveNumber` is the same parser validation used, not a second one. `validateDraft`
    // has already refused anything it rejects, so the `?? 0` is unreachable in practice — it is
    // here because the type says `number | null` and a silent `!` would be a lie.
    p_cook_time_minutes: parsePositiveNumber(draft.cookTimeMinutes) ?? 0,
    p_instructions: draft.summary.trim(),
    p_ingredients: draft.ingredients.map((line) => ({
      quantity: parsePositiveNumber(line.quantity) ?? 0,
      unit: line.unit.trim(),
      name: line.name.trim(),
      category: line.category,
    })),
    // Ordered. The function numbers them with ORDINALITY, so the displayed order IS the stored
    // order and a gap cannot be expressed.
    p_steps: numberedSteps(draft.steps).map((step) => step.instruction.trim()),
    p_tag_names: [...draft.tagNames],
  });

  if (error) throw error;
  return data;
}

/** What went wrong with a save, in words the interface can show a person. */
export interface SaveRejection {
  message: string;
  /** True when renaming the dinner is the fix — lets the page point at the name field. */
  isDuplicateName: boolean;
}

/**
 * Maps a Postgres error to a short, plain-language message (story 006).
 *
 * Raw Postgres text never reaches the interface: "duplicate key value violates unique constraint
 * \"dinners_household_id_name_key\"" is not something to show anyone. The codes handled here are
 * the ones this path can actually produce.
 */
export function mapSaveError(error: unknown, dinnerName: string): SaveRejection {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  // 23505 unique_violation — the only unique constraint this path can hit is
  // `dinners_household_id_name_key`, scoped per household by intent 004.
  if (code === '23505') {
    const named = dinnerName.trim();
    return {
      isDuplicateName: true,
      message: named
        ? `You already have a dinner called “${named}”. Give this one a different name.`
        : 'You already have a dinner with that name. Give this one a different name.',
    };
  }

  // 23514 check_violation — a value the database refuses. Reachable via the function's own
  // "needs at least one ingredient/step" guards and via the category CHECK.
  if (code === '23514') {
    return {
      isDuplicateName: false,
      message:
        'Something in this recipe isn’t allowed — check the quantities, the cook time and the ingredient categories.',
    };
  }

  // 42501 insufficient_privilege — an RLS or grant problem. Distinct message because the fix is
  // never "try again": intent 008 spent a production incident learning that.
  if (code === '42501') {
    return {
      isDuplicateName: false,
      message: 'You don’t have permission to add dinners to this household.',
    };
  }

  return {
    isDuplicateName: false,
    message: 'Couldn’t save this dinner. Check your connection and try again.',
  };
}
