import { describe, expect, it } from 'vitest';

import { validateDraft } from '@/features/recipe-entry/draft';
import { parseExtraction } from '@/features/recipe-entry/import/parse';

const VOCABULARY = ['bean sprouts', 'chicken', 'kim', 'noodles', 'shrimp'];

/** A well-formed model reply, so each case can break exactly one thing. */
function reply(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    name: 'Shrimp Noodle Bowls',
    cuisine: 'Thai',
    cookTimeMinutes: 25,
    summary: 'Fry the shrimp, boil the noodles, toss with sauce and sprouts.',
    servingsStated: true,
    ingredients: [
      { quantity: 0.75, unit: 'lb', name: 'shrimp', category: 'Protein' },
      { quantity: 6, unit: 'oz', name: 'rice noodles', category: 'Grains' },
    ],
    steps: ['Fry the shrimp until pink.', 'Boil the noodles for 4 minutes.', 'Toss together and serve.'],
    tags: ['shrimp', 'noodles'],
    ...overrides,
  });
}

describe('parseExtraction — a good response', () => {
  it('produces a draft', () => {
    expect(parseExtraction(reply(), VOCABULARY).ok).toBe(true);
  });

  it('produces a draft that validateDraft accepts, so review opens on a saveable form', () => {
    const result = parseExtraction(reply(), VOCABULARY);
    if (!result.ok) throw new Error('expected a draft');

    // The contract between this unit and unit 001: whatever extraction produces must pass the
    // same validation a typed draft does.
    expect(validateDraft(result.draft)).toEqual([]);
  });

  it('keeps every step, in order', () => {
    const result = parseExtraction(reply(), VOCABULARY);
    if (!result.ok) throw new Error('expected a draft');

    expect(result.draft.steps.map((step) => step.instruction)).toEqual([
      'Fry the shrimp until pink.',
      'Boil the noodles for 4 minutes.',
      'Toss together and serve.',
    ]);
  });

  it('stringifies the numbers at this boundary, because a draft holds text mid-edit', () => {
    const result = parseExtraction(reply(), VOCABULARY);
    if (!result.ok) throw new Error('expected a draft');

    expect(result.draft.cookTimeMinutes).toBe('25');
    expect(result.draft.ingredients[0].quantity).toBe('0.75');
  });

  it('gives every line its own id, so the editors can address them individually', () => {
    const result = parseExtraction(reply(), VOCABULARY);
    if (!result.ok) throw new Error('expected a draft');

    const ids = [...result.draft.ingredients.map((i) => i.id), ...result.draft.steps.map((s) => s.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports servingsStated so the user can be told the quantities were not rescaled', () => {
    const stated = parseExtraction(reply(), VOCABULARY);
    const unstated = parseExtraction(reply({ servingsStated: false }), VOCABULARY);

    expect(stated.ok && stated.servingsStated).toBe(true);
    expect(unstated.ok && unstated.servingsStated).toBe(false);
  });

  it('assumes the quantities WERE rescaled when the model omits the flag', () => {
    // Only an explicit `false` means "the source stated no serving count".
    const result = parseExtraction(reply({ servingsStated: undefined }), VOCABULARY);

    expect(result.ok && result.servingsStated).toBe(true);
  });

  it('recovers JSON from inside a markdown fence, because models add them', () => {
    const fenced = ['```json', reply(), '```'].join('\n');

    expect(parseExtraction(fenced, VOCABULARY).ok).toBe(true);
  });

  it('recovers JSON from behind a preamble', () => {
    expect(parseExtraction('Sure! Here is the recipe:\n' + reply(), VOCABULARY).ok).toBe(true);
  });
});

describe('parseExtraction — nothing usable came back', () => {
  it.each([
    ['prose with no JSON at all', 'I cannot help with that request.'],
    ['an empty reply', ''],
    ['broken JSON', '{ "name": "Tacos", '],
    ['a JSON array rather than an object', '[1, 2, 3]'],
  ])('reports not-json for %s', (_label, text) => {
    expect(parseExtraction(text, VOCABULARY)).toEqual({ ok: false, reason: 'not-json' });
  });

  it('routes a REFUSAL to not-json — it arrives as HTTP 200 carrying prose', () => {
    // The failure mode the bolt brief calls out: a refusal looks like success all the way down
    // the stack, so the strict parser is the only thing between it and the form.
    const refusal = 'I am not able to help with extracting content from that page.';

    expect(parseExtraction(refusal, VOCABULARY)).toEqual({ ok: false, reason: 'not-json' });
  });

  it('reports no-recipe when the model honestly says the page has none', () => {
    // Distinct from a malformed reply: nothing went wrong, the page simply had no recipe on it.
    expect(parseExtraction('{"error": "no recipe found"}', VOCABULARY)).toEqual({
      ok: false,
      reason: 'no-recipe',
    });
  });
});

describe('parseExtraction — the shape is wrong', () => {
  it.each([
    ['no name', { name: undefined }],
    ['a blank name', { name: '   ' }],
    ['a non-string name', { name: 42 }],
    ['no cuisine', { cuisine: undefined }],
    ['no summary', { summary: undefined }],
    ['ingredients that are not an array', { ingredients: 'shrimp, noodles' }],
    ['steps that are not an array', { steps: 'Fry the shrimp.' }],
    ['no ingredients at all', { ingredients: [] }],
    ['an ingredient that is not an object', { ingredients: ['shrimp'] }],
    ['an ingredient with no name', { ingredients: [{ quantity: 1, unit: 'lb', category: 'Protein' }] }],
  ])('reports bad-shape for %s', (_label, overrides) => {
    expect(parseExtraction(reply(overrides), VOCABULARY)).toEqual({ ok: false, reason: 'bad-shape' });
  });
});

describe('parseExtraction — a dinner with no steps is not reviewable', () => {
  it('reports no-steps for an empty step list', () => {
    expect(parseExtraction(reply({ steps: [] }), VOCABULARY)).toEqual({ ok: false, reason: 'no-steps' });
  });

  it('refuses a step list with a BLANK step rather than silently dropping it', () => {
    // The failure this whole bolt is shaped around. A blank entry means a step was lost somewhere
    // between the page and the reply; dropping it quietly is exactly what must not happen.
    const result = parseExtraction(reply({ steps: ['Fry the shrimp.', '   ', 'Serve.'] }), VOCABULARY);

    expect(result).toEqual({ ok: false, reason: 'no-steps' });
  });

  it('refuses a step list holding a non-string', () => {
    expect(parseExtraction(reply({ steps: ['Fry.', null] }), VOCABULARY)).toEqual({
      ok: false,
      reason: 'no-steps',
    });
  });

  it('refuses a TRUNCATED reply rather than presenting the part that survived', () => {
    // A response cut off by the token ceiling loses its tail. A partial parse presented as a
    // reviewable draft is the "plausible-looking wrong draft" story 003 warns about.
    const whole = reply();
    const truncated = whole.slice(0, Math.floor(whole.length / 2));

    expect(parseExtraction(truncated, VOCABULARY).ok).toBe(false);
  });
});

describe('parseExtraction — the values are wrong', () => {
  it.each([
    [
      'a category outside the five',
      { ingredients: [{ quantity: 1, unit: 'lb', name: 'shrimp', category: 'Seafood' }] },
    ],
    ['a missing category', { ingredients: [{ quantity: 1, unit: 'lb', name: 'shrimp' }] }],
    ['a zero quantity', { ingredients: [{ quantity: 0, unit: 'lb', name: 'shrimp', category: 'Protein' }] }],
    [
      'a negative quantity',
      { ingredients: [{ quantity: -1, unit: 'lb', name: 'shrimp', category: 'Protein' }] },
    ],
    [
      'a quantity sent as a string',
      { ingredients: [{ quantity: '1', unit: 'lb', name: 'shrimp', category: 'Protein' }] },
    ],
    ['a zero cook time', { cookTimeMinutes: 0 }],
    ['a negative cook time', { cookTimeMinutes: -5 }],
    ['a fractional cook time the integer column would truncate', { cookTimeMinutes: 25.5 }],
    ['a cook time sent as a string', { cookTimeMinutes: '25' }],
  ])('reports bad-values for %s', (_label, overrides) => {
    expect(parseExtraction(reply(overrides), VOCABULARY)).toEqual({ ok: false, reason: 'bad-values' });
  });

  it('FAILS on a bad ingredient rather than dropping the line', () => {
    // Deliberately the opposite of the tag rule. A dropped tag costs a filter; a dropped
    // ingredient costs a shopping-list line and is invisible in review.
    const result = parseExtraction(
      reply({
        ingredients: [
          { quantity: 0.75, unit: 'lb', name: 'shrimp', category: 'Protein' },
          { quantity: 6, unit: 'oz', name: 'rice noodles', category: 'Carbohydrates' },
        ],
      }),
      VOCABULARY,
    );

    expect(result).toEqual({ ok: false, reason: 'bad-values' });
  });
});

describe('parseExtraction — tags are proposed, never invented', () => {
  it('keeps tags the household already has', () => {
    const result = parseExtraction(reply({ tags: ['shrimp', 'noodles'] }), VOCABULARY);

    expect(result.ok && result.draft.tagNames).toEqual(['shrimp', 'noodles']);
  });

  it('DROPS an unrecognised tag rather than failing — it is simply not a tag', () => {
    const result = parseExtraction(reply({ tags: ['shrimp', 'weeknight', 'quick'] }), VOCABULARY);

    expect(result.ok).toBe(true);
    expect(result.ok && result.draft.tagNames).toEqual(['shrimp']);
  });

  it('rejects rosie-approved even when the household HAS that tag', () => {
    // The second of two guards. The prompt withholds it and this rejects it anyway, because "the
    // model was told not to" is not an enforcement. It asserts a person's opinion.
    const result = parseExtraction(reply({ tags: ['rosie-approved', 'shrimp'] }), [
      ...VOCABULARY,
      'rosie-approved',
    ]);

    expect(result.ok && result.draft.tagNames).toEqual(['shrimp']);
  });

  it('normalizes case and space to match the household vocabulary', () => {
    const result = parseExtraction(reply({ tags: ['  SHRIMP  ', 'Noodles'] }), VOCABULARY);

    expect(result.ok && result.draft.tagNames).toEqual(['shrimp', 'noodles']);
  });

  it('does not repeat a tag the model sent twice', () => {
    const result = parseExtraction(reply({ tags: ['shrimp', 'shrimp'] }), VOCABULARY);

    expect(result.ok && result.draft.tagNames).toEqual(['shrimp']);
  });

  it.each([
    ['tags missing', undefined],
    ['tags sent as a string', 'shrimp'],
    ['tags holding non-strings', [1, null, true]],
  ])('treats %s as no tags rather than a failure', (_label, tags) => {
    const result = parseExtraction(reply({ tags }), VOCABULARY);

    expect(result.ok).toBe(true);
    expect(result.ok && result.draft.tagNames).toEqual([]);
  });

  it('proposes nothing when the household has no vocabulary yet', () => {
    const result = parseExtraction(reply({ tags: ['shrimp', 'noodles'] }), []);

    expect(result.ok && result.draft.tagNames).toEqual([]);
  });
});
