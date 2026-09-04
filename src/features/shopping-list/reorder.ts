import type { CategoryRowAssignment, GroceryStoreRow } from '@/features/shopping-list/legacy-store-rows';
import type { ShoppingListGroup } from '@/features/shopping-list/types';

/**
 * Reorders `buildShoppingList`'s output to match the household's configured store row sequence
 * (FR-12) instead of alphabetical order. A category with no row assignment falls back to
 * appearing after every configured category, in its original (alphabetical) relative order —
 * so an unconfigured or partially-configured store never breaks the shopping list.
 */
export function reorderGroupsByRows(
  groups: ShoppingListGroup[],
  rows: GroceryStoreRow[],
  assignments: CategoryRowAssignment[],
): ShoppingListGroup[] {
  const rowPositionById = new Map(rows.map((row) => [row.id, row.position]));
  const positionByCategory = new Map<string, number>();
  for (const assignment of assignments) {
    const position = rowPositionById.get(assignment.row_id);
    if (position !== undefined) positionByCategory.set(assignment.category, position);
  }

  return [...groups].sort((a, b) => {
    const posA = positionByCategory.get(a.category);
    const posB = positionByCategory.get(b.category);

    if (posA !== undefined && posB !== undefined) return posA - posB;
    if (posA !== undefined) return -1;
    if (posB !== undefined) return 1;
    return 0; // both unassigned — preserve the existing (alphabetical) order, sort is stable
  });
}
