import { describe, expect, it } from 'vitest';

import { mergeKey, plainLabel, unitKey } from '@/features/shopping-list/merge-key';

describe('mergeKey (intent 023, FR-1)', () => {
  it('should drop everything from the first comma on', () => {
    expect(mergeKey('chicken thighs, cubed')).toBe(mergeKey('chicken thighs'));
    expect(mergeKey('onion, finely chopped')).toBe('onion');
    expect(mergeKey('carrots, peeled and chopped')).toBe('carrots');
  });

  it('should ignore case and surrounding whitespace, as before', () => {
    expect(mergeKey('  Chicken Thighs ')).toBe('chicken thighs');
    expect(mergeKey('Onion ,diced')).toBe('onion');
  });

  it('should not touch plurals', () => {
    expect(mergeKey('onions')).not.toBe(mergeKey('onion'));
  });

  it('should keep a prep word before the name, which names how the product is sold', () => {
    expect(mergeKey('diced tomatoes')).toBe('diced tomatoes');
    expect(mergeKey('shredded cheese')).toBe('shredded cheese');
  });

  it('should never reduce a name to an empty key', () => {
    expect(mergeKey(', diced')).toBe(', diced');
  });

  it('should keep look-alike groceries apart (NFR-2)', () => {
    // The first two pairs come from the household's own catalog (bolt 080's browser check).
    const pairs: [string, string][] = [
      ['diced tomatoes', 'tomatoes'],
      ['shredded carrots', 'carrots'],
      ['tomato sauce', 'tomato paste'],
      ['chicken broth', 'chicken thighs'],
      ['green onion', 'onion'],
      ['heavy cream', 'sour cream'],
    ];
    for (const [a, b] of pairs) expect(mergeKey(a), `${a} / ${b}`).not.toBe(mergeKey(b));
  });
});

describe('plainLabel (intent 023, FR-3)', () => {
  it('should drop the note after the comma but keep the original capitalization', () => {
    expect(plainLabel('Chicken Thighs, cubed')).toBe('Chicken Thighs');
    expect(plainLabel('Diced Roma Tomatoes')).toBe('Diced Roma Tomatoes');
  });

  it('should collapse runs of whitespace', () => {
    expect(plainLabel('  red   onion , sliced')).toBe('red onion');
  });

  it('should fall back to the trimmed raw name when nothing is left', () => {
    expect(plainLabel('  , Chopped ')).toBe(', Chopped');
  });

  it('should agree with mergeKey, so a label never splits from its key', () => {
    for (const name of ['Chicken Thighs, cubed', 'DICED Onion', ', chopped', 'Green Onion']) {
      expect(plainLabel(name).toLowerCase()).toBe(mergeKey(name));
    }
  });
});

describe('unitKey (intent 023, FR-2)', () => {
  it('should treat a unit and its plural as the same unit', () => {
    expect(unitKey('cups')).toBe(unitKey('cup'));
    expect(unitKey('lbs')).toBe(unitKey('lb'));
    expect(unitKey(' Cans ')).toBe(unitKey('can'));
    expect(unitKey('heads')).toBe(unitKey('head'));
  });

  it('should not convert or equate different units', () => {
    expect(unitKey('tbsp')).not.toBe(unitKey('tsp'));
    expect(unitKey('cup')).not.toBe(unitKey('can'));
    expect(unitKey('each')).not.toBe(unitKey('medium'));
  });

  it('should leave short units and a trailing "ss" alone', () => {
    expect(unitKey('s')).toBe('s');
    expect(unitKey('oz')).toBe('oz');
    expect(unitKey('glass')).toBe('glass');
    expect(unitKey('')).toBe('');
  });
});
