import { describe, expect, it } from 'vitest';

import { drawLucky, luckyWeight, type LuckyCandidate } from '@/features/weekly-plan/lucky-draw';

const NOW = new Date('2026-09-08T00:00:00Z');

/** Days before NOW, as an ISO date. */
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** A deterministic source, so a draw can be reproduced exactly. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('luckyWeight', () => {
  it('rises with how long ago the dinner was eaten', () => {
    expect(luckyWeight(daysAgo(30), NOW)).toBeGreaterThan(luckyWeight(daysAgo(3), NOW));
  });

  it('never returns zero, so a dinner eaten today is unlikely rather than impossible', () => {
    // A zero weight would be a filter, not a bias. The requirement is "drawn less often", not
    // "never drawn".
    expect(luckyWeight(daysAgo(0), NOW)).toBeGreaterThan(0);
  });

  it('gives a never-made dinner a FINITE weight, not Infinity', () => {
    // daysSinceForSort returns +Infinity for never-made — correct as a sort key, fatal as a
    // weight: one Infinity in a cumulative sum makes every later comparison meaningless and the
    // first never-made candidate would win every draw.
    const weight = luckyWeight(null, NOW);
    expect(Number.isFinite(weight)).toBe(true);
    expect(weight).toBeGreaterThanOrEqual(luckyWeight(daysAgo(365), NOW));
  });
});

describe('drawLucky', () => {
  const pool: LuckyCandidate[] = [
    { id: 'fresh', lastChosenDate: daysAgo(1) },
    { id: 'stale', lastChosenDate: daysAgo(400) },
    { id: 'never', lastChosenDate: null },
    { id: 'mid', lastChosenDate: daysAgo(60) },
  ];

  it('returns the requested number of distinct ids', () => {
    const drawn = drawLucky(pool, 3, seeded(1), NOW);
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn).size).toBe(3);
  });

  it('returns what it can when the pool is smaller than the request', () => {
    const drawn = drawLucky(pool.slice(0, 2), 5, seeded(1), NOW);
    expect(drawn).toHaveLength(2);
  });

  it('returns nothing from an empty pool', () => {
    expect(drawLucky([], 3, seeded(1), NOW)).toEqual([]);
  });

  /**
   * The first of the feature's two promises, MEASURED rather than asserted. A single draw proves
   * nothing about a weighted distribution, so this runs many and compares frequencies.
   */
  it('draws a long-ago dinner more often than a recent one', () => {
    const two: LuckyCandidate[] = [
      { id: 'fresh', lastChosenDate: daysAgo(1) },
      { id: 'stale', lastChosenDate: daysAgo(400) },
    ];
    const random = seeded(42);
    let staleFirst = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i += 1) {
      if (drawLucky(two, 1, random, NOW)[0] === 'stale') staleFirst += 1;
    }
    // Weights are ~2 and ~401, so stale should win the vast majority. The bound is loose enough
    // not to flake and tight enough that an unweighted draw (~50%) fails it.
    expect(staleFirst / runs).toBeGreaterThan(0.9);
  });

  it('still picks the recent one sometimes — a bias, not a filter', () => {
    const two: LuckyCandidate[] = [
      { id: 'fresh', lastChosenDate: daysAgo(0) },
      { id: 'stale', lastChosenDate: daysAgo(10) },
    ];
    const random = seeded(7);
    let freshSeen = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (drawLucky(two, 1, random, NOW)[0] === 'fresh') freshSeen += 1;
    }
    expect(freshSeen).toBeGreaterThan(0);
  });

  it('treats a never-made dinner as fully eligible, not as an automatic winner', () => {
    const two: LuckyCandidate[] = [
      { id: 'never', lastChosenDate: null },
      { id: 'stale', lastChosenDate: daysAgo(700) },
    ];
    const random = seeded(99);
    let staleSeen = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (drawLucky(two, 1, random, NOW)[0] === 'stale') staleSeen += 1;
    }
    // If never-made carried Infinity, 'stale' would never be drawn at all.
    expect(staleSeen).toBeGreaterThan(0);
  });

  /**
   * The second promise. Weighting shifts the odds; it must not decide the outcome. A deterministic
   * "lucky" button is a sorted list wearing a costume.
   */
  it('is a draw, not a ranking — different sources give different results', () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      results.add(drawLucky(pool, 2, seeded(seed), NOW).join(','));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('is reproducible for a given source, so a failure can be investigated', () => {
    expect(drawLucky(pool, 3, seeded(5), NOW)).toEqual(drawLucky(pool, 3, seeded(5), NOW));
  });
});
