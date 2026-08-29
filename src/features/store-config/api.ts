import { supabase } from '@/shared/lib/supabase';
import type { CategoryRowAssignment, GroceryStoreRow } from '@/features/store-config/types';

/** All configured rows, in shopping order (FR-12). */
export async function fetchRows(): Promise<GroceryStoreRow[]> {
  const { data, error } = await supabase.from('grocery_store_rows').select('*').order('position');
  if (error) throw error;
  return data;
}

/** Appends a new row at the next available position (the caller already has the current list loaded for display). */
export async function addRow(name: string, currentRowCount: number): Promise<GroceryStoreRow> {
  const { data, error } = await supabase
    .from('grocery_store_rows')
    .insert({ name, position: currentRowCount + 1 })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Atomically moves a row to a new position via the `reorder_grocery_store_row` RPC (see `011-grocery-store-config`). */
export async function reorderRow(rowId: string, newPosition: number): Promise<GroceryStoreRow[]> {
  const { data, error } = await supabase.rpc('reorder_grocery_store_row', {
    p_row_id: rowId,
    p_new_position: newPosition,
  });

  if (error) throw error;
  return data;
}

/** Deletes a row. Its category assignments cascade away (those categories become unassigned, not orphaned). */
export async function deleteRow(rowId: string): Promise<void> {
  const { error } = await supabase.from('grocery_store_rows').delete().eq('id', rowId);
  if (error) throw error;
}

/** All current category → row assignments. */
export async function fetchAssignments(): Promise<CategoryRowAssignment[]> {
  const { data, error } = await supabase.from('category_row_assignments').select('*');
  if (error) throw error;
  return data;
}

/**
 * Assigns (or reassigns) a category to a row — upsert, last write wins, no history kept.
 * `household_id` is omitted from the payload: the column defaults to
 * `current_user_household_id()`, so the row self-assigns to the caller's household. The conflict
 * target is the composite PK `(household_id, category)` (bolt 030).
 */
export async function assignCategory(category: string, rowId: string): Promise<void> {
  const { error } = await supabase
    .from('category_row_assignments')
    .upsert({ category, row_id: rowId }, { onConflict: 'household_id,category' });

  if (error) throw error;
}
