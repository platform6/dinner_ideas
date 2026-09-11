import { describe, expect, it } from 'vitest';

import { createIngredientLine, createStep, type RecipeDraft } from '@/features/recipe-entry/draft';
import { readYield, roundForKitchen, scaleDraft } from '@/features/recipe-entry/scale';

function draftWith(quantities: string[]): RecipeDraft {
  return {
    name: 'Salted Chocolate Toffee Pretzel Bark',
    cuisineType: 'American',
    cookTimeMinutes: '18',
    summary: 'Line tray; boil toffee; pour; bake; chocolate; salt; chill.',
    ingredients: quantities.map((quantity, i) => ({
      ...createIngredientLine(),
      quantity,
      unit: 'cup',
      name: `ingredient ${i}`,
    })),
    steps: [{ ...createStep(), instruction: 'Bake.' }],
    tagNames: [],
  };
}

describe('readYield — what a page yield means as a number', () => {
  it.each([
    ['4', 4],
    ['Serves 4', 4],
    ['4 servings', 4],
    ['serves 6 people', 6],
    ['  8  ', 8],
  ])('reads %j as a single count of %i', (statedYield, servings) => {
    expect(readYield(statedYield)).toEqual({ kind: 'single', servings });
  });

  it.each([
    ['8–10', 8, 10],
    ['8-10', 8, 10],
    ['8—10', 8, 10],
    ['8 to 10', 8, 10],
    ['Serves 8-10', 8, 10],
    ['8–10 servings', 8, 10],
  ])('reads %j as a RANGE, never collapsed to one number', (statedYield, low, high) => {
    // Intent 018 Checkpoint 2: a range has no correct single reading; the user supplies the base.
    expect(readYield(statedYield)).toEqual({ kind: 'range', low, high });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a count of pieces', 'Makes 24 cookies'],
    ['a count of muffins', '12 muffins'],
    ['a loaf', '1 loaf'],
    ['a dozen', '2 dozen'],
    ['a vague amount', 'a crowd'],
    ['zero', '0'],
    ['a backwards range', '10-8'],
    ['an equal range', '4-4'],
  ])('reads %s as UNKNOWN — a wrong base gives wrong quantities that look right', (_label, statedYield) => {
    expect(readYield(statedYield)).toEqual({ kind: 'unknown' });
  });
});

describe('roundForKitchen — the rounding rule, written down', () => {
  // One table so the rule has exactly one place to change and one test to fail. See the bolt 070
  // implementation plan §5 for why each band is what it is.
  it.each([
    // ≥ 10 → nearest whole (grams, millilitres, counts)
    [206.25, 206],
    [170.6, 171],
    [10, 10],
    [10.5, 11],
    // 1 to < 10 → nearest ¼ (tablespoons, cups, pounds)
    [2.67, 2.75],
    [1.5, 1.5],
    [1.1, 1],
    [9.9, 10],
    [3.333, 3.25],
    // < 1 → nearest ⅛
    [0.333, 0.375],
    [0.28, 0.25],
    [0.667, 0.625],
    [0.5, 0.5],
    // would round to 0 → ⅛, the floor: an ingredient must never vanish (quantity > 0 in the db)
    [0.04, 0.125],
    [0.001, 0.125],
  ])('rounds %f to %f', (input, expected) => {
    expect(roundForKitchen(input)).toBe(expected);
  });
});

describe('scaleDraft', () => {
  it('multiplies every quantity by to ÷ from, rounded for the kitchen', () => {
    // The bark: 1 cup butter from a page serving 9 → a household of 3 is ⅓ cup, which rounds to
    // the nearest ⅛ — 0.375 — rather than the unmeasurable 0.333… a model produced as "0.33".
    const scaled = scaleDraft(draftWith(['1', '0.5', '2']), 9, 3);

    expect(scaled.ingredients.map((line) => line.quantity)).toEqual(['0.375', '0.125', '0.625']);
  });

  it('scales UP as well as down', () => {
    const scaled = scaleDraft(draftWith(['1', '0.5']), 2, 5);

    expect(scaled.ingredients.map((line) => line.quantity)).toEqual(['2.5', '1.25']);
  });

  it('is NON-DESTRUCTIVE — the input draft is untouched, so the review can undo (FR-3)', () => {
    const original = draftWith(['1', '0.5']);
    const before = JSON.stringify(original);

    scaleDraft(original, 4, 2);

    expect(JSON.stringify(original)).toBe(before);
  });

  it('returns quantities UNCHANGED at identity — no rounding on a scale that changed nothing', () => {
    // Without this, scaling 4 → 4 would quietly turn a page's "0.33" into "0.375".
    const scaled = scaleDraft(draftWith(['0.33', '1.1', '206.25']), 4, 4);

    expect(scaled.ingredients.map((line) => line.quantity)).toEqual(['0.33', '1.1', '206.25']);
  });

  it('leaves a quantity that is not a positive number exactly as it is', () => {
    // The user may have edited a line before scaling. There is nothing to multiply, and the form's
    // own validation will say so on save.
    const scaled = scaleDraft(draftWith(['', 'a pinch', '-1', '2']), 2, 4);

    expect(scaled.ingredients.map((line) => line.quantity)).toEqual(['', 'a pinch', '-1', '4']);
  });

  it('keeps each line’s id, unit, name and category — only the quantity moves', () => {
    const original = draftWith(['1']);
    const [before] = original.ingredients;
    const [after] = scaleDraft(original, 2, 4).ingredients;

    expect(after).toEqual({ ...before, quantity: '2' });
  });

  it('does not touch the steps, tags or any other field', () => {
    const original = draftWith(['1']);
    const scaled = scaleDraft(original, 2, 4);

    expect({ ...scaled, ingredients: [] }).toEqual({ ...original, ingredients: [] });
  });

  it.each([
    ['a zero base', 0, 3],
    ['a negative target', 3, -1],
    ['a fractional base', 2.5, 3],
    ['NaN', Number.NaN, 3],
  ])('refuses %s — that is a programming error, not a user one', (_label, from, to) => {
    expect(() => scaleDraft(draftWith(['1']), from, to)).toThrow(RangeError);
  });
});
