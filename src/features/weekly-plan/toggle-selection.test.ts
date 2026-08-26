import { describe, expect, it } from 'vitest';

import { decideToggleAction } from '@/features/weekly-plan/toggle-selection';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

function selection(overrides: Partial<SelectionWithDinner>): SelectionWithDinner {
  return {
    id: 'selection-id',
    weekly_plan_id: 'plan-id',
    dinner_id: 'dinner-id',
    dinners: {
      id: 'dinner-id',
      name: 'Dinner',
      cuisine_type: 'Italian',
      cook_time_minutes: 30,
      rosie_approved: false,
      is_active: true,
      instructions: '',
      created_at: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

function plan(overrides: Partial<CurrentPlan>): CurrentPlan {
  return {
    id: 'plan-id',
    start_date: '2026-08-24',
    locked_at: null,
    created_at: '2026-08-24T00:00:00Z',
    weekly_plan_selections: [],
    ...overrides,
  };
}

describe('decideToggleAction', () => {
  it('removes an already-selected dinner', () => {
    const currentPlan = plan({ weekly_plan_selections: [selection({ id: 'sel-1', dinner_id: 'tacos' })] });
    expect(decideToggleAction('tacos', currentPlan)).toEqual({ type: 'remove', selectionId: 'sel-1' });
  });

  it('creates a new plan when none exists yet', () => {
    expect(decideToggleAction('tacos', null)).toEqual({ type: 'create-and-add' });
  });

  it('creates a new plan when the current one is locked', () => {
    const lockedPlan = plan({ locked_at: '2026-08-25T12:00:00Z' });
    expect(decideToggleAction('tacos', lockedPlan)).toEqual({ type: 'create-and-add' });
  });

  it('adds to the existing plan when unlocked and the dinner is not yet selected', () => {
    const currentPlan = plan({ weekly_plan_selections: [selection({ id: 'sel-1', dinner_id: 'pasta' })] });
    expect(decideToggleAction('tacos', currentPlan)).toEqual({ type: 'add', planId: 'plan-id' });
  });

  it('adds rather than removes when the same dinner_id belongs to a different selection', () => {
    // Guards against a naive "any selection exists" check instead of matching on dinner_id.
    const currentPlan = plan({ weekly_plan_selections: [selection({ id: 'sel-1', dinner_id: 'pasta' })] });
    const action = decideToggleAction('curry', currentPlan);
    expect(action.type).toBe('add');
  });
});
