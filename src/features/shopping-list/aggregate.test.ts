import { describe, expect, it } from 'vitest';

import { buildShoppingList } from '@/features/shopping-list/aggregate';
import type { DinnerIngredient, DinnerWithIngredients } from '@/features/dinners/types';

let nextIngredientId = 1;

function ingredient(overrides: Partial<DinnerIngredient>): DinnerIngredient {
  return {
    id: `ingredient-${nextIngredientId++}`,
    dinner_id: 'dinner-id',
    name: 'Ingredient',
    quantity: 1,
    unit: 'each',
    category: 'Pantry',
    ...overrides,
  };
}

function dinner(id: string, ingredients: DinnerIngredient[]): DinnerWithIngredients {
  return {
    id,
    name: `Dinner ${id}`,
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    rosie_approved: false,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: ingredients,
  };
}

describe('buildShoppingList', () => {
  it('merges the same ingredient (name + unit) across dinners, summing quantities', () => {
    const dinners = [
      dinner('1', [ingredient({ name: 'onion', unit: 'each', quantity: 2, category: 'Produce' })]),
      dinner('2', [ingredient({ name: 'onion', unit: 'each', quantity: 1, category: 'Produce' })]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups).toEqual([{ category: 'Produce', items: [{ name: 'onion', unit: 'each', quantity: 3, category: 'Produce' }] }]);
  });

  it('keeps the same ingredient name with mismatched units as separate lines', () => {
    const dinners = [
      dinner('1', [ingredient({ name: 'chicken broth', unit: 'cup', quantity: 2, category: 'Pantry' })]),
      dinner('2', [ingredient({ name: 'chicken broth', unit: 'can', quantity: 1, category: 'Pantry' })]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].items.map((i) => i.unit).sort()).toEqual(['can', 'cup']);
  });

  it('normalizes casing and whitespace for the merge key without changing the displayed name', () => {
    const dinners = [
      dinner('1', [ingredient({ name: 'Onion', unit: 'each', quantity: 1, category: 'Produce' })]),
      dinner('2', [ingredient({ name: ' onion ', unit: ' Each ', quantity: 1, category: 'Produce' })]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0]).toEqual({ name: 'Onion', unit: 'each', quantity: 2, category: 'Produce' });
  });

  it('falls back to "Other" for a blank category', () => {
    const dinners = [dinner('1', [ingredient({ category: '  ' })])];
    const groups = buildShoppingList(dinners);
    expect(groups[0].category).toBe('Other');
  });

  it('sorts categories and items within each category alphabetically', () => {
    const dinners = [
      dinner('1', [
        ingredient({ name: 'zucchini', category: 'Produce' }),
        ingredient({ name: 'apple', category: 'Produce' }),
        ingredient({ name: 'flour', category: 'Baking' }),
      ]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups.map((g) => g.category)).toEqual(['Baking', 'Produce']);
    expect(groups[1].items.map((i) => i.name)).toEqual(['apple', 'zucchini']);
  });

  it('returns an empty list for dinners with no ingredients', () => {
    expect(buildShoppingList([dinner('1', [])])).toEqual([]);
  });
});
