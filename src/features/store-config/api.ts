import { supabase } from '@/shared/lib/supabase';
import { inferLocationType } from '@/features/store-config/location-name';
import type { Location, PlacementState, ResolvedItem, Store } from '@/features/store-config/types';

type ResolutionRow = {
  item_id: string | null;
  item_name: string | null;
  name_key: string | null;
  item_category: string | null;
  state: string | null;
  location_id: string | null;
  location_name: string | null;
  location_position: number | null;
  via_category: string | null;
};

const PLACEMENT_STATES: readonly string[] = ['placed', 'inherited', 'unassigned'];

/**
 * Narrows a view row (all-nullable in the generated types) to `ResolvedItem`. A row without an
 * item identity or a recognised state is dropped rather than coerced — the view is total by
 * construction, so this only ever fires if the view's shape changes underneath us.
 */
function mapResolvedItem(row: ResolutionRow): ResolvedItem | null {
  if (!row.item_id || !row.item_name || !row.name_key) return null;
  if (!row.state || !PLACEMENT_STATES.includes(row.state)) return null;

  return {
    itemId: row.item_id,
    itemName: row.item_name,
    nameKey: row.name_key,
    category: row.item_category,
    state: row.state as PlacementState,
    locationId: row.location_id,
    locationName: row.location_name,
    locationPosition: row.location_position,
    viaCategory: row.via_category,
  };
}

/**
 * The household's active store. v1 has exactly one (seeded by the cutover, `20260904190000`),
 * guaranteed by a partial unique index — but this returns `null` rather than throwing if none
 * exists, so a household mid-provisioning renders the empty state instead of an error.
 */
export async function fetchActiveStore(): Promise<Store | null> {
  const { data, error } = await supabase.from('stores').select('*').eq('is_active', true).maybeSingle();

  if (error) throw error;
  return data;
}

/** The walking path, in the order it is walked. */
export async function fetchLocations(storeId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('store_id', storeId)
    .order('position');

  if (error) throw error;
  return data;
}

/** Every item's resolved location and state for this store (FR-6). */
export async function fetchResolvedItems(storeId: string): Promise<ResolvedItem[]> {
  const { data, error } = await supabase
    .from('item_location_resolution')
    .select(
      'item_id, item_name, name_key, item_category, state, location_id, location_name, location_position, via_category',
    )
    .eq('store_id', storeId);

  if (error) throw error;
  return (data ?? []).map(mapResolvedItem).filter((item): item is ResolvedItem => item !== null);
}

/**
 * Appends a stop at the end of the path — where a remembered stop usually belongs; the arrows
 * move it from there.
 *
 * `household_id` is passed explicitly rather than relying on a column default: unlike the
 * retired `grocery_store_rows`, `locations.household_id` has no `current_user_household_id()`
 * default, because it is half of a composite FK into `stores (id, household_id)` (ADR-8). The
 * store row already carries the right value, and RLS still rejects any other.
 */
export async function addLocation(store: Store, name: string, position: number): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .insert({
      household_id: store.household_id,
      store_id: store.id,
      name,
      type: inferLocationType(name),
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Renames a stop. `type` is re-derived from the new name — it is never edited separately. */
export async function renameLocation(locationId: string, name: string): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .update({ name, type: inferLocationType(name) })
    .eq('id', locationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a stop. Its `item_placements` / `category_placements` rows cascade away (unit 1,
 * story 003) — the affected items fall back down the resolution chain. No Item is ever deleted.
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', locationId);
  if (error) throw error;
}

/**
 * Atomically moves a stop, shifting the range between old and new position, scoped to this
 * store (unit 1, story 006).
 */
export async function reorderLocation(locationId: string, newPosition: number): Promise<Location[]> {
  const { data, error } = await supabase.rpc('reorder_location', {
    p_location_id: locationId,
    p_new_position: newPosition,
  });

  if (error) throw error;
  return data;
}

/**
 * How many placement rows point at a stop — the number the destructive confirm states before
 * anything is deleted (story 006). Counts BOTH levels: a stop holding only a category default
 * still costs the user something when it goes.
 */
export async function countPlacementsAtLocation(locationId: string): Promise<number> {
  const [items, categories] = await Promise.all([
    supabase
      .from('item_placements')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
    supabase
      .from('category_placements')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
  ]);

  if (items.error) throw items.error;
  if (categories.error) throw categories.error;

  return (items.count ?? 0) + (categories.count ?? 0);
}
