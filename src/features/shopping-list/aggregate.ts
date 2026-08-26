import type { DinnerWithIngredients } from '@/features/dinners/types';
import type { ShoppingListGroup, ShoppingListItem } from '@/features/shopping-list/types';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Merges ingredients across the given dinners by normalized name + unit (summing quantities),
 * keeps mismatched-unit ingredients as separate lines, and groups the result by category —
 * "Other" for a missing/blank one. Categories and items are both sorted alphabetically so the
 * result is deterministic.
 */
export function buildShoppingList(dinners: DinnerWithIngredients[]): ShoppingListGroup[] {
  const merged = new Map<string, ShoppingListItem>();

  for (const dinner of dinners) {
    for (const ingredient of dinner.dinner_ingredients) {
      const key = `${normalize(ingredient.name)}|${normalize(ingredient.unit)}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += ingredient.quantity;
      } else {
        merged.set(key, {
          name: ingredient.name,
          unit: ingredient.unit,
          quantity: ingredient.quantity,
          category: ingredient.category.trim() || 'Other',
        });
      }
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
