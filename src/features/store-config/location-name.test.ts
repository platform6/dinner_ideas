import { describe, expect, it } from 'vitest';

import { inferLocationType, parseAisleNumber } from '@/features/store-config/location-name';

describe('inferLocationType', () => {
  it('reads an aisle from a leading "Aisle <n>"', () => {
    expect(inferLocationType('Aisle 7')).toBe('aisle');
    expect(inferLocationType('aisle 12 — baking')).toBe('aisle');
    expect(inferLocationType('  Aisle 3')).toBe('aisle');
  });

  it('defaults to section for everything else', () => {
    expect(inferLocationType('Bakery')).toBe('section');
    expect(inferLocationType('Produce')).toBe('section');
    // A number that is not a leading aisle number must not promote the stop.
    expect(inferLocationType('Back 40 freezer')).toBe('section');
    expect(inferLocationType('The aisle by the door')).toBe('section');
    expect(inferLocationType('')).toBe('section');
  });

  it('matches the rule the cutover migration applied', () => {
    // The five seeded default rows all carried across as sections (bolt 051, step 2).
    for (const name of ['Dairy', 'Grains', 'Pantry', 'Produce', 'Protein']) {
      expect(inferLocationType(name)).toBe('section');
    }
  });
});

describe('parseAisleNumber', () => {
  it('returns the number for the chip', () => {
    expect(parseAisleNumber('Aisle 7')).toBe('7');
    expect(parseAisleNumber('Aisle 12 — baking')).toBe('12');
  });

  it('returns null when the name carries no number, so the row renders a section glyph', () => {
    expect(parseAisleNumber('Bakery')).toBeNull();
    expect(parseAisleNumber('Back 40 freezer')).toBeNull();
  });

  it('agrees with inferLocationType on every input', () => {
    const names = ['Aisle 1', 'Bakery', 'aisle 22', 'Back 40', '', 'Aisle'];
    for (const name of names) {
      const hasNumber = parseAisleNumber(name) !== null;
      expect(inferLocationType(name)).toBe(hasNumber ? 'aisle' : 'section');
    }
  });
});
