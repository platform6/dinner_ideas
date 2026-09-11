import { ROSIE_APPROVED_TAG } from '@/features/dinners/tags';
import { INGREDIENT_CATEGORIES } from '@/features/store-config/types';

/**
 * The proxy's own limit, copied from `supabase/functions/claude-proxy/rates.ts`
 * (`MAX_INPUT_BYTES = 50_000`). It checks
 *
 *     new TextEncoder().encode((system ?? '') + messages.map(m => m.content).join('')).length
 *
 * so the budget here must be computed the same way — in UTF-8 BYTES, over system + content
 * combined. Story 001 requires that the proxy never answers this caller with `bad_request` for
 * size, and mirroring the arithmetic is the only way to guarantee that.
 */
const MAX_INPUT_BYTES = 50_000;

/**
 * Held back from the budget. The check is on content only, so this is precaution rather than
 * necessity — cheap insurance against an off-by-a-few somewhere in the chain.
 */
const SAFETY_MARGIN_BYTES = 512;

const encoder = new TextEncoder();

export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/**
 * Truncates to at most `maxBytes` of UTF-8, **from the end**.
 *
 * From the end because the recipe sits near the top of a recipe page and the tail is the comment
 * section — dropping the tail keeps what matters.
 *
 * Binary search over the STRING index rather than slicing the byte array, so a multi-byte
 * character is never cut in half. Truncating bytes and decoding would leave a replacement
 * character; `'é'` is two bytes, an em-dash three, an emoji four, and a pasted recipe page is full
 * of all three. The index is not the whole story for the four-byte case — see the surrogate check
 * below.
 */
export function trimToBytes(text: string, maxBytes: number): { text: string; trimmed: boolean } {
  if (byteLength(text) <= maxBytes) return { text, trimmed: false };

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (byteLength(text.slice(0, mid)) <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  // A string index cannot fall inside a 2- or 3-byte character, but an astral character — any
  // emoji — is a SURROGATE PAIR occupying TWO indices, and the cut can land between them. A lone
  // high surrogate encodes as U+FFFD, so the search would happily "fit" a replacement character
  // where half an emoji used to be. Drop it instead.
  const end = isHighSurrogate(text.charCodeAt(low - 1)) ? low - 1 : low;

  return { text: text.slice(0, end), trimmed: true };
}

/**
 * The tag list offered to the model: the household's own vocabulary, minus `rosie-approved`.
 *
 * That tag records that a family member liked the dinner — a human judgment about a person's
 * opinion, not a property of the recipe — and it drives a visible heart in the catalog. A model
 * asserting it would be fabricating an opinion. The parser rejects it too; this is the first of
 * two guards, not the only one.
 */
export function proposableTags(vocabulary: readonly string[]): string[] {
  return vocabulary.filter((name) => name !== ROSIE_APPROVED_TAG);
}

/**
 * The extraction system prompt.
 *
 * Shows rather than describes: it carries one real founding dinner (Chicken Fajita Bowls, read
 * from the seed) with both instruction layers, because the relationship between them — the summary
 * IS the steps compressed — is far easier to demonstrate than to specify.
 *
 * The no-omission rule is stated explicitly and merging is offered as the legal way to shorten.
 * A model under length pressure will compress somehow; the prompt's job is to make merging the
 * reachable move so deleting a step is not.
 */
export function buildSystemPrompt(vocabulary: readonly string[]): string {
  const tags = proposableTags(vocabulary);

  return `You extract recipes from pasted web pages for a family's dinner catalog.

The page may be a blog post with a long personal story around the recipe. Ignore the narrative,
the comments and the navigation. Extract only the recipe.

Return ONE JSON object and nothing else. No prose, no explanation, no markdown fence.

## The shape

{
  "name": string,
  "cuisine": string,
  "cookTimeMinutes": integer greater than 0,
  "summary": string,
  "servingsStated": boolean,
  "ingredients": [{ "quantity": number greater than 0, "unit": string, "name": string, "category": string }],
  "steps": [string],
  "tags": [string]
}

## The rules that matter most

**Never drop a cooking step.** Every action needed to cook the dish must appear in "steps", in
order. If the source's method is long, MERGE adjacent trivial actions into one step — compress by
wording, never by omission. A distinct action must never vanish.

**Keep the detail that makes a step usable**: oven temperatures, times, quantities used at that
stage, and doneness cues like "until the chicken is cooked through".

**Write steps as terse imperative sentences.** "Preheat the oven to 425°F." — not "Now you'll want
to go ahead and preheat the oven".

**The summary is the steps compressed into one line.** Every step represented, joined with commas
and semicolons. **Never longer than 100 characters.** If it does not fit, compress the wording
further — never drop a step to make room. It is not a separate description and not a tagline.

**"cookTimeMinutes" is the TOTAL time from starting to eating** — preparation plus cooking. If the
page gives prep and cook times separately, ADD them. If it gives a total, use the total. Never take
the cook time alone when a prep time is also stated: the family plans a weeknight around this
number, so a 50-minute dinner filed as 25 minutes is worse than no number at all. If the page
states no time anywhere, estimate the total from the cooking steps themselves — the times they name
plus the work they describe — and round to the nearest 5 minutes.

**Quantities are for 3 servings** (2 adults and 1 small child). If the source states a serving
count, rescale every quantity to 3 — "serves 6" halves everything. If the source states NO serving
count, take the quantities as they are and set "servingsStated" to false, so the family knows to
check them.

**Every ingredient needs a category**, exactly one of: ${INGREDIENT_CATEGORIES.join(', ')}.
Nothing may be left uncategorised.

**Tags**: ${
    tags.length > 0
      ? `propose only from this list, and only where they genuinely apply: ${tags.join(', ')}. Never invent a tag. An empty list is fine.`
      : 'this household has no tags yet. Return an empty list.'
  }

**If the page does not contain a recipe**, return {"error": "no recipe found"}. Do not invent one.

## A dinner from this family's catalog, in the exact format

{
  "name": "Chicken Fajita Bowls",
  "cuisine": "Mexican",
  "cookTimeMinutes": 30,
  "summary": "Saute chicken, peppers, and onion with seasoning; serve over rice with cheese.",
  "servingsStated": true,
  "ingredients": [
    { "quantity": 1, "unit": "lb", "name": "chicken breast, sliced", "category": "Protein" },
    { "quantity": 2, "unit": "each", "name": "bell peppers", "category": "Produce" },
    { "quantity": 1, "unit": "each", "name": "onion", "category": "Produce" },
    { "quantity": 1, "unit": "tbsp", "name": "fajita seasoning", "category": "Pantry" },
    { "quantity": 1, "unit": "cup", "name": "cooked rice", "category": "Grains" },
    { "quantity": 0.5, "unit": "cup", "name": "shredded cheese", "category": "Dairy" }
  ],
  "steps": [
    "Sauté the chicken with peppers and onion, seasoned with fajita spices.",
    "Cook the rice according to package directions.",
    "Divide the rice into bowls and top with the chicken-pepper mixture.",
    "Sprinkle with cheese and serve."
  ],
  "tags": []
}

Note how the summary names every step in order, compressed — that is the house style.`;
}

/**
 * How many bytes of pasted text will fit, given the system prompt that will accompany it.
 *
 * Derived from the ACTUAL prompt, never hardcoded: the prompt carries a worked example and is a
 * meaningful fraction of the cap, so a flat "50 KB minus a guess" would be wrong the moment the
 * prompt changes.
 */
export function pasteBudgetBytes(systemPrompt: string): number {
  return MAX_INPUT_BYTES - byteLength(systemPrompt) - SAFETY_MARGIN_BYTES;
}
