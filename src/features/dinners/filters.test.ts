import { describe, expect, it } from 'vitest';

import { applyFilters } from '@/features/dinners/filters';
import type { CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import type { DinnerWithIngredients } from '@/features/dinners/types';

const noFilters: CatalogFilterState = { cuisine: null, rosieApprovedOnly: false, sortByCookTime: false };

function dinner(overrides: Partial<DinnerWithIngredients>): DinnerWithIngredients {
  return {
    id: 'id',
    name: 'Dinner',
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    rosie_approved: false,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [],
    ...overrides,
  };
}

describe('applyFilters', () => {
  const dinners: DinnerWithIngredients[] = [
    dinner({ id: '1', name: 'Tacos', cuisine_type: 'Mexican', cook_time_minutes: 25, rosie_approved: true }),
    dinner({ id: '2', name: 'Pasta', cuisine_type: 'Italian', cook_time_minutes: 40, rosie_approved: false }),
    dinner({ id: '3', name: 'Curry', cuisine_type: 'Indian', cook_time_minutes: 15, rosie_approved: true }),
  ];

  it('returns all dinners when no filters are set', () => {
    expect(applyFilters(dinners, noFilters)).toHaveLength(3);
  });

  it('filters by cuisine', () => {
    const result = applyFilters(dinners, { ...noFilters, cuisine: 'Mexican' });
    expect(result.map((d) => d.id)).toEqual(['1']);
  });

  it('filters by Rosie-approved only', () => {
    const result = applyFilters(dinners, { ...noFilters, rosieApprovedOnly: true });
    expect(result.map((d) => d.id).sort()).toEqual(['1', '3']);
  });

  it('sorts by cook time ascending without mutating the input array', () => {
    const result = applyFilters(dinners, { ...noFilters, sortByCookTime: true });
    expect(result.map((d) => d.id)).toEqual(['3', '1', '2']);
    expect(dinners.map((d) => d.id)).toEqual(['1', '2', '3']);
  });

  it('combines cuisine + Rosie-approved + sort', () => {
    const combined: DinnerWithIngredients[] = [
      ...dinners,
      dinner({ id: '4', name: 'Enchiladas', cuisine_type: 'Mexican', cook_time_minutes: 10, rosie_approved: true }),
    ];
    const result = applyFilters(combined, { cuisine: 'Mexican', rosieApprovedOnly: true, sortByCookTime: true });
    expect(result.map((d) => d.id)).toEqual(['4', '1']);
  });

  it('returns an empty list when no dinner matches the filters', () => {
    const result = applyFilters(dinners, { ...noFilters, cuisine: 'Thai' });
    expect(result).toEqual([]);
  });

  it('defaults to least-recently-made first, never-made leading, when cook-time sort is off', () => {
    const lastChosenDates = new Map<string, string | null>([
      ['1', '2026-08-20T00:00:00Z'], // Tacos: made recently
      ['2', null], // Pasta: never made
      ['3', '2026-01-01T00:00:00Z'], // Curry: made long ago
    ]);

    const result = applyFilters(dinners, noFilters, lastChosenDates);
    expect(result.map((d) => d.id)).toEqual(['2', '3', '1']);
  });

  it('ties on "never made" fall back to alphabetical order', () => {
    const result = applyFilters(dinners, noFilters, new Map());
    expect(result.map((d) => d.name)).toEqual(['Curry', 'Pasta', 'Tacos']);
  });

  it('cook-time sort still takes priority over variety when both could apply', () => {
    const lastChosenDates = new Map<string, string | null>([
      ['1', '2020-01-01T00:00:00Z'],
      ['2', null],
      ['3', null],
    ]);

    const result = applyFilters(dinners, { ...noFilters, sortByCookTime: true }, lastChosenDates);
    expect(result.map((d) => d.id)).toEqual(['3', '1', '2']);
  });
});
