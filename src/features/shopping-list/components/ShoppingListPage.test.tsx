import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShoppingListPage } from '@/features/shopping-list/components/ShoppingListPage';
import { fetchDinnersByIds } from '@/features/dinners/api';
import { fetchCurrentPlan, lockPlan } from '@/features/weekly-plan/api';
import { fetchAssignments, fetchRows } from '@/features/store-config/api';
import { theme } from '@/shared/theme';
import type { DinnerWithIngredients } from '@/features/dinners/types';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

vi.mock('@/features/dinners/api');
vi.mock('@/features/weekly-plan/api');
vi.mock('@/features/store-config/api');

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

function dinnerWithIngredients(id: string, name: string): DinnerWithIngredients {
  return {
    id,
    household_id: 'hh-test',
    name,
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [
      { id: `${id}-ing`, dinner_id: id, name: 'onion', unit: 'each', quantity: 1, category: 'Produce' },
    ],
  };
}

const threeSelections = [
  selection({ id: 'sel-1', dinner_id: '1' }),
  selection({ id: 'sel-2', dinner_id: '2' }),
  selection({ id: 'sel-3', dinner_id: '3' }),
];

const threeDinners = [
  dinnerWithIngredients('1', 'Tacos'),
  dinnerWithIngredients('2', 'Pasta'),
  dinnerWithIngredients('3', 'Curry'),
];

describe('ShoppingListPage', () => {
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedFetchDinnersByIds = vi.mocked(fetchDinnersByIds);
  const mockedLockPlan = vi.mocked(lockPlan);
  const mockedFetchRows = vi.mocked(fetchRows);
  const mockedFetchAssignments = vi.mocked(fetchAssignments);
  const mockedWriteText = vi.fn();

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ShoppingListPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>,
    );
  }

  // userEvent.setup() installs its own navigator.clipboard mock, so ours must be
  // defined *after* it (per-test), not in beforeEach, or user-event's stub wins.
  function setupUser() {
    const readyUser = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockedWriteText },
      configurable: true,
      writable: true,
    });
    return readyUser;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDinnersByIds.mockResolvedValue(threeDinners);
    mockedLockPlan.mockResolvedValue(plan({ locked_at: '2026-08-27T12:00:00Z' }));
    mockedFetchRows.mockResolvedValue([]);
    mockedFetchAssignments.mockResolvedValue([]);
    mockedWriteText.mockResolvedValue(undefined);
  });

  it('shows a gate message when fewer than 3 dinners are picked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: [threeSelections[0]] }));
    renderPage();

    expect(await screen.findByText(/pick 3 dinners/i)).toBeInTheDocument();
  });

  it('shows the merged, category-grouped list once 3 dinners are picked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    expect(await screen.findByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('3 each')).toBeInTheDocument();
    expect(screen.getByText('onion')).toBeInTheDocument();
  });

  it('copies and locks by default when Copy is tapped', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    expect(screen.getByRole('checkbox', { name: /also lock/i })).toBeChecked();
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    await waitFor(() => expect(mockedWriteText).toHaveBeenCalledWith(expect.stringContaining('onion')));
    await waitFor(() => expect(mockedLockPlan).toHaveBeenCalledWith('plan-id'));
    expect(await screen.findByText(/copied! this week.s plan is locked in/i)).toBeInTheDocument();
  });

  it('copies without locking when the checkbox is unchecked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    await user.click(screen.getByRole('checkbox', { name: /also lock/i }));
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    await waitFor(() => expect(mockedWriteText).toHaveBeenCalled());
    expect(await screen.findByText(/^copied!$/i)).toBeInTheDocument();
    expect(mockedLockPlan).not.toHaveBeenCalled();
  });

  it('shows a lock-specific error when locking fails', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedLockPlan.mockRejectedValue(new Error('selection count is not 3'));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    expect(await screen.findByText(/couldn.t lock the plan/i)).toBeInTheDocument();
    expect(mockedWriteText).toHaveBeenCalled();
  });

  it('falls back to a selectable text block when the clipboard API fails', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    mockedWriteText.mockRejectedValue(new Error('clipboard blocked'));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    expect(await screen.findByText(/couldn.t copy automatically/i)).toBeInTheDocument();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain('onion');
  });

  it('disables the lock checkbox (checked) once the plan is already locked', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({ locked_at: '2026-08-27T12:00:00Z', weekly_plan_selections: threeSelections }),
    );
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    const checkbox = screen.getByRole('checkbox', { name: /also lock/i });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    await waitFor(() => expect(mockedWriteText).toHaveBeenCalled());
    expect(mockedLockPlan).not.toHaveBeenCalled();
    expect(await screen.findByText(/copied! this week.s plan is locked in/i)).toBeInTheDocument();
  });
});
