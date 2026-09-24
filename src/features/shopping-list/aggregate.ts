import type { DinnerWithIngredients } from '@/features/dinners/types';
import { mergeKey, plainLabel, unitKey } from '@/features/shopping-list/merge-key';
import type { ShoppingListGroup, ShoppingListItem } from '@/features/shopping-list/types';

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id.localeCompare(b.id);
}

/**
 * Merges ingredients across the given dinners into one line per grocery, and groups the lines by
 * category ("Other" for a missing/blank one).
 *
 * Two ingredients are the same line when their names share a merge key: the name without the prep
 * note after the first comma (`merge-key.ts`, intent 023 FR-1). Within a line, quantities in the same
 * unit are summed, singular and plural spellings included, and different units are kept as separate
 * amounts, never converted (FR-2).
 *
 * Dinners and their ingredients are visited in id order, because neither query orders them and
 * "first appearance" decides a line's label, category, unit spelling and amount order. The same
 * week therefore always builds the same list (NFR-3). Categories and items are then sorted
 * alphabetically.
 */
export function buildShoppingList(dinners: DinnerWithIngredients[]): ShoppingListGroup[] {
  const merged = new Map<string, ShoppingListItem>();

  for (const dinner of [...dinners].sort(byId)) {
    for (const ingredient of [...dinner.dinner_ingredients].sort(byId)) {
      const key = mergeKey(ingredient.name);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, {
          name: plainLabel(ingredient.name),
          amounts: [{ unit: ingredient.unit, quantity: ingredient.quantity }],
          category: ingredient.category.trim() || 'Other',
          sourceNames: [ingredient.name],
        });
        continue;
      }

      const amount = existing.amounts.find((a) => unitKey(a.unit) === unitKey(ingredient.unit));
      if (amount) amount.quantity += ingredient.quantity;
      else existing.amounts.push({ unit: ingredient.unit, quantity: ingredient.quantity });

      if (!existing.sourceNames.includes(ingredient.name)) existing.sourceNames.push(ingredient.name);
    }
  }

  const byCategory = new Map<string, ShoppingListItem[]>();
  for (const item of merged.values()) {
    const items = byCategory.get(item.category) ?? [];
    items.push(item);
    byCategory.set(item.category, items);
  }

  return [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
