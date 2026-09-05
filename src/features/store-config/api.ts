import { supabase } from '@/shared/lib/supabase';
import { inferLocationType } from '@/features/store-config/location-name';
import {
  INGREDIENT_CATEGORIES,
  type CategoryPlacementView,
  type IngredientCategory,
  type Location,
  type PlacementState,
  type ResolvedItem,
  type Store,
  type SuggestionDismissal,
} from '@/features/store-config/types';

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
  reviewed_at: string | null;
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
    reviewedAt: row.reviewed_at,
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
      'item_id, item_name, name_key, item_category, state, location_id, location_name, location_position, via_category, reviewed_at',
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

/**
 * Places an item at a stop — the single write behind both "Same spot" (accepting a suggestion)
 * and picking a row in the picker. Upserts on `(item_id, store_id)`: re-placing an item moves
 * it, it never creates a second row (unit 1, story 003).
 */
export async function placeItem(store: Store, itemId: string, locationId: string): Promise<void> {
  const { error } = await supabase.from('item_placements').upsert(
    {
      household_id: store.household_id,
      store_id: store.id,
      item_id: itemId,
      location_id: locationId,
    },
    { onConflict: 'item_id,store_id' },
  );

  if (error) throw error;
}

/**
 * Every category paired with the stop it currently resolves to, including the ones sitting
 * nowhere (FR-2).
 *
 * Built from the CHECK set rather than from the rows returned, because a category with no
 * placement has no row — and it is precisely those that most need to be listed, since a category
 * you cannot see is a category you cannot place.
 */
export async function fetchCategoryPlacements(storeId: string): Promise<CategoryPlacementView[]> {
  const { data, error } = await supabase
    .from('category_placements')
    .select('category, location_id, locations(name, position)')
    .eq('store_id', storeId);

  if (error) throw error;

  const placed = new Map(
    (data ?? []).map((row) => [
      row.category,
      {
        locationId: row.location_id,
        locationName: row.locations?.name ?? null,
        locationPosition: row.locations?.position ?? null,
      },
    ]),
  );

  return INGREDIENT_CATEGORIES.map((category) => ({
    category,
    locationId: placed.get(category)?.locationId ?? null,
    locationName: placed.get(category)?.locationName ?? null,
    locationPosition: placed.get(category)?.locationPosition ?? null,
  }));
}

/**
 * Moves a whole category to a stop — every item inheriting from it follows, while items with
 * their own explicit placement stay put (the resolution order, FR-6).
 *
 * Upserts on `(store_id, category)`, mirroring `placeItem`. That conflict target is what makes
 * this a MOVE rather than an add: a category sits in exactly one place per store, and the unique
 * constraint enforces it whatever the UI says.
 *
 * Unlike `items`, `category_placements` carries ordinary table grants and full RLS policies from
 * intent 010 — this is simply the first code to write to it.
 */
export async function setCategoryPlacement(
  store: Store,
  category: IngredientCategory,
  locationId: string,
): Promise<void> {
  const { error } = await supabase.from('category_placements').upsert(
    {
      household_id: store.household_id,
      store_id: store.id,
      category,
      location_id: locationId,
    },
    { onConflict: 'store_id,category' },
  );

  if (error) throw error;
}

/**
 * Takes a category off the path. Its items fall back to unassigned — a normal state, not an
 * error. A delete rather than a null-out, because absence of the row IS "not placed"
 * (Resolved Decision 3), the same rule `unplaceItem` follows.
 */
export async function unsetCategoryPlacement(storeId: string, category: IngredientCategory): Promise<void> {
  const { error } = await supabase
    .from('category_placements')
    .delete()
    .eq('store_id', storeId)
    .eq('category', category);

  if (error) throw error;
}

/**
 * Marks one item reviewed — "I have looked at where this sits".
 *
 * An RPC rather than an `.update()` because `items` carries no application write grant at all:
 * it is trigger-owned so that grocery identity has exactly one spelling rule (ADR-7), and the
 * exception this feature needs is a function that names the one column rather than a grant that
 * withholds the others (ADR-10). A direct update — of `reviewed_at` or anything else — fails
 * with `permission denied for table items`, by design.
 *
 * Idempotent, and the household is resolved server-side, so every caller (accept a stop, move an
 * item, place one) can fire it unconditionally without checking first or passing a household id.
 * A foreign or missing id affects zero rows and returns normally.
 */
export async function markItemReviewed(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_item_reviewed', { p_item_id: itemId });
  if (error) throw error;
}

/**
 * "Take it off the path" — removes the explicit placement so the item falls back to its
 * category, or to unassigned. Absence of the row IS the "not placed" state (Resolved Decision
 * 3), so this is a delete rather than a null-out.
 */
export async function unplaceItem(storeId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('item_placements')
    .delete()
    .eq('store_id', storeId)
    .eq('item_id', itemId);

  if (error) throw error;
}

/** Remembers that this suggestion was rejected, so the pairing stops being offered (FR-8). */
export async function dismissSuggestion(
  store: Store,
  itemId: string,
  suggestedItemId: string,
): Promise<void> {
  const { error } = await supabase.from('suggestion_dismissals').upsert(
    {
      household_id: store.household_id,
      store_id: store.id,
      item_id: itemId,
      suggested_item_id: suggestedItemId,
    },
    { onConflict: 'store_id,item_id,suggested_item_id', ignoreDuplicates: true },
  );

  if (error) throw error;
}

/** Every rejected pairing in this store, so the suggestion engine can exclude them. */
export async function fetchDismissals(storeId: string): Promise<SuggestionDismissal[]> {
  const { data, error } = await supabase.from('suggestion_dismissals').select('*').eq('store_id', storeId);

  if (error) throw error;
  return data;
}
