import type { ShoppingListGroup } from '@/features/shopping-list/types';

/** Plain text: category heading, then one `- {quantity} {unit} {name}` line per item. */
export function formatShoppingListText(groups: ShoppingListGroup[]): string {
  return groups
    .map((group) => {
      const lines = group.items.map((item) => `- ${item.quantity} ${item.unit} ${item.name}`);
      return [group.category, ...lines].join('\n');
    })
    .join('\n\n');
}
