import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookingViewPage } from '@/features/cooking-view/components/CookingViewPage';
import { fetchDinnersWithStepsByIds } from '@/features/dinners/api';
import { fetchCurrentPlan } from '@/features/weekly-plan/api';
import { fetchWeekStartDay } from '@/features/settings/api';
import type { DinnerWithSteps } from '@/features/dinners/types';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

vi.mock('@/features/dinners/api');
vi.mock('@/features/weekly-plan/api');
vi.mock('@/features/settings/api');

function selection(overrides: Partial<SelectionWithDinner>): SelectionWithDinner {
  return {
    id: 'selection-id',
    weekly_plan_id: 'plan-id',
    dinner_id: 'dinner-id',
    dinners: {
      id: 'dinner-id',
      household_id: 'hh-test',
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
    household_id: 'hh-test',
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
    household_id: 'hh-test',
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
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
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

  it('shows each dinner collapsed with cook-time and step-count, steps hidden until expanded', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedFetchDinnersWithStepsByIds.mockResolvedValue([
      dinnerWithSteps({
        id: '1',
        name: 'Tacos',
        cook_time_minutes: 25,
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
    expect(screen.getByText(/25 min · 2 steps/)).toBeInTheDocument();
    expect(screen.queryByText('Brown the turkey.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Tacos' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands only the tapped card, independently of the others', async () => {
    const user = userEvent.setup();
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
      dinnerWithSteps({
        id: '2',
        name: 'Pasta',
        dinner_steps: [{ id: 's3', dinner_id: '2', step_number: 1, instruction: 'Boil the pasta.' }],
      }),
      dinnerWithSteps({ id: '3', name: 'Curry', dinner_steps: [] }),
    ]);
    renderPage();

    await screen.findByText('Tacos');
    await user.click(screen.getByRole('button', { name: 'Expand Tacos' }));

    expect(await screen.findByText('Brown the turkey.')).toBeInTheDocument();
    expect(screen.getByText('Serve in tortillas.')).toBeInTheDocument();
    expect(screen.queryByText('Boil the pasta.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Tacos' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Expand Pasta' }));

    expect(await screen.findByText('Boil the pasta.')).toBeInTheDocument();
    // Tacos stays expanded — each card's state is independent.
    expect(screen.getByText('Brown the turkey.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse Tacos' }));

    expect(screen.queryByText('Brown the turkey.')).not.toBeInTheDocument();
    expect(screen.getByText('Boil the pasta.')).toBeInTheDocument();
  });

  it('shows a fallback note for a dinner with zero steps, once expanded', async () => {
    const user = userEvent.setup();
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedFetchDinnersWithStepsByIds.mockResolvedValue([
      dinnerWithSteps({ id: '1', name: 'Tacos', dinner_steps: [] }),
      dinnerWithSteps({ id: '2', name: 'Pasta', dinner_steps: [] }),
      dinnerWithSteps({ id: '3', name: 'Curry', dinner_steps: [] }),
    ]);
    renderPage();

    await screen.findByText('Tacos');
    await user.click(screen.getByRole('button', { name: 'Expand Tacos' }));
    await user.click(screen.getByRole('button', { name: 'Expand Pasta' }));
    await user.click(screen.getByRole('button', { name: 'Expand Curry' }));

    expect(await screen.findAllByText(/no steps available/i)).toHaveLength(3);
  });

  it('shows the same steps unchanged once the plan is locked', async () => {
    const user = userEvent.setup();
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

    await screen.findByText('Tacos');
    await user.click(screen.getByRole('button', { name: 'Expand Tacos' }));

    expect(await screen.findByText('Brown the turkey.')).toBeInTheDocument();
  });
});
