import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDinner, mapSaveError } from '@/features/recipe-entry/api';
import { createIngredientLine, createStep, type RecipeDraft } from '@/features/recipe-entry/draft';
import { supabase } from '@/shared/lib/supabase';

vi.mock('@/shared/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    name: '  Sheet Pan Fajitas  ',
    cuisineType: ' Mexican ',
    cookTimeMinutes: '30',
    summary: ' Chicken and peppers. ',
    ingredients: [
      {
        ...createIngredientLine(),
        quantity: '1.5',
        unit: ' lb ',
        name: ' Chicken thighs ',
        category: 'Protein',
      },
      { ...createIngredientLine(), quantity: '2', unit: 'each', name: 'Bell peppers', category: 'Produce' },
    ],
    steps: [
      { ...createStep(), instruction: ' Heat the oven. ' },
      { ...createStep(), instruction: 'Roast for 30 minutes.' },
    ],
    tagNames: ['weeknight', 'sheet-pan'],
    ...overrides,
  };
}

describe('createDinner', () => {
  const mockedRpc = vi.mocked(supabase.rpc);

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedRpc.mockResolvedValue({ data: 'new-id', error: null } as any);
  });

  it('calls the RPC exactly once — the whole aggregate in one round trip', async () => {
    await createDinner(draft());

    expect(mockedRpc).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith('fn_create_dinner', expect.anything());
  });

  it('sends the steps in displayed order', async () => {
    await createDinner(draft());

    const [, args] = mockedRpc.mock.calls[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((args as any).p_steps).toEqual(['Heat the oven.', 'Roast for 30 minutes.']);
  });

  it('parses quantities and cook time to numbers, not strings', async () => {
    await createDinner(draft());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = mockedRpc.mock.calls[0][1] as any;
    expect(args.p_cook_time_minutes).toBe(30);
    expect(args.p_ingredients[0].quantity).toBe(1.5);
    expect(args.p_ingredients[1].quantity).toBe(2);
  });

  it('trims the text it sends', async () => {
    await createDinner(draft());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = mockedRpc.mock.calls[0][1] as any;
    expect(args.p_name).toBe('Sheet Pan Fajitas');
    expect(args.p_cuisine_type).toBe('Mexican');
    expect(args.p_instructions).toBe('Chicken and peppers.');
    expect(args.p_ingredients[0].name).toBe('Chicken thighs');
    expect(args.p_ingredients[0].unit).toBe('lb');
  });

  it('sends the tag names', async () => {
    await createDinner(draft());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockedRpc.mock.calls[0][1] as any).p_tag_names).toEqual(['weeknight', 'sheet-pan']);
  });

  it('returns the new dinner id', async () => {
    await expect(createDinner(draft())).resolves.toBe('new-id');
  });

  it('throws the Postgres error so the caller can map it', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedRpc.mockResolvedValue({ data: null, error: { code: '23505' } } as any);

    await expect(createDinner(draft())).rejects.toMatchObject({ code: '23505' });
  });
});

describe('mapSaveError', () => {
  it('turns a 23505 into a plain sentence naming the dinner', () => {
    const rejection = mapSaveError({ code: '23505' }, 'Fajitas');

    expect(rejection.isDuplicateName).toBe(true);
    expect(rejection.message).toContain('Fajitas');
    expect(rejection.message).toMatch(/different name/i);
  });

  it('never leaks raw Postgres text', () => {
    // Story 006: `duplicate key value violates unique constraint "dinners_household_id_name_key"`
    // must not reach the interface.
    const rejection = mapSaveError(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "dinners_household_id_name_key"',
        details: 'Key (household_id, name)=(...) already exists.',
      },
      'Fajitas',
    );

    expect(rejection.message).not.toMatch(/duplicate key|constraint|household_id/i);
  });

  it('handles a duplicate with no name typed yet', () => {
    expect(mapSaveError({ code: '23505' }, '   ').message).toMatch(/that name/i);
  });

  it('maps a check violation to something about the values', () => {
    const rejection = mapSaveError({ code: '23514' }, 'Fajitas');

    expect(rejection.isDuplicateName).toBe(false);
    expect(rejection.message).toMatch(/quantit|cook time|categor/i);
  });

  it('maps a permission error to permission, not to "try again"', () => {
    // 42501 is never fixed by retrying — intent 008 spent a production incident on this.
    const rejection = mapSaveError({ code: '42501' }, 'Fajitas');

    expect(rejection.message).toMatch(/permission/i);
    expect(rejection.message).not.toMatch(/try again/i);
  });

  it('falls back to a generic message for anything else', () => {
    expect(mapSaveError({ code: '08006' }, 'Fajitas').message).toMatch(/connection|try again/i);
    expect(mapSaveError(new Error('boom'), 'Fajitas').message).toMatch(/connection|try again/i);
    expect(mapSaveError(null, 'Fajitas').message).toMatch(/connection|try again/i);
  });

  it('never reports a non-duplicate as a duplicate', () => {
    for (const code of ['23514', '42501', '08006', 'PGRST301']) {
      expect(mapSaveError({ code }, 'Fajitas').isDuplicateName).toBe(false);
    }
  });
});
