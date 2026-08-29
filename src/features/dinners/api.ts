import { supabase } from '@/shared/lib/supabase';
import { normalizeTagName } from '@/features/dinners/tags';
import type {
  CatalogDinner,
  DinnerFullDetails,
  DinnerWithIngredients,
  DinnerWithSteps,
  Tag,
} from '@/features/dinners/types';

/** Raw shape of a dinner row embedded with `dinner_tags(tags(name))`, before flattening to `tags: string[]`. */
type RawCatalogRow = Omit<CatalogDinner, 'tags'> & {
  dinner_tags: Array<{ tags: Pick<Tag, 'name'> | null }>;
};

/** Flattens the nested `dinner_tags(tags(name))` embed into a plain `tags: string[]`. */
function toCatalogDinner(row: RawCatalogRow): CatalogDinner {
  const { dinner_tags, ...rest } = row;
  return { ...rest, tags: dinner_tags.map((dt) => dt.tags?.name).filter((name): name is string => !!name) };
}

/** Active (non-suppressed) dinners, with their ingredients and tags embedded. */
export async function fetchActiveDinners(): Promise<CatalogDinner[]> {
  const { data, error } = await supabase
    .from('dinners')
    .select('*, dinner_ingredients(*), dinner_tags(tags(name))')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data as RawCatalogRow[]).map(toCatalogDinner);
}

/** Suppressed ("not interested") dinners, for the Suppressed view. */
export async function fetchSuppressedDinners(): Promise<CatalogDinner[]> {
  const { data, error } = await supabase
    .from('dinners')
    .select('*, dinner_ingredients(*), dinner_tags(tags(name))')
    .eq('is_active', false)
    .order('name');

  if (error) throw error;
  return (data as RawCatalogRow[]).map(toCatalogDinner);
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

/**
 * Everything a catalog card's expanded "Details" section needs for one dinner (FR-10): ordered
 * steps, full ingredient list, and tags (with ids, since removing one needs `tag_id`). Fetched
 * lazily, only once a card is actually expanded — not preloaded for the whole catalog.
 */
export async function fetchDinnerFullDetails(dinnerId: string): Promise<DinnerFullDetails> {
  const { data, error } = await supabase
    .from('dinners')
    .select('dinner_steps(*), dinner_ingredients(*), dinner_tags(tags(id, name))')
    .eq('id', dinnerId)
    .order('step_number', { referencedTable: 'dinner_steps' })
    .single();

  if (error) throw error;

  const row = data as unknown as {
    dinner_steps: DinnerFullDetails['dinner_steps'];
    dinner_ingredients: DinnerFullDetails['dinner_ingredients'];
    dinner_tags: Array<{ tags: Pick<Tag, 'id' | 'name'> | null }>;
  };

  return {
    dinner_steps: row.dinner_steps,
    dinner_ingredients: row.dinner_ingredients,
    tags: row.dinner_tags.map((dt) => dt.tags).filter((tag): tag is Pick<Tag, 'id' | 'name'> => !!tag),
  };
}

/** The full tag vocabulary (FR-9), for the catalog's tag filter. */
export async function fetchAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) throw error;
  return data;
}

/**
 * Attaches a tag to a dinner (FR-9), creating the tag if it doesn't already exist. Normalizes to
 * lowercase client-side too (see `tags.ts`), though the DB `CHECK` constraint is the real
 * enforcement. Idempotent — adding the same tag twice is a no-op, not an error.
 */
export async function addTagToDinner(dinnerId: string, rawName: string): Promise<void> {
  const name = normalizeTagName(rawName);
  if (!name) return;

  // `household_id` is omitted: it defaults to `current_user_household_id()`, so the tag
  // self-assigns to the caller's household. Conflict target is `unique (household_id, name)`
  // (bolt 027) — a tag name is unique per household, not globally.
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .upsert({ name }, { onConflict: 'household_id,name', ignoreDuplicates: false })
    .select()
    .single();
  if (tagError) throw tagError;

  const { error: linkError } = await supabase
    .from('dinner_tags')
    .upsert(
      { dinner_id: dinnerId, tag_id: tag.id },
      { onConflict: 'dinner_id,tag_id', ignoreDuplicates: true },
    );
  if (linkError) throw linkError;
}

/** Detaches a tag from a dinner (FR-9). Only removes the association — the shared `tags` row is never deleted. */
export async function removeTagFromDinner(dinnerId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('dinner_tags').delete().eq('dinner_id', dinnerId).eq('tag_id', tagId);
  if (error) throw error;
}

/**
 * Every distinct, non-blank grocery category currently used across all ingredients (FR-12) —
 * for the store-config page's category-assignment list. Deduped/sorted client-side, same
 * pattern `CatalogPage.tsx` already uses to derive its cuisine filter list.
 */
export async function fetchDistinctIngredientCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('dinner_ingredients').select('category');
  if (error) throw error;

  const categories = new Set<string>();
  for (const row of data) {
    const category = row.category.trim();
    if (category) categories.add(category);
  }
  return [...categories].sort();
}
