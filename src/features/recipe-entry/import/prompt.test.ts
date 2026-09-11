import { describe, expect, it } from 'vitest';

import { INGREDIENT_CATEGORIES } from '@/features/store-config/types';
import {
  buildSystemPrompt,
  byteLength,
  pasteBudgetBytes,
  proposableTags,
  trimToBytes,
} from '@/features/recipe-entry/import/prompt';

/** The production vocabulary, as verified during planning. */
const VOCABULARY = ['bean sprouts', 'chicken', 'kim', 'noodles', 'shrimp'];

/** The proxy's own cap, `MAX_INPUT_BYTES` in `supabase/functions/claude-proxy/rates.ts`. */
const PROXY_CAP_BYTES = 50_000;

describe('byteLength', () => {
  it('counts UTF-8 bytes, not characters', () => {
    // The whole reason the budget is computed this way: every one of these is a single JS
    // character and none of them is a single byte, and a pasted recipe page is full of them.
    expect(byteLength('é')).toBe(2);
    expect(byteLength('½')).toBe(2);
    expect(byteLength('—')).toBe(3);
    expect(byteLength('🍤')).toBe(4);
    expect('é½—🍤'.length).toBeLessThan(byteLength('é½—🍤'));
  });
});

describe('trimToBytes', () => {
  it('leaves text that already fits alone, and says it did not trim', () => {
    expect(trimToBytes('a short paste', 100)).toEqual({ text: 'a short paste', trimmed: false });
  });

  it('trims from the END, because the recipe is at the top and the tail is comments', () => {
    const result = trimToBytes('RECIPE-THEN-COMMENTS', 6);

    expect(result.text).toBe('RECIPE');
    expect(result.trimmed).toBe(true);
  });

  it('never exceeds the budget', () => {
    const text = 'x'.repeat(500);

    expect(byteLength(trimToBytes(text, 137).text)).toBeLessThanOrEqual(137);
  });

  it('keeps as much as fits rather than being conservative', () => {
    // An off-by-one here would silently throw away a line of a recipe on every large paste.
    expect(trimToBytes('x'.repeat(500), 137).text).toHaveLength(137);
  });

  it('never splits a multi-byte character in half', () => {
    // Budget 5 across 3-byte em-dashes: one whole character fits, the second does not. Slicing
    // the byte array would emit a replacement character mid-word instead of stopping cleanly.
    const result = trimToBytes('———', 5);

    expect(result.text).toBe('—');
    expect(result.text).not.toContain('�');
    expect(byteLength(result.text)).toBeLessThanOrEqual(5);
  });

  it.each([
    ['emoji, 4 bytes each', '🍤🍤🍤', 7, '🍤'],
    ['accents, 2 bytes each', 'ééé', 5, 'éé'],
    ['mixed widths', 'a—b🍤c', 6, 'a—b'],
  ])('stops on a character boundary — %s', (_label, text, budget, expected) => {
    const result = trimToBytes(text, budget);

    expect(result.text).toBe(expected);
    expect(byteLength(result.text)).toBeLessThanOrEqual(budget);
  });

  it('returns nothing rather than a broken character when not even one fits', () => {
    expect(trimToBytes('🍤', 3)).toEqual({ text: '', trimmed: true });
  });
});

describe('pasteBudgetBytes', () => {
  it('leaves room for the system prompt inside the proxy cap', () => {
    const system = buildSystemPrompt(VOCABULARY);

    expect(byteLength(system) + pasteBudgetBytes(system)).toBeLessThan(PROXY_CAP_BYTES);
  });

  it('shrinks when the prompt grows, so it can never be a stale constant', () => {
    const small = buildSystemPrompt([]);
    const large = buildSystemPrompt(VOCABULARY);

    expect(pasteBudgetBytes(large)).toBeLessThan(pasteBudgetBytes(small));
  });

  it('still leaves room for a whole recipe page, so trimming stays the exception', () => {
    // A long blog recipe post runs ~20-30 KB. If the prompt ever grew enough to push the budget
    // near that, trimming would become the normal path and this test should fail loudly.
    expect(pasteBudgetBytes(buildSystemPrompt(VOCABULARY))).toBeGreaterThan(40_000);
  });
});

describe('proposableTags', () => {
  it('offers the household vocabulary', () => {
    expect(proposableTags(VOCABULARY)).toEqual(VOCABULARY);
  });

  it('withholds rosie-approved — a model may not assert that a person liked a dinner', () => {
    expect(proposableTags(['chicken', 'rosie-approved', 'noodles'])).toEqual(['chicken', 'noodles']);
  });
});

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt(VOCABULARY);

  it('states the no-omission rule explicitly', () => {
    expect(prompt).toMatch(/never drop a cooking step/i);
  });

  it('offers merging as the legal way to shorten', () => {
    // The rule that matters most in this bolt: under length pressure a model compresses somehow,
    // and merging has to be the reachable move so that deleting a step is not.
    expect(prompt).toMatch(/merge/i);
  });

  it('carries a real founding dinner in both instruction layers', () => {
    expect(prompt).toContain('Chicken Fajita Bowls');
    // The summary layer...
    expect(prompt).toContain(
      'Saute chicken, peppers, and onion with seasoning; serve over rice with cheese.',
    );
    // ...and the step layer it is a compression of.
    expect(prompt).toContain('Cook the rice according to package directions.');
  });

  it('caps the summary with a rule rather than an adjective', () => {
    // The live pass produced 133- and 197-character summaries against "around 80 characters".
    // Prohibitions with a stated consequence held; a bare number did not — hence a hard ceiling.
    expect(prompt).toMatch(/never longer than 100 characters/i);
  });

  it('tells the model to compress rather than drop a step when the summary is too long', () => {
    // The cap must not become a reason to lose a step — the failure this whole bolt guards.
    expect(prompt).toMatch(/never drop a step to make room/i);
  });

  it('defines cook time as the TOTAL, not the cook time alone', () => {
    // A page giving Prep 25 / Cook 25 / Total 50 produced 25 on the live pass. The field now
    // says what it means.
    expect(prompt).toMatch(/TOTAL time from starting to eating/);
    expect(prompt).toMatch(/ADD them/);
  });

  it('says what to do when the page states no time at all', () => {
    // Without this the parser's positive-integer requirement fails the whole extraction on an
    // otherwise good recipe whose page never printed a time.
    expect(prompt).toMatch(/states no time anywhere/i);
    expect(prompt).toMatch(/nearest 5 minutes/i);
  });

  it('names the 3-serving convention and what to do when the source states none', () => {
    expect(prompt).toMatch(/3 servings/);
    expect(prompt).toMatch(/servingsStated/);
  });

  it('lists every ingredient category, so nothing can be left uncategorised', () => {
    for (const category of INGREDIENT_CATEGORIES) {
      expect(prompt).toContain(category);
    }
  });

  it('sends the household vocabulary and forbids inventing one', () => {
    for (const name of VOCABULARY) {
      expect(prompt).toContain(name);
    }
    expect(prompt).toMatch(/never invent a tag/i);
  });

  it('never sends rosie-approved to the model', () => {
    expect(buildSystemPrompt(['chicken', 'rosie-approved'])).not.toContain('rosie-approved');
  });

  it('asks for an empty list rather than invention when the household has no tags', () => {
    expect(buildSystemPrompt([])).toMatch(/no tags yet/i);
  });

  it('gives the model an honest way out of a page with no recipe on it', () => {
    expect(prompt).toContain('"error": "no recipe found"');
  });
});
