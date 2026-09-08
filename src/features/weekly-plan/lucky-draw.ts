import { daysSinceForSort } from '@/features/dinners/last-chosen';

export interface LuckyCandidate {
  id: string;
  /** ISO date the dinner was last eaten, or null if never. */
  lastChosenDate: string | null;
}

/**
 * How strongly a never-made dinner is favoured, expressed in days.
 *
 * `daysSinceForSort` returns `+Infinity` for a dinner nobody has made. That is the right sort key
 * but a fatal weight: one Infinity in a cumulative sum makes every later comparison meaningless,
 * so the first never-made candidate would win every draw and the rest would be unreachable.
 *
 * Two years is well past any real recency signal — a dinner not eaten in two years and one never
 * eaten at all are equally "due" — so clamping here loses nothing and keeps the arithmetic finite.
 */
const NEVER_MADE_WEIGHT_DAYS = 730;

/**
 * Weight for one candidate: rises with how long ago it was last eaten.
 *
 * The `+ 1` floor matters. A dinner eaten today scores 0 days, and a zero weight would make it
 * *impossible* rather than merely unlikely — which is a filter, not a bias. The requirement is that
 * recent dinners are drawn LESS often, not never.
 */
export function luckyWeight(lastChosenDate: string | null, now: Date = new Date()): number {
  const days = daysSinceForSort(lastChosenDate, now);
  return Math.min(Number.isFinite(days) ? days : NEVER_MADE_WEIGHT_DAYS, NEVER_MADE_WEIGHT_DAYS) + 1;
}

/**
 * Draws `count` distinct dinners, weighted toward the least recently eaten.
 *
 * Pure, and takes its random source as an argument. That is deliberate and load-bearing: the two
 * things this function promises — that it is random, and that it is biased the right way — cannot
 * be asserted about a function that reaches for `Math.random()` itself. `lucky-draw.test.ts`
 * measures the bias across many seeded draws.
 *
 * It stays a DRAW, not a ranking. Weighting shifts the odds; it does not decide the outcome. Two
 * different sources can give different answers on identical input, which is the point — a
 * deterministic "lucky" button is a sorted list wearing a costume.
 *
 * Selection is without replacement: pick by cumulative weight, remove, repeat. O(count x pool)
 * with count <= 7 and a pool in the hundreds; anything cleverer would be harder to reason about
 * for no measurable gain.
 *
 * Returns fewer than `count` when the pool is smaller — the caller reports that it ran out rather
 * than this padding or throwing.
 */
export function drawLucky(
  candidates: readonly LuckyCandidate[],
  count: number,
  random: () => number,
  now: Date = new Date(),
): string[] {
  const pool = candidates.map((c) => ({ id: c.id, weight: luckyWeight(c.lastChosenDate, now) }));
  const drawn: string[] = [];

  while (drawn.length < count && pool.length > 0) {
    const total = pool.reduce((sum, c) => sum + c.weight, 0);
    let threshold = random() * total;

    // Default to the last entry: with floating-point sums, `random()` returning a value very close
    // to 1 can leave `threshold` fractionally above the running total, and no index would match.
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      threshold -= pool[i].weight;
      if (threshold <= 0) {
        index = i;
        break;
      }
    }

    drawn.push(pool[index].id);
    pool.splice(index, 1);
  }

  return drawn;
}
