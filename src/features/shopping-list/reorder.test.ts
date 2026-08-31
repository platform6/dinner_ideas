import { describe, expect, it } from 'vitest';

import { reorderGroupsByRows } from '@/features/shopping-list/reorder';
import type { ShoppingListGroup } from '@/features/shopping-list/types';
import type { CategoryRowAssignment, GroceryStoreRow } from '@/features/store-config/types';

function row(overrides: Partial<GroceryStoreRow>): GroceryStoreRow {
  return { id: 'row-id', household_id: 'hh-test', name: 'Row', position: 1, ...overrides };
}

function assignment(overrides: Partial<CategoryRowAssignment>): CategoryRowAssignment {
  return { category: 'Category', household_id: 'hh-test', row_id: 'row-id', ...overrides };
}

function group(category: string): ShoppingListGroup {
  return { category, items: [] };
}

describe('reorderGroupsByRows', () => {
  it('sorts groups by their assigned row position', () => {
    const rows = [
      row({ id: 'r1', position: 1 }),
      row({ id: 'r2', position: 2 }),
      row({ id: 'r3', position: 3 }),
    ];
    const assignments = [
      assignment({ category: 'Bakery', row_id: 'r3' }),
      assignment({ category: 'Dairy', row_id: 'r1' }),
      assignment({ category: 'Produce', row_id: 'r2' }),
    ];
    // Input pre-sorted alphabetically, as buildShoppingList produces.
    const groups = [group('Bakery'), group('Dairy'), group('Produce')];

    const result = reorderGroupsByRows(groups, rows, assignments);

    expect(result.map((g) => g.category)).toEqual(['Dairy', 'Produce', 'Bakery']);
  });

  it('falls back to alphabetical order for unassigned categories, placed after configured ones', () => {
    const rows = [row({ id: 'r1', position: 1 })];
    const assignments = [assignment({ category: 'Dairy', row_id: 'r1' })];
    const groups = [group('Bakery'), group('Dairy'), group('Meat')];

    const result = reorderGroupsByRows(groups, rows, assignments);

    expect(result.map((g) => g.category)).toEqual(['Dairy', 'Bakery', 'Meat']);
  });

  it('falls back entirely to the input order when no config exists', () => {
    const groups = [group('Bakery'), group('Dairy'), group('Meat')];

    const result = reorderGroupsByRows(groups, [], []);

    expect(result.map((g) => g.category)).toEqual(['Bakery', 'Dairy', 'Meat']);
  });

  it('treats an assignment pointing at a deleted row as unassigned', () => {
    const rows = [row({ id: 'r1', position: 1 })];
    // "Dairy" points at a row that no longer exists in `rows`.
    const assignments = [assignment({ category: 'Dairy', row_id: 'deleted-row' })];
    const groups = [group('Bakery'), group('Dairy')];

    const result = reorderGroupsByRows(groups, rows, assignments);

    expect(result.map((g) => g.category)).toEqual(['Bakery', 'Dairy']);
  });

  it('does not mutate the input array', () => {
    const groups = [group('Bakery'), group('Dairy')];
    const rows = [row({ id: 'r1', position: 1 })];
    const assignments = [assignment({ category: 'Dairy', row_id: 'r1' })];

    reorderGroupsByRows(groups, rows, assignments);

    expect(groups.map((g) => g.category)).toEqual(['Bakery', 'Dairy']);
  });
});
