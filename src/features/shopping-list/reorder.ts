import type { ResolvedItem } from '@/features/store-config/types';
import type { ShoppingListGroup } from '@/features/shopping-list/types';

/**
 * Normalizes an ingredient name to the registry's dedup key so an aggregated
 * `ShoppingListItem` can be matched to its `ResolvedItem`.
 *
 * This must stay identical to `items.name_key`'s generated expression —
 * `lower(btrim(name))` — which is what lets the client and the database agree on identity
 * without a join. A drift in either direction silently stops matching, so
 * `reorder.test.ts` asserts it against a name with different casing and surrounding space.
 */
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Orders `buildShoppingList`'s output by the household's walking path (FR-17), replacing the
 * retired `category → grocery_store_row.position` sort.
 *
 * Groups stay CATEGORY-based — only the key they sort by changes. Each group takes the
 * **minimum** resolved position among its items: the earliest point on the path where you will
 * find something from that group.
 *
 * That degrades exactly to the old behaviour rather than approximating it. The cutover creates
 * zero explicit placements (unit 1, story 007), so every item in a category resolves through
 * that category's own placement, every item in a group shares one position, and the minimum is
 * simply that position.
 *
 * A group whose items resolve nowhere sorts after every located group, in its existing
 * (alphabetical) relative order — today's fallback, preserved. `Array.sort` is stable and
 * `buildShoppingList` already emits groups alphabetically, so ties need no tie-breaker.
 */
export function reorderGroupsByLocation(
  groups: ShoppingListGroup[],
  resolvedItems: ResolvedItem[],
): ShoppingListGroup[] {
  const positionByNameKey = new Map<string, number>();
  for (const item of resolvedItems) {
    if (item.locationPosition !== null) positionByNameKey.set(item.nameKey, item.locationPosition);
  }

  function groupPosition(group: ShoppingListGroup): number | undefined {
    let earliest: number | undefined;
    for (const item of group.items) {
      const position = positionByNameKey.get(nameKey(item.name));
      if (position !== undefined && (earliest === undefined || position < earliest)) {
        earliest = position;
      }
    }
    return earliest;
  }

  const positions = new Map(groups.map((group) => [group.category, groupPosition(group)]));

  return [...groups].sort((a, b) => {
    const posA = positions.get(a.category);
    const posB = positions.get(b.category);

    if (posA !== undefined && posB !== undefined) return posA - posB;
    if (posA !== undefined) return -1;
    if (posB !== undefined) return 1;
    return 0; // neither is on the path — preserve alphabetical order, sort is stable
  });
}
