import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogPage } from '@/features/dinners/components/CatalogPage';
import { fetchActiveDinners, fetchLastChosenDates, fetchSuppressedDinners, setDinnerActive } from '@/features/dinners/api';
import { addSelection, createPlan, fetchCurrentPlan } from '@/features/weekly-plan/api';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';
import type { DinnerWithIngredients } from '@/features/dinners/types';

vi.mock('@/features/dinners/api');
vi.mock('@/features/weekly-plan/api');

function dinner(overrides: Partial<DinnerWithIngredients>): DinnerWithIngredients {
  return {
    id: 'id',
    name: 'Dinner',
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    rosie_approved: false,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [],
    ...overrides,
  };
}

describe('CatalogPage (suppress flow)', () => {
  const mockedFetchActive = vi.mocked(fetchActiveDinners);
  const mockedFetchSuppressed = vi.mocked(fetchSuppressedDinners);
  const mockedSetActive = vi.mocked(setDinnerActive);
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedFetchLastChosenDates = vi.mocked(fetchLastChosenDates);

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <CatalogPage />
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchActive.mockResolvedValue([dinner({ id: '1', name: 'Tacos' })]);
    mockedFetchSuppressed.mockResolvedValue([dinner({ id: '2', name: 'Old Casserole', is_active: false })]);
    mockedSetActive.mockResolvedValue(undefined);
    mockedFetchCurrentPlan.mockResolvedValue(null);
    mockedFetchLastChosenDates.mockResolvedValue(new Map());
  });

  it('suppresses a dinner via "Not interested"', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /not interested/i }));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledWith('1', false));
  });

  it('shows the Suppressed view with an Un-suppress action when toggled', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tacos');
    await user.click(screen.getByRole('checkbox', { name: /show suppressed/i }));

    expect(await screen.findByText('Old Casserole')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /un-suppress/i }));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledWith('2', true));
  });

  it('shows an empty state message when the catalog has no matches', async () => {
    mockedFetchActive.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no dinners match these filters/i)).toBeInTheDocument();
  });

  it('shows the variety indicator text on each card', async () => {
    mockedFetchLastChosenDates.mockResolvedValue(new Map([['1', '2026-01-01T00:00:00Z']]));
    renderPage();

    expect(await screen.findByText(/last made/i)).toBeInTheDocument();
  });

  it('shows "Never made" for a dinner absent from the last-chosen map', async () => {
    renderPage();

    expect(await screen.findByText('Never made')).toBeInTheDocument();
  });
});

function selectionWithDinner(overrides: Partial<SelectionWithDinner>): SelectionWithDinner {
  return {
    id: 'selection-id',
    weekly_plan_id: 'plan-id',
    dinner_id: 'dinner-id',
    dinners: dinner({}),
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

describe('CatalogPage (pick-3 flow)', () => {
  const mockedFetchActive = vi.mocked(fetchActiveDinners);
  const mockedFetchSuppressed = vi.mocked(fetchSuppressedDinners);
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedCreatePlan = vi.mocked(createPlan);
  const mockedAddSelection = vi.mocked(addSelection);
  const mockedFetchLastChosenDates = vi.mocked(fetchLastChosenDates);

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <CatalogPage />
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchSuppressed.mockResolvedValue([]);
    mockedCreatePlan.mockResolvedValue(plan({ id: 'new-plan' }));
    mockedAddSelection.mockResolvedValue(undefined);
    mockedFetchLastChosenDates.mockResolvedValue(new Map());
  });

  it('starts a new plan and adds the pick when none exists yet', async () => {
    mockedFetchActive.mockResolvedValue([dinner({ id: '1', name: 'Tacos' })]);
    mockedFetchCurrentPlan.mockResolvedValue(null);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tacos');
    await user.click(screen.getByRole('checkbox', { name: 'Pick Tacos for this week' }));

    await waitFor(() => expect(mockedCreatePlan).toHaveBeenCalled());
    await waitFor(() => expect(mockedAddSelection).toHaveBeenCalledWith('new-plan', '1'));
  });

  it('disables picking a 4th dinner once 3 are already selected', async () => {
    mockedFetchActive.mockResolvedValue([
      dinner({ id: '1', name: 'Tacos' }),
      dinner({ id: '2', name: 'Pasta' }),
      dinner({ id: '3', name: 'Curry' }),
      dinner({ id: '4', name: 'Enchiladas' }),
    ]);
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({
        weekly_plan_selections: [
          selectionWithDinner({ id: 'sel-1', dinner_id: '1' }),
          selectionWithDinner({ id: 'sel-2', dinner_id: '2' }),
          selectionWithDinner({ id: 'sel-3', dinner_id: '3' }),
        ],
      })
    );
    renderPage();

    expect(await screen.findByText('3/3 selected')).toBeInTheDocument();

    // Tacos, Pasta, Curry are selected (enabled, to allow deselecting); Enchiladas is not (disabled).
    expect(screen.getByRole('checkbox', { name: 'Pick Tacos for this week' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pick Tacos for this week' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Pick Enchiladas for this week' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pick Enchiladas for this week' })).toBeDisabled();
  });
});
