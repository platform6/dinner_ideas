import { describe, expect, it } from 'vitest';

import {
  findSimilarPlacedItems,
  normalizeItemName,
  SIMILARITY_TUNING,
  type SimilarityCandidate,
} from '@/features/store-config/similarity';

function candidate(
  itemId: string,
  name: string,
  overrides: Partial<SimilarityCandidate> = {},
): SimilarityCandidate {
  return {
    itemId,
    name,
    category: null,
    locationId: `loc-${itemId}`,
    locationName: `Aisle ${itemId}`,
    ...overrides,
  };
}

describe('normalizeItemName', () => {
  it('lowercases, strips punctuation, and splits on whitespace', () => {
    expect(normalizeItemName('Beans, Black (Low-Sodium)')).toContain('bean');
    expect(normalizeItemName('TAHINI')).toEqual(['tahini']);
  });

  it('drops stopwords that describe without identifying', () => {
    expect(normalizeItemName('organic fresh whole milk')).toEqual(['milk']);
    expect(normalizeItemName('extra virgin olive oil')).toEqual(['olive', 'oil']);
  });

  it('crudely singularizes', () => {
    expect(normalizeItemName('black beans')).toEqual(['black', 'bean']);
    expect(normalizeItemName('berries')).toEqual(['berry']);
    expect(normalizeItemName('tomatoes')).toEqual(['tomato']);
  });

  it('refuses to mangle short words or -ss endings into collisions', () => {
    // "molasses" must not become "molasse"; "gas"/"oats" must survive intact enough to differ.
    expect(normalizeItemName('molasses')).toEqual(['molasses']);
    expect(normalizeItemName('couscous')).toEqual(['couscous']);
  });

  it('returns an empty list when a name is entirely stopwords', () => {
    expect(normalizeItemName('organic fresh')).toEqual([]);
  });
});

describe('findSimilarPlacedItems', () => {
  it('matches an item against a near-identical placed one', () => {
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'black beans', category: null }, [
      candidate('a', 'Black Beans'),
      candidate('b', 'Tahini'),
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].itemId).toBe('a');
    expect(suggestions[0].locationName).toBe('Aisle a');
  });

  it('excludes an item from its own candidate list', () => {
    const suggestions = findSimilarPlacedItems({ itemId: 'a', name: 'Tahini', category: null }, [
      candidate('a', 'Tahini'),
    ]);

    expect(suggestions).toEqual([]);
  });

  it('returns nothing when no item has an explicit placement yet', () => {
    expect(findSimilarPlacedItems({ itemId: 'q', name: 'anything', category: null }, [])).toEqual([]);
  });

  it('returns nothing when the query name is entirely stopwords', () => {
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'organic fresh', category: null }, [
      candidate('a', 'organic fresh'),
    ]);

    expect(suggestions).toEqual([]);
  });

  it('excludes a pairing the user already dismissed', () => {
    const query = { itemId: 'q', name: 'black beans', category: null };
    const candidates = [candidate('a', 'Black Beans')];

    expect(findSimilarPlacedItems(query, candidates)).toHaveLength(1);
    expect(findSimilarPlacedItems(query, candidates, new Set(['a']))).toEqual([]);
  });

  it('returns at most maxCandidates', () => {
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'tahini', category: null }, [
      candidate('a', 'Tahini'),
      candidate('b', 'tahini'),
      candidate('c', 'TAHINI'),
      candidate('d', 'Tahini'),
    ]);

    expect(suggestions).toHaveLength(SIMILARITY_TUNING.maxCandidates);
  });

  it('weights a rare shared token above a common one', () => {
    // Two single-token candidates, symmetric in every way except how common their token is in
    // this store: "tahini" appears once, "beans" appears in most rows. The query shares exactly
    // one token with each, so only the weighting separates them — and only the rare one should
    // clear the cutoff. This is what stops a shared head noun from carrying a match.
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'tahini beans', category: null }, [
      candidate('rare', 'tahini'),
      candidate('common', 'beans'),
      candidate('c1', 'green beans'),
      candidate('c2', 'pinto beans'),
      candidate('c3', 'kidney beans'),
    ]);

    expect(suggestions.map((suggestion) => suggestion.itemId)).toContain('rare');
    expect(suggestions.map((suggestion) => suggestion.itemId)).not.toContain('common');
  });

  it('lets a shared category refine a real match but never create one', () => {
    // Same category, nothing else in common — must stay below the cutoff.
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'tahini', category: 'Pantry' }, [
      candidate('a', 'ketchup', { category: 'Pantry' }),
    ]);

    expect(suggestions).toEqual([]);
    expect(SIMILARITY_TUNING.categoryBonus).toBeLessThan(SIMILARITY_TUNING.scoreCutoff);
  });
});

/**
 * The families `storeconfig.md` names explicitly. The bar is PRECISION: returning nothing for an
 * ambiguous pair is acceptable, returning a confident wrong answer is not — a wrong suggestion
 * that gets accepted puts an item in the wrong aisle silently.
 */
describe('findSimilarPlacedItems — false-friend families', () => {
  const falseFriends: ReadonlyArray<[string, string, string]> = [
    ['beans', 'green beans', 'black beans'],
    ['cream', 'heavy cream', 'sour cream'],
    ['cream', 'ice cream', 'cream of tartar'],
    ['milk', 'whole milk', 'coconut milk'],
    ['milk', 'oat milk', 'evaporated milk'],
    ['oil', 'olive oil', 'sesame oil'],
    ['sauce', 'soy sauce', 'hot sauce'],
    ['chips', 'tortilla chips', 'chocolate chips'],
  ];

  it.each(falseFriends)(
    'does not confidently match across the %s family (%s vs %s)',
    (_family, queryName, candidateName) => {
      // A realistic store: several members of the family are already placed, which is exactly
      // when the shared head noun becomes weak evidence.
      const candidates = [
        candidate('x', candidateName),
        candidate('y', 'green beans'),
        candidate('z', 'heavy cream'),
        candidate('w', 'whole milk'),
        candidate('v', 'olive oil'),
        candidate('u', 'soy sauce'),
        candidate('t', 'tortilla chips'),
      ].filter((entry) => entry.name.toLowerCase() !== queryName.toLowerCase());

      const suggestions = findSimilarPlacedItems(
        { itemId: 'q', name: queryName, category: null },
        candidates,
      );

      expect(suggestions.map((suggestion) => suggestion.name)).not.toContain(candidateName);
    },
  );

  it('still matches a true restatement of the same ingredient', () => {
    // Precision must not cost us the easy win the feature exists for.
    const suggestions = findSimilarPlacedItems({ itemId: 'q', name: 'Organic Black Beans', category: null }, [
      candidate('a', 'black beans'),
      candidate('b', 'olive oil'),
      candidate('c', 'soy sauce'),
    ]);

    expect(suggestions[0]?.name).toBe('black beans');
  });
});
