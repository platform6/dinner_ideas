import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanPage } from '@/features/weekly-plan/components/PlanPage';
import { fetchCurrentPlan, removeSelection } from '@/features/weekly-plan/api';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

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

describe('PlanPage', () => {
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedRemoveSelection = vi.mocked(removeSelection);

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedRemoveSelection.mockResolvedValue(undefined);
  });

  it('shows an empty-plan message with a link to the catalog when no plan exists yet', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText(/no plan yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pick dinners from the catalog/i })).toHaveAttribute('href', '/');
  });

  it('shows the live count and lets you remove a pick while unlocked', async () => {
    const user = userEvent.setup();
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({
        weekly_plan_selections: [
          selection({
            id: 'sel-1',
            dinner_id: 'tacos',
            dinners: { ...selection({}).dinners, name: 'Tacos' },
          }),
          selection({
            id: 'sel-2',
            dinner_id: 'pasta',
            dinners: { ...selection({}).dinners, name: 'Pasta' },
          }),
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('2/3 selected')).toBeInTheDocument();
    expect(screen.getByText('Tacos')).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /remove/i })[0]);

    await waitFor(() => expect(mockedRemoveSelection).toHaveBeenCalledWith('sel-1'));
  });

  it('shows a read-only summary with no Remove actions once locked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({
        locked_at: '2026-08-25T12:00:00Z',
        weekly_plan_selections: [
          selection({
            id: 'sel-1',
            dinner_id: 'tacos',
            dinners: { ...selection({}).dinners, name: 'Tacos' },
          }),
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getByText(/this plan is locked/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });
});
