import { describe, expect, it } from 'vitest';

import { applyFilters } from '@/features/dinners/filters';
import type { CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import type { CatalogDinner } from '@/features/dinners/types';

const noFilters: CatalogFilterState = { cuisine: null, tags: [], sortByCookTime: false };

function dinner(overrides: Partial<CatalogDinner>): CatalogDinner {
  return {
    id: 'id',
    name: 'Dinner',
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [],
    tags: [],
    ...overrides,
  };
}

describe('applyFilters', () => {
  const dinners: CatalogDinner[] = [
    dinner({
      id: '1',
      name: 'Tacos',
      cuisine_type: 'Mexican',
      cook_time_minutes: 25,
      tags: ['kid-friendly'],
    }),
    dinner({ id: '2', name: 'Pasta', cuisine_type: 'Italian', cook_time_minutes: 40, tags: [] }),
    dinner({
      id: '3',
      name: 'Curry',
      cuisine_type: 'Indian',
      cook_time_minutes: 15,
      tags: ['kid-friendly', 'spicy'],
    }),
  ];

  it('returns all dinners when no filters are set', () => {
    expect(applyFilters(dinners, noFilters)).toHaveLength(3);
  });

  it('filters by cuisine', () => {
    const result = applyFilters(dinners, { ...noFilters, cuisine: 'Mexican' });
    expect(result.map((d) => d.id)).toEqual(['1']);
  });

  it('filters by a single tag', () => {
    const result = applyFilters(dinners, { ...noFilters, tags: ['spicy'] });
    expect(result.map((d) => d.id)).toEqual(['3']);
  });

  it('matches a dinner with ANY of the selected tags (OR, not AND)', () => {
    const result = applyFilters(dinners, { ...noFilters, tags: ['kid-friendly', 'spicy'] });
    expect(result.map((d) => d.id).sort()).toEqual(['1', '3']);
  });

  it('sorts by cook time ascending without mutating the input array', () => {
    const result = applyFilters(dinners, { ...noFilters, sortByCookTime: true });
    expect(result.map((d) => d.id)).toEqual(['3', '1', '2']);
    expect(dinners.map((d) => d.id)).toEqual(['1', '2', '3']);
  });

  it('combines cuisine + tag + sort', () => {
    const combined: CatalogDinner[] = [
      ...dinners,
      dinner({
        id: '4',
        name: 'Enchiladas',
        cuisine_type: 'Mexican',
        cook_time_minutes: 10,
        tags: ['kid-friendly'],
      }),
    ];
    const result = applyFilters(combined, {
      cuisine: 'Mexican',
      tags: ['kid-friendly'],
      sortByCookTime: true,
    });
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
