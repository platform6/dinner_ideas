import type { ShoppingListAmount, ShoppingListGroup } from '@/features/shopping-list/types';

/**
 * A line's amounts as one string: `2 lb + 4`. Shared by the on-screen row and the clipboard so the
 * two always agree (intent 023, FR-2). A blank unit prints without a trailing space.
 */
export function formatAmounts(amounts: ShoppingListAmount[]): string {
  return amounts
    .map(({ quantity, unit }) => (unit.trim() ? `${quantity} ${unit.trim()}` : `${quantity}`))
    .join(' + ');
}

/** Plain text: category heading, then one `- {amounts} {name}` line per item. */
export function formatShoppingListText(groups: ShoppingListGroup[]): string {
  return groups
    .map((group) => {
      const lines = group.items.map((item) => `- ${formatAmounts(item.amounts)} ${item.name}`);
      return [group.category, ...lines].join('\n');
    })
    .join('\n\n');
}
