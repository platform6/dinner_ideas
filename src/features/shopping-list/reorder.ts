import type { ResolvedItem } from '@/features/store-config/types';
import type { ShoppingListGroup, ShoppingListItem } from '@/features/shopping-list/types';

/**
 * Normalizes an ingredient name to the registry's dedup key so an aggregated
 * `ShoppingListItem` can be matched to its `ResolvedItem`.
 *
 * This must stay identical to `items.name_key`'s generated expression —
 * `lower(btrim(name))` — which is what lets the client and the database agree on identity
 * without a join. A drift in either direction silently stops matching, so
 * `reorder.test.ts` asserts it against a name with different casing and surrounding space.
 *
 * Exported because the move affordance (unit 3) has to answer the same question this sort does —
 * "which `ResolvedItem` is this aggregated line?" — and a second copy of the rule is exactly the
 * drift described above, just spread across two files instead of one.
 */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Registry items by `nameKey`, built once per render for `lineItem`. */
export function indexByNameKey(resolvedItems: ResolvedItem[]): Map<string, ResolvedItem> {
  return new Map(resolvedItems.map((item) => [item.nameKey, item]));
}

/**
 * The registry item a shopping-list line stands for: where it sorts, and what its move sheet edits.
 *
 * Since intent 023 a line can merge several raw names ("chicken breast" + "chicken breast, cubed"),
 * each its own registry item with its own placement. FR-4 picks one, so merging never loses an aisle:
 *
 * 1. the item named exactly as the line's label
 * 2. otherwise, the first source name whose item is explicitly `placed`
 * 3. otherwise, the first source name with an item at all
 *
 * The choice is stable across a move from the list: the item moved becomes `placed`, and each rule
 * then picks it again. The sort and the page both call this, so the rule exists once.
 */
export function lineItem(
  line: ShoppingListItem,
  itemsByNameKey: Map<string, ResolvedItem>,
): ResolvedItem | undefined {
  const exact = itemsByNameKey.get(nameKey(line.name));
  if (exact) return exact;

  const sources = line.sourceNames
    .map((name) => itemsByNameKey.get(nameKey(name)))
    .filter((item): item is ResolvedItem => item !== undefined);
  return sources.find((item) => item.state === 'placed') ?? sources[0];
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
  const itemsByNameKey = indexByNameKey(resolvedItems);

  function groupPosition(group: ShoppingListGroup): number | undefined {
    let earliest: number | undefined;
    for (const item of group.items) {
      const position = lineItem(item, itemsByNameKey)?.locationPosition ?? undefined;
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
