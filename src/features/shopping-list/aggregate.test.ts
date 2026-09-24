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
    household_id: 'hh-test',
    name: `Dinner ${id}`,
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
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
    expect(groups).toEqual([
      {
        category: 'Produce',
        items: [
          {
            name: 'onion',
            amounts: [{ unit: 'each', quantity: 3 }],
            category: 'Produce',
            sourceNames: ['onion'],
          },
        ],
      },
    ]);
  });

  it('keeps mismatched units as separate amounts on ONE line, unconverted (intent 023, FR-2)', () => {
    const dinners = [
      dinner('1', [ingredient({ name: 'chicken broth', unit: 'cup', quantity: 2, category: 'Pantry' })]),
      dinner('2', [ingredient({ name: 'chicken broth', unit: 'can', quantity: 1, category: 'Pantry' })]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].amounts).toEqual([
      { unit: 'cup', quantity: 2 },
      { unit: 'can', quantity: 1 },
    ]);
  });

  it('normalizes casing and whitespace for the merge key without changing the displayed name', () => {
    const dinners = [
      dinner('1', [ingredient({ name: 'Onion', unit: 'each', quantity: 1, category: 'Produce' })]),
      dinner('2', [ingredient({ name: ' onion ', unit: ' Each ', quantity: 1, category: 'Produce' })]),
    ];

    const groups = buildShoppingList(dinners);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0]).toEqual({
      name: 'Onion',
      amounts: [{ unit: 'each', quantity: 2 }],
      category: 'Produce',
      sourceNames: ['Onion', ' onion '],
    });
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

describe('buildShoppingList — consolidation (intent 023)', () => {
  const namesOf = (groups: ReturnType<typeof buildShoppingList>) =>
    groups.flatMap((g) => g.items.map((i) => i.name));

  it('should merge a line that differs only by a prep note after a comma (FR-1)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'chicken thighs', unit: 'lb', quantity: 1, category: 'Protein' })]),
      dinner('2', [
        ingredient({ name: 'chicken thighs, cubed', unit: 'lb', quantity: 1, category: 'Protein' }),
      ]),
    ]);

    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].amounts).toEqual([{ unit: 'lb', quantity: 2 }]);
  });

  it('should merge every comma-note variant into one line (FR-1)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'onion', unit: 'each', quantity: 1, category: 'Produce' })]),
      dinner('2', [ingredient({ name: 'onion, diced', unit: 'each', quantity: 1, category: 'Produce' })]),
      dinner('3', [
        ingredient({ name: 'onion, finely chopped', unit: 'each', quantity: 2, category: 'Produce' }),
      ]),
    ]);

    expect(namesOf(groups)).toEqual(['onion']);
    expect(groups[0].items[0].amounts).toEqual([{ unit: 'each', quantity: 4 }]);
  });

  it('should keep canned diced tomatoes apart from fresh tomatoes (NFR-2, from the household catalog)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'tomatoes', unit: 'cup', quantity: 2, category: 'Produce' })]),
      dinner('2', [ingredient({ name: 'diced tomatoes', unit: 'can', quantity: 1, category: 'Pantry' })]),
    ]);

    expect(namesOf(groups).sort()).toEqual(['diced tomatoes', 'tomatoes']);
  });

  it('should sum a unit and its plural as one amount, keeping the first spelling (FR-2)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'shredded cheese', unit: 'cups', quantity: 4.5, category: 'Dairy' })]),
      dinner('2', [ingredient({ name: 'shredded cheese', unit: 'cup', quantity: 4.5, category: 'Dairy' })]),
    ]);

    expect(groups[0].items[0].amounts).toEqual([{ unit: 'cups', quantity: 9 }]);
  });

  it('should keep plurals and look-alike groceries as separate lines (FR-1, NFR-2)', () => {
    const groups = buildShoppingList([
      dinner('1', [
        ingredient({ name: 'onion', category: 'Produce' }),
        ingredient({ name: 'onions', category: 'Produce' }),
        ingredient({ name: 'green onion', category: 'Produce' }),
        ingredient({ name: 'tomato sauce', category: 'Pantry' }),
        ingredient({ name: 'tomato paste', category: 'Pantry' }),
      ]),
    ]);

    expect(namesOf(groups).sort()).toEqual([
      'green onion',
      'onion',
      'onions',
      'tomato paste',
      'tomato sauce',
    ]);
  });

  it('should show each unit side by side in first-appearance order, unconverted (FR-2)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'chicken thighs', unit: 'lb', quantity: 2, category: 'Protein' })]),
      dinner('2', [
        ingredient({ name: 'chicken thighs, cubed', unit: '', quantity: 4, category: 'Protein' }),
      ]),
      dinner('3', [ingredient({ name: 'Chicken thighs', unit: 'LB', quantity: 1, category: 'Protein' })]),
    ]);

    expect(groups[0].items[0].amounts).toEqual([
      { unit: 'lb', quantity: 3 },
      { unit: '', quantity: 4 },
    ]);
  });

  it('should not convert tbsp and tsp (FR-2)', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'olive oil', unit: 'tbsp', quantity: 1 })]),
      dinner('2', [ingredient({ name: 'olive oil', unit: 'tsp', quantity: 2 })]),
    ]);

    expect(groups[0].items[0].amounts).toEqual([
      { unit: 'tbsp', quantity: 1 },
      { unit: 'tsp', quantity: 2 },
    ]);
  });

  it("should label a merged line without prep notes, in its first appearance's capitalization (FR-3)", () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'Chicken Thighs, cubed', category: 'Protein' })]),
      dinner('2', [ingredient({ name: 'chicken thighs', category: 'Protein' })]),
    ]);

    expect(groups[0].items[0].name).toBe('Chicken Thighs');
  });

  it('should record each distinct raw name that went into a line, in order', () => {
    const groups = buildShoppingList([
      dinner('1', [ingredient({ name: 'chicken thighs, cubed', category: 'Protein' })]),
      dinner('2', [ingredient({ name: 'chicken thighs', category: 'Protein' })]),
      dinner('3', [ingredient({ name: 'chicken thighs, cubed', category: 'Protein' })]),
    ]);

    expect(groups[0].items[0].sourceNames).toEqual(['chicken thighs, cubed', 'chicken thighs']);
  });

  it('should build the identical list whatever order dinners and ingredients load in (NFR-3)', () => {
    const a = ingredient({ id: 'i-a', name: 'Chicken Thighs', unit: 'lb', quantity: 1, category: 'Protein' });
    const b = ingredient({
      id: 'i-b',
      name: 'chicken thighs, cubed',
      unit: '',
      quantity: 3,
      category: 'Meat',
    });
    const c = ingredient({ id: 'i-c', name: 'onion', unit: 'each', quantity: 1, category: 'Produce' });
    const d = ingredient({ id: 'i-d', name: 'Onion, diced', unit: 'cup', quantity: 1, category: 'Produce' });

    const forward = buildShoppingList([dinner('1', [a, c]), dinner('2', [b, d])]);
    const shuffled = buildShoppingList([dinner('2', [d, b]), dinner('1', [c, a])]);

    expect(shuffled).toEqual(forward);
    expect(forward.find((g) => g.category === 'Protein')?.items[0].amounts).toEqual([
      { unit: 'lb', quantity: 1 },
      { unit: '', quantity: 3 },
    ]);
  });
});
