import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookingViewPage } from '@/features/cooking-view/components/CookingViewPage';
import { fetchDinnersWithStepsByIds } from '@/features/dinners/api';
import { fetchCurrentPlan } from '@/features/weekly-plan/api';
import type { DinnerWithSteps } from '@/features/dinners/types';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

vi.mock('@/features/dinners/api');
vi.mock('@/features/weekly-plan/api');

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

function dinnerWithSteps(overrides: Partial<DinnerWithSteps>): DinnerWithSteps {
  return {
    id: 'id',
    name: 'Dinner',
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_steps: [],
    ...overrides,
  };
}

const threeSelections = [
  selection({ id: 'sel-1', dinner_id: '1' }),
  selection({ id: 'sel-2', dinner_id: '2' }),
  selection({ id: 'sel-3', dinner_id: '3' }),
];

describe('CookingViewPage', () => {
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedFetchDinnersWithStepsByIds = vi.mocked(fetchDinnersWithStepsByIds);

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CookingViewPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a gate message when fewer than 3 dinners are picked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: [threeSelections[0]] }));
    renderPage();

    expect(await screen.findByText(/pick 3 dinners/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /the catalog/i })).toHaveAttribute('href', '/');
  });

  it('shows a gate message when no plan exists at all', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText(/pick 3 dinners/i)).toBeInTheDocument();
  });

  it('shows all 3 dinners with their steps as an ordered, numbered list', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedFetchDinnersWithStepsByIds.mockResolvedValue([
      dinnerWithSteps({
        id: '1',
        name: 'Tacos',
        dinner_steps: [
          { id: 's1', dinner_id: '1', step_number: 1, instruction: 'Brown the turkey.' },
          { id: 's2', dinner_id: '1', step_number: 2, instruction: 'Serve in tortillas.' },
        ],
      }),
      dinnerWithSteps({ id: '2', name: 'Pasta', dinner_steps: [] }),
      dinnerWithSteps({ id: '3', name: 'Curry', dinner_steps: [] }),
    ]);
    renderPage();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Brown the turkey.');
    expect(items[1]).toHaveTextContent('Serve in tortillas.');
  });

  it('shows a fallback note for a dinner with zero steps', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedFetchDinnersWithStepsByIds.mockResolvedValue([
      dinnerWithSteps({ id: '1', name: 'Tacos', dinner_steps: [] }),
      dinnerWithSteps({ id: '2', name: 'Pasta', dinner_steps: [] }),
      dinnerWithSteps({ id: '3', name: 'Curry', dinner_steps: [] }),
    ]);
    renderPage();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getAllByText(/no steps available/i)).toHaveLength(3);
  });

  it('shows the same steps unchanged once the plan is locked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({ locked_at: '2026-08-27T12:00:00Z', weekly_plan_selections: threeSelections }),
    );
    mockedFetchDinnersWithStepsByIds.mockResolvedValue([
      dinnerWithSteps({
        id: '1',
        name: 'Tacos',
        dinner_steps: [{ id: 's1', dinner_id: '1', step_number: 1, instruction: 'Brown the turkey.' }],
      }),
      dinnerWithSteps({ id: '2', name: 'Pasta', dinner_steps: [] }),
      dinnerWithSteps({ id: '3', name: 'Curry', dinner_steps: [] }),
    ]);
    renderPage();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getByText('Brown the turkey.')).toBeInTheDocument();
  });
});
