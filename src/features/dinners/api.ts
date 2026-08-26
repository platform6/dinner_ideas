import { supabase } from '@/shared/lib/supabase';
import type { DinnerWithIngredients, DinnerWithSteps } from '@/features/dinners/types';

/** Active (non-suppressed) dinners, with their ingredients embedded. */
export async function fetchActiveDinners(): Promise<DinnerWithIngredients[]> {
  const { data, error } = await supabase
    .from('dinners')
    .select('*, dinner_ingredients(*)')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as DinnerWithIngredients[];
}

/** Suppressed ("not interested") dinners, for the Suppressed view. */
export async function fetchSuppressedDinners(): Promise<DinnerWithIngredients[]> {
  const { data, error } = await supabase
    .from('dinners')
    .select('*, dinner_ingredients(*)')
    .eq('is_active', false)
    .order('name');

  if (error) throw error;
  return data as DinnerWithIngredients[];
}

/** Suppress or un-suppress a dinner (FR-7). Reversible — never deletes. */
export async function setDinnerActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('dinners').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

/**
 * Fetches specific dinners by id, regardless of `is_active`. Used for the shopping list, which
 * must still work for a locked plan's picks even if one has since been suppressed.
 */
export async function fetchDinnersByIds(ids: string[]): Promise<DinnerWithIngredients[]> {
  const { data, error } = await supabase.from('dinners').select('*, dinner_ingredients(*)').in('id', ids);

  if (error) throw error;
  return data as DinnerWithIngredients[];
}

/**
 * Fetches specific dinners by id with their ordered cooking steps embedded (from
 * `007-dinner-catalog`). Separate from `fetchDinnersByIds` (which embeds ingredients) so the
 * shopping list and cooking view each fetch only what they need.
 */
export async function fetchDinnersWithStepsByIds(ids: string[]): Promise<DinnerWithSteps[]> {
  const { data, error } = await supabase
    .from('dinners')
    .select('*, dinner_steps(*)')
    .in('id', ids)
    .order('step_number', { referencedTable: 'dinner_steps' });

  if (error) throw error;
  return data as DinnerWithSteps[];
}

/**
 * Reads the `dinner_last_chosen` view (from `002-weekly-planning`): each dinner's most recent
 * *locked*-plan date, or `null` if it's never been part of one. Returned as a map for O(1)
 * per-dinner lookup in the catalog.
 */
export async function fetchLastChosenDates(): Promise<Map<string, string | null>> {
  const { data, error } = await supabase.from('dinner_last_chosen').select('*');
  if (error) throw error;

  const dates = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (row.dinner_id) dates.set(row.dinner_id, row.last_chosen_date);
  }
  return dates;
}
