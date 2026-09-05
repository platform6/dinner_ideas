import { describe, expect, it } from 'vitest';

import { reorderGroupsByLocation } from '@/features/shopping-list/reorder';
import type { ShoppingListGroup } from '@/features/shopping-list/types';
import type { ResolvedItem } from '@/features/store-config/types';

function group(category: string, ...names: string[]): ShoppingListGroup {
  return {
    category,
    items: names.map((name) => ({ name, unit: 'ea', quantity: 1, category })),
  };
}

function resolved(name: string, locationPosition: number | null, category = 'Pantry'): ResolvedItem {
  return {
    itemId: `id-${name}`,
    itemName: name,
    nameKey: name.trim().toLowerCase(),
    category,
    state: locationPosition === null ? 'unassigned' : 'inherited',
    locationId: locationPosition === null ? null : `loc-${locationPosition}`,
    locationName: locationPosition === null ? null : `Stop ${locationPosition}`,
    locationPosition,
    viaCategory: locationPosition === null ? null : category,
  };
}

const categoriesOf = (groups: ShoppingListGroup[]) => groups.map((entry) => entry.category);

describe('reorderGroupsByLocation', () => {
  it('orders groups by their resolved position on the walking path', () => {
    // Alphabetical input, deliberately non-alphabetical path.
    const groups = [group('Dairy', 'cheddar'), group('Grains', 'sourdough'), group('Produce', 'kale')];
    const items = [resolved('cheddar', 3), resolved('sourdough', 1), resolved('kale', 2)];

    expect(categoriesOf(reorderGroupsByLocation(groups, items))).toEqual(['Grains', 'Produce', 'Dairy']);
  });

  it('keeps ingredients that resolve to the same stop in one group, and that group in one place', () => {
    const groups = [group('Dairy', 'cheddar', 'butter'), group('Produce', 'kale')];
    const items = [resolved('cheddar', 1), resolved('butter', 1), resolved('kale', 2)];

    const ordered = reorderGroupsByLocation(groups, items);
    expect(categoriesOf(ordered)).toEqual(['Dairy', 'Produce']);
    expect(ordered[0].items.map((item) => item.name)).toEqual(['cheddar', 'butter']);
  });

  it('sorts a group with no resolved location after every located group', () => {
    const groups = [group('Dairy', 'cheddar'), group('Pantry', 'saffron'), group('Produce', 'kale')];
    const items = [resolved('cheddar', 2), resolved('kale', 1), resolved('saffron', null)];

    expect(categoriesOf(reorderGroupsByLocation(groups, items))).toEqual(['Produce', 'Dairy', 'Pantry']);
  });

  it('keeps unlocated groups in alphabetical order among themselves', () => {
    // buildShoppingList emits alphabetically and Array.sort is stable, so no tie-breaker needed.
    const groups = [group('Dairy', 'cheddar'), group('Grains', 'farro'), group('Pantry', 'saffron')];

    expect(categoriesOf(reorderGroupsByLocation(groups, []))).toEqual(['Dairy', 'Grains', 'Pantry']);
  });

  it('treats an ingredient with no registry entry as unassigned rather than crashing', () => {
    const groups = [group('Pantry', 'mystery powder'), group('Produce', 'kale')];
    const items = [resolved('kale', 1)];

    expect(categoriesOf(reorderGroupsByLocation(groups, items))).toEqual(['Produce', 'Pantry']);
  });

  it('matches on the registry’s normalized name key, not the display name', () => {
    // The client normalizes with trim().toLowerCase(); the database generates lower(btrim(name)).
    // If those ever drift apart, nothing matches and every group silently falls back to
    // alphabetical — so assert the mismatch case explicitly.
    const groups = [group('Dairy', '  CHEDDAR  '), group('Produce', 'Kale')];
    const items = [resolved('cheddar', 1), resolved('kale', 2)];

    expect(categoriesOf(reorderGroupsByLocation(groups, items))).toEqual(['Dairy', 'Produce']);
  });

  it('sorts a group to the earliest stop any of its items resolve to', () => {
    // One explicitly placed ingredient sits earlier than the rest of its category. The group
    // follows it — you encounter something from that group at that point on the path.
    const groups = [group('Pantry', 'black beans', 'tahini'), group('Produce', 'kale')];
    const items = [
      resolved('black beans', 1), // explicitly placed early
      resolved('tahini', 5), // inherited, later
      resolved('kale', 2),
    ];

    expect(categoriesOf(reorderGroupsByLocation(groups, items))).toEqual(['Pantry', 'Produce']);
  });
});

/**
 * The concrete proof for unit 1's FR-10 "no regression" promise, at the presentation level.
 * (The data level is proved by migration `20260904190000`'s own in-transaction gate.)
 *
 * `legacyOrder` is a faithful transcription of the retired `reorderGroupsByRows`, kept here as a
 * reference implementation rather than as dead production code — so the test states the old rule
 * and the new one side by side and asserts they agree.
 */
describe('cutover equivalence: the old model and the new produce the same order', () => {
  interface LegacyRow {
    id: string;
    position: number;
  }
  interface LegacyAssignment {
    category: string;
    row_id: string;
  }

  function legacyOrder(
    groups: ShoppingListGroup[],
    rows: LegacyRow[],
    assignments: LegacyAssignment[],
  ): ShoppingListGroup[] {
    const rowPositionById = new Map(rows.map((row) => [row.id, row.position]));
    const positionByCategory = new Map<string, number>();
    for (const assignment of assignments) {
      const position = rowPositionById.get(assignment.row_id);
      if (position !== undefined) positionByCategory.set(assignment.category, position);
    }

    return [...groups].sort((a, b) => {
      const posA = positionByCategory.get(a.category);
      const posB = positionByCategory.get(b.category);
      if (posA !== undefined && posB !== undefined) return posA - posB;
      if (posA !== undefined) return -1;
      if (posB !== undefined) return 1;
      return 0;
    });
  }

  // A configured household whose walking order is deliberately NOT alphabetical — otherwise a
  // sort that did nothing at all would pass this test.
  const rows: LegacyRow[] = [
    { id: 'row-bakery', position: 1 },
    { id: 'row-produce', position: 2 },
    { id: 'row-aisle3', position: 3 },
    { id: 'row-dairy', position: 4 },
  ];
  const assignments: LegacyAssignment[] = [
    { category: 'Grains', row_id: 'row-bakery' },
    { category: 'Produce', row_id: 'row-produce' },
    { category: 'Pantry', row_id: 'row-aisle3' },
    { category: 'Dairy', row_id: 'row-dairy' },
  ];

  // The same household after the cutover: rows became locations at the same positions, and
  // assignments became category placements. No explicit item placements exist — the cutover
  // creates none — so every item inherits its category's position.
  const positionByCategory: Record<string, number> = { Grains: 1, Produce: 2, Pantry: 3, Dairy: 4 };

  const groups = [
    group('Dairy', 'cheddar', 'butter'),
    group('Grains', 'sourdough'),
    group('Pantry', 'black beans', 'tahini'),
    group('Produce', 'kale', 'apples'),
  ];

  const resolvedItems = groups.flatMap((entry) =>
    entry.items.map((item) => resolved(item.name, positionByCategory[entry.category], entry.category)),
  );

  it('produces an identical group order', () => {
    const before = categoriesOf(legacyOrder(groups, rows, assignments));
    const after = categoriesOf(reorderGroupsByLocation(groups, resolvedItems));

    expect(after).toEqual(before);
  });

  it('produces the household’s actual walking order, not alphabetical', () => {
    // Guards the guard: if this were alphabetical, the equivalence assertion above would be
    // vacuous — both sides could be "unsorted" and still agree.
    const after = categoriesOf(reorderGroupsByLocation(groups, resolvedItems));

    expect(after).toEqual(['Grains', 'Produce', 'Pantry', 'Dairy']);
    expect(after).not.toEqual(['Dairy', 'Grains', 'Pantry', 'Produce']);
  });

  it('still agrees when a category has no spot on the path', () => {
    const partialAssignments = assignments.filter((entry) => entry.category !== 'Pantry');
    const partialResolved = groups.flatMap((entry) =>
      entry.items.map((item) =>
        resolved(
          item.name,
          entry.category === 'Pantry' ? null : positionByCategory[entry.category],
          entry.category,
        ),
      ),
    );

    const before = categoriesOf(legacyOrder(groups, rows, partialAssignments));
    const after = categoriesOf(reorderGroupsByLocation(groups, partialResolved));

    expect(after).toEqual(before);
    expect(after.at(-1)).toBe('Pantry');
  });
});
