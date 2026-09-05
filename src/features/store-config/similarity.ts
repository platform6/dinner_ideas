/**
 * Similarity suggestions for placing an ingredient (FR-7, story 001).
 *
 * Pure functions — no network, no SQL. Operates on data the page has already fetched
 * (household-scale: dozens of items), so this stays client-side per intent 010's Resolved
 * Decision #5.
 *
 * Tuned for PRECISION, not recall. A missed suggestion costs the user a two-tap manual pick.
 * A confident wrong suggestion that gets accepted puts an item in the wrong aisle silently and
 * costs trust in the whole feature. When in doubt, return nothing.
 */

/**
 * Every tuning knob in one place, per story 001's "kept in one editable constant".
 * Raise `scoreCutoff` to suggest less often; lower it to suggest more.
 */
export const SIMILARITY_TUNING = {
  /** Most candidates ever returned. The UI shows them with equal weight — no exposed ranking. */
  maxCandidates: 3,
  /**
   * Minimum score to be offered at all. Set against the false-friend families
   * (beans / cream / milk / oil / sauce / chips): a single shared common head noun must NOT
   * clear this on its own.
   */
  scoreCutoff: 0.5,
  /**
   * Added when the two items share a grocery category. Deliberately far below `scoreCutoff`
   * so it can never carry a match by itself — it only breaks ties between real token matches.
   */
  categoryBonus: 0.08,
  /**
   * Dropped before comparison: words that describe a product without identifying it. Two items
   * sharing only these are not similar.
   */
  stopwords: new Set([
    'organic',
    'fresh',
    'frozen',
    'canned',
    'jarred',
    'dried',
    'raw',
    'whole',
    'low',
    'fat',
    'reduced',
    'free',
    'lite',
    'light',
    'unsalted',
    'salted',
    'sweetened',
    'unsweetened',
    'plain',
    'large',
    'small',
    'medium',
    'boneless',
    'skinless',
    'chopped',
    'sliced',
    'shredded',
    'ground',
    'crushed',
    'grated',
    'minced',
    'drained',
    'rinsed',
    'extra',
    'virgin',
    'pure',
    'natural',
    'of',
    'and',
    'the',
    'a',
    'in',
    'with',
  ]),
} as const;

export interface SimilarityQuery {
  itemId: string;
  name: string;
  /** The item's grocery category, if known. Used only for the tie-breaking bonus. */
  category: string | null;
}

/** An item that already has an EXPLICIT placement — inherited placements are never evidence. */
export interface SimilarityCandidate {
  itemId: string;
  name: string;
  category: string | null;
  locationId: string;
  locationName: string;
}

export interface SimilaritySuggestion {
  itemId: string;
  name: string;
  locationId: string;
  locationName: string;
  /** Exposed for tests and tuning; the UI does not rank or display it. */
  score: number;
}

/**
 * Food words that end in -s without being plurals. Small and deliberately food-specific: the
 * generic rules below cannot tell "molasses" from "glasses", so the exceptions are listed
 * rather than guessed at.
 */
const INVARIANT_TOKENS = new Set([
  'molasses',
  'couscous',
  'hummus',
  'asparagus',
  'watercress',
  'oats',
  'greens',
  'grits',
  'anise',
]);

/**
 * Crude singularization — enough to unify "beans"/"bean" and "berries"/"berry" without a
 * stemmer. Deliberately conservative: it is better to miss a match than to mangle a word into
 * a collision ("molasses" must not become "molass").
 */
function singularize(token: string): string {
  if (token.length <= 3) return token;
  if (INVARIANT_TOKENS.has(token)) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.endsWith('oes')) return token.slice(0, -2); // tomatoes -> tomato
  if (/(?:ch|sh|x|z)es$/.test(token)) return token.slice(0, -2); // peaches, dishes, boxes
  if (token.endsWith('sses')) return token.slice(0, -2); // glasses -> glass
  if (token.endsWith('ss')) return token;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

/**
 * Lowercase, strip punctuation, singularize, drop stopwords.
 * Exported for its own tests — the normalization is where most false friends are created.
 */
export function normalizeItemName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .filter((token) => !SIMILARITY_TUNING.stopwords.has(token));
}

/**
 * Inverse document frequency across the candidate set: a token shared by many placed items
 * ("beans") is weak evidence; a token shared by few ("tahini") is strong. This is what stops
 * the false-friend families from matching on their common head noun alone.
 */
function buildTokenWeights(documents: string[][]): Map<string, number> {
  const total = documents.length;
  const documentFrequency = new Map<string, number>();

  for (const tokens of documents) {
    for (const token of new Set(tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [token, frequency] of documentFrequency) {
    weights.set(token, Math.log((total + 1) / (frequency + 1)) + 1);
  }
  return weights;
}

/**
 * Finds up to `maxCandidates` already-placed items resembling `query`.
 *
 * @param query the item being placed
 * @param candidates items with an explicit placement in the active store
 * @param dismissedItemIds `suggested_item_id`s the user already rejected for this query item
 * @returns suggestions above the cutoff, best first; an empty array when nothing is confident
 *          enough (an entirely normal outcome — never force a suggestion)
 */
export function findSimilarPlacedItems(
  query: SimilarityQuery,
  candidates: SimilarityCandidate[],
  dismissedItemIds: ReadonlySet<string> = new Set(),
): SimilaritySuggestion[] {
  const queryTokens = normalizeItemName(query.name);
  if (queryTokens.length === 0) return [];

  const eligible = candidates.filter(
    (candidate) => candidate.itemId !== query.itemId && !dismissedItemIds.has(candidate.itemId),
  );
  if (eligible.length === 0) return [];

  const tokenized = eligible.map((candidate) => ({
    candidate,
    tokens: normalizeItemName(candidate.name),
  }));

  const weights = buildTokenWeights([queryTokens, ...tokenized.map((entry) => entry.tokens)]);
  const weightOf = (token: string) => weights.get(token) ?? 1;
  const queryWeight = queryTokens.reduce((sum, token) => sum + weightOf(token), 0);

  return tokenized
    .map(({ candidate, tokens }) => {
      const candidateTokens = new Set(tokens);
      const sharedWeight = [...new Set(queryTokens)]
        .filter((token) => candidateTokens.has(token))
        .reduce((sum, token) => sum + weightOf(token), 0);

      // Normalize against BOTH sides so a short name is not trivially "contained" in a longer
      // one: "milk" vs "coconut milk" shares all of the query's weight but only half the
      // candidate's, and should not read as a confident match.
      const candidateWeight = tokens.reduce((sum, token) => sum + weightOf(token), 0);
      const overlap =
        queryWeight === 0 || candidateWeight === 0
          ? 0
          : sharedWeight / Math.max(queryWeight, candidateWeight);

      const sameCategory =
        query.category !== null && candidate.category !== null && query.category === candidate.category;

      // The bonus applies only to a pair that already shares something. It refines a real
      // match; it never manufactures one.
      const score = overlap > 0 ? overlap + (sameCategory ? SIMILARITY_TUNING.categoryBonus : 0) : 0;

      return {
        itemId: candidate.itemId,
        name: candidate.name,
        locationId: candidate.locationId,
        locationName: candidate.locationName,
        score,
      };
    })
    .filter((suggestion) => suggestion.score >= SIMILARITY_TUNING.scoreCutoff)
    .sort((a, b) => b.score - a.score)
    .slice(0, SIMILARITY_TUNING.maxCandidates);
}
