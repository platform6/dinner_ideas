import { describe, expect, it } from 'vitest';

import {
  buildAisleHistory,
  chooseAisle,
  createEmptyDraft,
  createIngredientLine,
  createStep,
  isDraftComplete,
  moveStep,
  numberedSteps,
  parsePositiveNumber,
  problemFor,
  renameIngredientLine,
  toggleTagName,
  validateDraft,
  type AisleHistoryRow,
  type RecipeDraft,
} from '@/features/recipe-entry/draft';

/** A draft that passes validation, so each case can break exactly one thing. */
function validDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    name: 'Sheet Pan Fajitas',
    cuisineType: 'Mexican',
    cookTimeMinutes: '30',
    summary: 'Chicken and peppers roasted on one pan.',
    ingredients: [
      {
        ...createIngredientLine(),
        quantity: '1.5',
        unit: 'lb',
        name: 'Chicken thighs',
        category: 'Protein',
        categorySource: 'chosen',
      },
    ],
    steps: [{ ...createStep(), instruction: 'Roast for 30 minutes.' }],
    tagNames: [],
    ...overrides,
  };
}

describe('parsePositiveNumber', () => {
  it.each([
    ['30', 30],
    ['1.5', 1.5],
    ['  2  ', 2],
    ['0.25', 0.25],
  ])('parses %s', (raw, expected) => {
    expect(parsePositiveNumber(raw)).toBe(expected);
  });

  it.each(['', '   ', '0', '-1', 'abc', 'NaN'])('rejects %s', (raw) => {
    expect(parsePositiveNumber(raw)).toBeNull();
  });

  it('rejects Infinity, which Number() happily produces', () => {
    // `Number('Infinity')` is Infinity, and Infinity > 0 — so a naive `> 0` check would let it
    // through and send it at a `numeric` column.
    expect(parsePositiveNumber('Infinity')).toBeNull();
  });
});

describe('numberedSteps', () => {
  it('numbers from 1 in array order', () => {
    const steps = [createStep(), createStep(), createStep()];
    expect(numberedSteps(steps).map((s) => s.stepNumber)).toEqual([1, 2, 3]);
  });

  it('leaves NO gap when a middle step is removed', () => {
    // The point of deriving the number rather than storing it: there is no second copy of the
    // ordering to fall out of sync. `unique (dinner_id, step_number)` cannot be violated here.
    const steps = [createStep(), createStep(), createStep(), createStep()];
    const remaining = steps.filter((step) => step.id !== steps[1].id);

    expect(numberedSteps(remaining).map((s) => s.stepNumber)).toEqual([1, 2, 3]);
  });

  it('keeps each step attached to its own number after a removal', () => {
    const steps = [
      { ...createStep(), instruction: 'first' },
      { ...createStep(), instruction: 'second' },
      { ...createStep(), instruction: 'third' },
    ];
    const remaining = steps.filter((step) => step.instruction !== 'second');

    expect(numberedSteps(remaining)).toEqual([
      expect.objectContaining({ stepNumber: 1, instruction: 'first' }),
      expect.objectContaining({ stepNumber: 2, instruction: 'third' }),
    ]);
  });
});

describe('moveStep', () => {
  it('moves a step down, and the numbering follows the display order', () => {
    const steps = [
      { ...createStep(), instruction: 'a' },
      { ...createStep(), instruction: 'b' },
      { ...createStep(), instruction: 'c' },
    ];

    const moved = moveStep(steps, 0, 2);

    expect(moved.map((s) => s.instruction)).toEqual(['b', 'c', 'a']);
    expect(numberedSteps(moved).map((s) => `${s.stepNumber}:${s.instruction}`)).toEqual([
      '1:b',
      '2:c',
      '3:a',
    ]);
  });

  it('moves a step up', () => {
    const steps = [
      { ...createStep(), instruction: 'a' },
      { ...createStep(), instruction: 'b' },
    ];
    expect(moveStep(steps, 1, 0).map((s) => s.instruction)).toEqual(['b', 'a']);
  });

  it.each([
    ['out of range low', -1, 0],
    ['out of range high', 5, 0],
    ['target out of range', 0, 9],
    ['same index', 1, 1],
  ])('is a no-op when %s', (_label, from, to) => {
    const steps = [
      { ...createStep(), instruction: 'a' },
      { ...createStep(), instruction: 'b' },
    ];
    expect(moveStep(steps, from, to).map((s) => s.instruction)).toEqual(['a', 'b']);
  });

  it('does not mutate the array it is given', () => {
    const steps = [
      { ...createStep(), instruction: 'a' },
      { ...createStep(), instruction: 'b' },
    ];
    moveStep(steps, 0, 1);
    expect(steps.map((s) => s.instruction)).toEqual(['a', 'b']);
  });
});

describe('toggleTagName', () => {
  it('attaches a name that is not there', () => {
    expect(toggleTagName([], 'weeknight')).toEqual(['weeknight']);
  });

  it('detaches a name that is, rather than duplicating it', () => {
    // `unique (dinner_id, tag_id)` should never be the thing that catches this.
    expect(toggleTagName(['weeknight'], 'weeknight')).toEqual([]);
  });

  it('normalizes case and surrounding space, resolving to the existing name', () => {
    expect(toggleTagName(['weeknight'], '  WEEKNIGHT ')).toEqual([]);
    expect(toggleTagName([], '  Quick ')).toEqual(['quick']);
  });

  it('ignores a name that is only whitespace', () => {
    expect(toggleTagName(['quick'], '   ')).toEqual(['quick']);
  });

  it('does not mutate the array it is given', () => {
    const names = ['quick'];
    toggleTagName(names, 'weeknight');
    expect(names).toEqual(['quick']);
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(validDraft())).toEqual([]);
    expect(isDraftComplete(validDraft())).toBe(true);
  });

  it.each([
    ['name', { name: '   ' }],
    ['cuisineType', { cuisineType: '' }],
    ['summary', { summary: '' }],
  ])('names the %s field when it is blank', (field, override) => {
    const problems = validateDraft(validDraft(override as Partial<RecipeDraft>));

    expect(problemFor(problems, field)).toBeDefined();
    // Not a generic "form invalid" — story 002 rules that out.
    expect(problemFor(problems, field)).not.toMatch(/invalid/i);
  });

  it.each(['0', '-5', '', 'soon'])('refuses a cook time of %s', (cookTimeMinutes) => {
    const problems = validateDraft(validDraft({ cookTimeMinutes }));
    expect(problemFor(problems, 'cookTimeMinutes')).toBeDefined();
  });

  it('refuses a decimal cook time, because the column is an integer', () => {
    // Postgres would silently truncate 22.5 to 22. Refusing is honest; truncating is not.
    expect(
      problemFor(validateDraft(validDraft({ cookTimeMinutes: '22.5' })), 'cookTimeMinutes'),
    ).toBeDefined();
  });

  it('refuses a dinner with no ingredients', () => {
    const problems = validateDraft(validDraft({ ingredients: [] }));
    expect(problemFor(problems, 'ingredients')).toBeDefined();
  });

  it('refuses a dinner with no steps', () => {
    const problems = validateDraft(validDraft({ steps: [] }));
    expect(problemFor(problems, 'steps')).toBeDefined();
  });

  it.each(['0', '-1', '', 'some'])('refuses a quantity of %s, naming that line', (quantity) => {
    const line = { ...createIngredientLine(), quantity, name: 'Chicken' };
    const problems = validateDraft(validDraft({ ingredients: [line] }));

    expect(problemFor(problems, `ingredients.${line.id}.quantity`)).toBeDefined();
  });

  it('refuses a blank ingredient name, naming that line', () => {
    const line = { ...createIngredientLine(), quantity: '1', name: '  ' };
    const problems = validateDraft(validDraft({ ingredients: [line] }));

    expect(problemFor(problems, `ingredients.${line.id}.name`)).toBeDefined();
  });

  it('refuses a blank step, naming that step', () => {
    const step = { ...createStep(), instruction: '   ' };
    const problems = validateDraft(validDraft({ steps: [step] }));

    expect(problemFor(problems, `steps.${step.id}`)).toBeDefined();
  });

  it('reports the SECOND bad line, not just the first', () => {
    // A validator that returns early would pass every single-problem case above and still leave
    // the user fixing one thing at a time.
    const good = { ...createIngredientLine(), quantity: '1', name: 'Rice' };
    const bad = { ...createIngredientLine(), quantity: '0', name: 'Beans' };
    const problems = validateDraft(validDraft({ ingredients: [good, bad] }));

    expect(problemFor(problems, `ingredients.${bad.id}.quantity`)).toBeDefined();
  });

  it('reports every problem at once, not one at a time', () => {
    const problems = validateDraft(
      validDraft({ name: '', cuisineType: '', summary: '', cookTimeMinutes: '0' }),
    );
    expect(problems.map((p) => p.field).sort()).toEqual([
      'cookTimeMinutes',
      'cuisineType',
      'name',
      'summary',
    ]);
  });

  it('reports problems from EVERY section, not just the first that has one', () => {
    // The case above uses only dinner-level fields, so it would still pass if validation bailed
    // out after them. This one spans the boundary: a bad name, a bad line, and no steps at all.
    const bad = { ...createIngredientLine(), quantity: '0', name: 'Beans' };
    const problems = validateDraft(validDraft({ name: '', ingredients: [bad], steps: [] }));

    expect(problemFor(problems, 'name')).toBeDefined();
    expect(problemFor(problems, `ingredients.${bad.id}.quantity`)).toBeDefined();
    expect(problemFor(problems, 'steps')).toBeDefined();
  });

  it('accepts a fractional quantity — the column is numeric, not integer', () => {
    const line = chooseAisle({ ...createIngredientLine(), quantity: '0.5', name: 'Butter' }, 'Dairy');
    expect(validateDraft(validDraft({ ingredients: [line] }))).toEqual([]);
  });

  it('should refuse a line with no aisle, saying "Choose an aisle." on that line (intent 019)', () => {
    const line = { ...createIngredientLine(), quantity: '1', name: 'Chicken thighs' };
    const problems = validateDraft(validDraft({ ingredients: [line] }));

    expect(problemFor(problems, `ingredients.${line.id}.category`)).toBe('Choose an aisle.');
    expect(isDraftComplete(validDraft({ ingredients: [line] }))).toBe(false);
  });

  it('accepts a draft with no tags — they are optional', () => {
    expect(validateDraft(validDraft({ tagNames: [] }))).toEqual([]);
  });
});

describe('createIngredientLine (intent 019, FR-2)', () => {
  it('should start with no aisle rather than a guessed one', () => {
    const line = createIngredientLine();
    expect(line.category).toBeNull();
    expect(line.categorySource).toBe('unset');
  });
});

describe('buildAisleHistory (intent 019, FR-3)', () => {
  function row(name: string, category: string, dinnerCreatedAt: string): AisleHistoryRow {
    return { name, category, dinnerCreatedAt };
  }

  it('should key names by nameKey, so spacing and case do not split an ingredient', () => {
    const history = buildAisleHistory([row('  Chicken Thighs ', 'Protein', '2026-01-01T00:00:00Z')]);
    expect(history.get('chicken thighs')).toBe('Protein');
  });

  it('should take the aisle from the most recently created dinner, whatever the row order', () => {
    const rows = [
      row('chicken thighs', 'Pantry', '2026-03-01T00:00:00Z'),
      row('Chicken thighs', 'Protein', '2026-01-01T00:00:00Z'),
      row('CHICKEN THIGHS', 'Produce', '2026-02-01T00:00:00Z'),
    ];
    expect(buildAisleHistory(rows).get('chicken thighs')).toBe('Pantry');
    expect(buildAisleHistory([...rows].reverse()).get('chicken thighs')).toBe('Pantry');
  });

  it('should keep "chicken thighs, cubed" a separate ingredient', () => {
    const history = buildAisleHistory([row('chicken thighs', 'Protein', '2026-01-01T00:00:00Z')]);
    expect(history.has('chicken thighs, cubed')).toBe(false);
  });

  it('should skip a category outside the five, and a blank name', () => {
    const history = buildAisleHistory([
      row('shrimp', 'Seafood', '2026-05-01T00:00:00Z'),
      row('shrimp', 'Protein', '2026-01-01T00:00:00Z'),
      row('   ', 'Pantry', '2026-01-01T00:00:00Z'),
    ]);
    expect(history.get('shrimp')).toBe('Protein');
    expect(history.size).toBe(1);
  });
});

describe('renameIngredientLine and chooseAisle (intent 019, FR-3)', () => {
  const history = buildAisleHistory([
    { name: 'Chicken thighs', category: 'Protein', dinnerCreatedAt: '2026-01-01T00:00:00Z' },
    { name: 'Rice', category: 'Grains', dinnerCreatedAt: '2026-01-01T00:00:00Z' },
  ]);

  it('should fill an unset aisle from history when the name matches, ignoring spacing and case', () => {
    const line = renameIngredientLine(createIngredientLine(), ' CHICKEN thighs ', history);
    expect(line).toMatchObject({ name: ' CHICKEN thighs ', category: 'Protein', categorySource: 'history' });
  });

  it('should leave an unset aisle unset when the name is unknown', () => {
    const line = renameIngredientLine(createIngredientLine(), 'Saffron', history);
    expect(line).toMatchObject({ category: null, categorySource: 'unset' });
  });

  it('should let a history-filled aisle follow the name: refill on a match, unset on a miss', () => {
    const filled = renameIngredientLine(createIngredientLine(), 'Chicken thighs', history);
    expect(renameIngredientLine(filled, 'Rice', history)).toMatchObject({
      category: 'Grains',
      categorySource: 'history',
    });
    expect(renameIngredientLine(filled, 'Chicken thighs, cubed', history)).toMatchObject({
      category: null,
      categorySource: 'unset',
    });
  });

  it('should never change a chosen aisle, whatever the name becomes', () => {
    let line = chooseAisle(createIngredientLine(), 'Dairy');
    for (const name of ['Chicken thighs', 'Rice', 'Saffron', '']) {
      line = renameIngredientLine(line, name, history);
      expect(line).toMatchObject({ name, category: 'Dairy', categorySource: 'chosen' });
    }
  });

  it('should make a history-filled aisle chosen once the cook picks one, even the same one', () => {
    const filled = renameIngredientLine(createIngredientLine(), 'Chicken thighs', history);
    const picked = chooseAisle(filled, 'Protein');
    expect(picked.categorySource).toBe('chosen');
    expect(renameIngredientLine(picked, 'Saffron', history).category).toBe('Protein');
  });

  it('should not mutate the line it is given', () => {
    const line = createIngredientLine();
    renameIngredientLine(line, 'Rice', history);
    chooseAisle(line, 'Pantry');
    expect(line).toMatchObject({ name: '', category: null, categorySource: 'unset' });
  });
});

describe('createEmptyDraft', () => {
  it('opens with one ingredient line and one step, so the editors are not empty boxes', () => {
    const draft = createEmptyDraft();
    expect(draft.ingredients).toHaveLength(1);
    expect(draft.steps).toHaveLength(1);
  });

  it('is not valid on its own', () => {
    expect(isDraftComplete(createEmptyDraft())).toBe(false);
  });

  it('gives every line a distinct id', () => {
    // Ids are React keys. Two lines sharing one is the bug this whole scheme exists to prevent.
    const ids = [
      ...createEmptyDraft().ingredients.map((l) => l.id),
      ...createEmptyDraft().ingredients.map((l) => l.id),
      createIngredientLine().id,
      createStep().id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
