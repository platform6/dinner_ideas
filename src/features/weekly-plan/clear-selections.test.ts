import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClearSelections, useRestoreSelections } from '@/features/weekly-plan/hooks';
import { addSelection, clearSelections } from '@/features/weekly-plan/api';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

vi.mock('@/features/weekly-plan/api');
vi.mock('@/features/settings/api');

const mockedClearSelections = vi.mocked(clearSelections);
const mockedAddSelection = vi.mocked(addSelection);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function selection(dinnerId: string): SelectionWithDinner {
  return {
    id: `sel-${dinnerId}`,
    weekly_plan_id: 'plan-1',
    dinner_id: dinnerId,
    dinners: {
      id: dinnerId,
      household_id: 'hh',
      name: dinnerId,
      cuisine_type: 'Italian',
      cook_time_minutes: 30,
      is_active: true,
      instructions: '',
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

const plan: CurrentPlan = {
  id: 'plan-1',
  household_id: 'hh',
  start_date: '2026-08-30',
  locked_at: null,
  created_at: '2026-08-30T00:00:00Z',
  weekly_plan_selections: [selection('a'), selection('b'), selection('c')],
};

describe('useClearSelections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClearSelections.mockResolvedValue(undefined);
    mockedAddSelection.mockResolvedValue(undefined);
  });

  it('reads the dinner ids first, deletes by plan id, and returns the ids in order', async () => {
    const { result } = renderHook(() => useClearSelections(), { wrapper });

    const returned = await result.current.mutateAsync(plan);

    expect(mockedClearSelections).toHaveBeenCalledWith('plan-1');
    expect(returned).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op returning [] for a null plan', async () => {
    const { result } = renderHook(() => useClearSelections(), { wrapper });

    const returned = await result.current.mutateAsync(null);

    expect(returned).toEqual([]);
    expect(mockedClearSelections).not.toHaveBeenCalled();
  });
});

describe('useRestoreSelections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAddSelection.mockResolvedValue(undefined);
  });

  it('re-adds each id sequentially, in the original order', async () => {
    const { result } = renderHook(() => useRestoreSelections(), { wrapper });

    await result.current.mutateAsync({ planId: 'plan-1', dinnerIds: ['a', 'b', 'c'] });

    await waitFor(() => expect(mockedAddSelection).toHaveBeenCalledTimes(3));
    expect(mockedAddSelection.mock.calls).toEqual([
      ['plan-1', 'a'],
      ['plan-1', 'b'],
      ['plan-1', 'c'],
    ]);
  });
});
