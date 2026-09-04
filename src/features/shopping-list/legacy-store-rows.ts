import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/shared/lib/database.types';

/**
 * ⚠️ RETIRED-IN-WAITING — the last reader of the pre-intent-010 store model.
 *
 * `grocery_store_rows` / `category_row_assignments` were replaced by the Store → Location →
 * Item model (intent 010, unit 001). Bolt 052 moved the store-config page onto the new model;
 * this file is what remains, and it exists only so the shopping list keeps sorting correctly
 * until **unit 003 / bolt 054** switches it to `item_location_resolution`.
 *
 * It lives in `shopping-list/` rather than `store-config/` because the shopping list is now its
 * only consumer, and this project organizes by feature. Fetchers only — the React Query
 * wrappers sit in this feature's `hooks.ts`, matching the api/hooks split used everywhere else
 * (and keeping `vi.mock` of this module from stubbing the hooks too).
 *
 * **Delete this file in bolt 054**, together with `reorder.ts`'s row-based sort. That is also
 * the last precondition for landing
 * `memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`, which drops
 * the underlying tables (ADR-9).
 */

export type GroceryStoreRow = Database['public']['Tables']['grocery_store_rows']['Row'];
export type CategoryRowAssignment = Database['public']['Tables']['category_row_assignments']['Row'];

export async function fetchRows(): Promise<GroceryStoreRow[]> {
  const { data, error } = await supabase.from('grocery_store_rows').select('*').order('position');
  if (error) throw error;
  return data;
}

export async function fetchAssignments(): Promise<CategoryRowAssignment[]> {
  const { data, error } = await supabase.from('category_row_assignments').select('*');
  if (error) throw error;
  return data;
}
