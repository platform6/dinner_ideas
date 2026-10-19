import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanPage } from '@/features/weekly-plan/components/PlanPage';
import { theme } from '@/shared/theme';
import {
  fetchCurrentPlan,
  fetchPlanByStartDate,
  lockPlan,
  removeSelection,
} from '@/features/weekly-plan/api';
import { fetchDinnersPerWeek, fetchWeekStartDay } from '@/features/settings/api';
import { currentPlanningWeekStart, formatWeekRange } from '@/features/weekly-plan/date';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';
import { fetchDinnerFullDetails } from '@/features/dinners/api';
import type { DinnerFullDetails } from '@/features/dinners/types';

vi.mock('@/features/weekly-plan/api');
vi.mock('@/features/settings/api');
vi.mock('@/features/dinners/api');

// Intent 025: `SHOW_PHOTO_SLOTS` is a build-time constant. A getter over a hoisted flag lets each
// test choose its value, read when the component renders.
const photoSlots = vi.hoisted(() => ({ show: false }));
vi.mock('@/shared/components/photo-slots', () => ({
  get SHOW_PHOTO_SLOTS() {
    return photoSlots.show;
  },
}));

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

describe('PlanPage', () => {
  const mockedFetchCurrentPlan = vi.mocked(fetchCurrentPlan);
  const mockedFetchPlanByStartDate = vi.mocked(fetchPlanByStartDate);
  const mockedRemoveSelection = vi.mocked(removeSelection);
  const mockedLockPlan = vi.mocked(lockPlan);

  const threeSelections = [
    selection({ id: 'sel-1', dinner_id: 'tacos', dinners: { ...selection({}).dinners, name: 'Tacos' } }),
    selection({ id: 'sel-2', dinner_id: 'pasta', dinners: { ...selection({}).dinners, name: 'Pasta' } }),
    selection({ id: 'sel-3', dinner_id: 'curry', dinners: { ...selection({}).dinners, name: 'Curry' } }),
  ];

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <PlanPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    // Set explicitly: left unmocked, the page falls back to 3, which is how "Locks these 3
    // dinners" survived intent 015 (intent 019, bolt 073).
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(3);
    mockedRemoveSelection.mockResolvedValue(undefined);
    mockedLockPlan.mockResolvedValue(plan({ locked_at: '2026-08-25T12:00:00Z' }));
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

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
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
    expect(screen.getByText(/locked in — saved to your history/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lock in this week/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it('shows a "pick 3" prompt while 1–2 dinners are picked on the current week', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections.slice(0, 2) }));
    renderPage();

    expect(await screen.findByText(/pick 3 dinners to lock in your week/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lock in this week/i })).not.toBeInTheDocument();
  });

  it('offers "Lock in this week" once 3 are picked on the current unlocked week', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    expect(await screen.findByRole('button', { name: /lock in this week/i })).toBeInTheDocument();
    expect(screen.getByText(/locks these 3 dinners and adds them to your history/i)).toBeInTheDocument();
  });

  it('locks the current week through the inline confirm', async () => {
    const user = userEvent.setup();
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /lock in this week/i }));
    await user.click(screen.getByRole('button', { name: /lock it in/i }));

    await waitFor(() => expect(mockedLockPlan).toHaveBeenCalledWith('plan-id'));
    expect(mockedLockPlan).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when locking fails', async () => {
    const user = userEvent.setup();
    mockedLockPlan.mockRejectedValueOnce(new Error('nope'));
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /lock in this week/i }));
    await user.click(screen.getByRole('button', { name: /lock it in/i }));

    expect(await screen.findByText(/couldn’t lock this week, try again/i)).toBeInTheDocument();
  });

  it('shows the current week as a date range, with ▶ disabled', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ start_date: '2026-08-24' }));
    renderPage();

    expect(await screen.findByText('8/24 – 8/30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
  });

  it('navigates to the previous week on ◀, read-only, and re-enables ▶', async () => {
    const user = userEvent.setup();
    mockedFetchCurrentPlan.mockResolvedValue(plan({ start_date: '2026-08-24' }));
    mockedFetchPlanByStartDate.mockResolvedValue(
      plan({
        start_date: '2026-08-17',
        locked_at: '2026-08-20T12:00:00Z',
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

    await screen.findByText('8/24 – 8/30');
    await user.click(screen.getByRole('button', { name: /previous week/i }));

    expect(mockedFetchPlanByStartDate).toHaveBeenCalledWith('2026-08-17');
    expect(await screen.findByText('8/17 – 8/23')).toBeInTheDocument();
    expect(screen.getByText('Tacos')).toBeInTheDocument();
    expect(screen.getByText('Eaten')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next week/i })).toBeEnabled();
  });

  it('shows the all-picked dashed card with a link to the shopping list once 3 are picked', async () => {
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
          selection({
            id: 'sel-3',
            dinner_id: 'curry',
            dinners: { ...selection({}).dinners, name: 'Curry' },
          }),
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('All 3 dinners picked. Your shopping list is ready.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see shopping list/i })).toHaveAttribute(
      'href',
      '/shopping-list',
    );
  });

  describe('copy states the household’s dinner count (intent 019, FR-1)', () => {
    function picks(count: number): SelectionWithDinner[] {
      return Array.from({ length: count }, (_, i) =>
        selection({
          id: `sel-${i + 1}`,
          dinner_id: `dinner-${i + 1}`,
          dinners: { ...selection({}).dinners, id: `dinner-${i + 1}`, name: `Dinner ${i + 1}` },
        }),
      );
    }

    it.each([
      {
        count: 1,
        lockHelp: 'Locks this dinner and adds it to your history. You can still shop your list either way.',
        allPicked: 'Your dinner is picked. Your shopping list is ready.',
      },
      {
        count: 3,
        lockHelp:
          'Locks these 3 dinners and adds them to your history. You can still shop your list either way.',
        allPicked: 'All 3 dinners picked. Your shopping list is ready.',
      },
      {
        count: 5,
        lockHelp:
          'Locks these 5 dinners and adds them to your history. You can still shop your list either way.',
        allPicked: 'All 5 dinners picked. Your shopping list is ready.',
      },
    ])(
      'should render the lock help and all-picked copy for $count per week',
      async ({ count, lockHelp, allPicked }) => {
        vi.mocked(fetchDinnersPerWeek).mockResolvedValue(count);
        mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: picks(count) }));
        renderPage();

        expect(await screen.findByText(lockHelp)).toBeInTheDocument();
        expect(screen.getByText(allPicked)).toBeInTheDocument();
      },
    );

    it('should not say "3 dinners" or "three" anywhere when the household plans 5', async () => {
      vi.mocked(fetchDinnersPerWeek).mockResolvedValue(5);
      mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: picks(5) }));
      const { container } = renderPage();

      await screen.findByText('All 5 dinners picked. Your shopping list is ready.');
      // A bare "3" can't be asserted absent: the week label renders dates such as "8/23".
      expect(container.textContent).not.toMatch(/\b3 dinners\b/i);
      expect(container.textContent).not.toMatch(/\bthree\b/i);
    });

    it('should confirm "Lock in this dinner?" when the household plans 1', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchDinnersPerWeek).mockResolvedValue(1);
      mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: picks(1) }));
      renderPage();

      await user.click(await screen.findByRole('button', { name: /lock in this week/i }));

      expect(
        screen.getByText(/^Lock in this dinner\? You won’t be able to change this week’s picks\.$/),
      ).toBeInTheDocument();
    });
  });

  it('anchors offset 0 on the current planning week, not on today, when no plan exists', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(null);
    mockedFetchPlanByStartDate.mockResolvedValue(null);
    renderPage();

    // The header range is the planning-week window (from week_start_day + today), not a
    // range that starts on today's date — proves useWeekByOffset's anchor moved off todayIsoDate().
    expect(await screen.findByText(formatWeekRange(currentPlanningWeekStart(0)))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
  });

  it('shows a clear empty state for a skipped week with no plan', async () => {
    const user = userEvent.setup();
    mockedFetchCurrentPlan.mockResolvedValue(plan({ start_date: '2026-08-24' }));
    mockedFetchPlanByStartDate.mockResolvedValue(null);
    renderPage();

    await screen.findByText('8/24 – 8/30');
    await user.click(screen.getByRole('button', { name: /previous week/i }));

    expect(await screen.findByText('No plan this week.')).toBeInTheDocument();
  });
});

describe('PlanPage photo slot (intent 025)', () => {
  const threeSelections = [
    selection({ id: 'sel-1', dinner_id: 'tacos', dinners: { ...selection({}).dinners, name: 'Tacos' } }),
    selection({ id: 'sel-2', dinner_id: 'pasta', dinners: { ...selection({}).dinners, name: 'Pasta' } }),
    selection({ id: 'sel-3', dinner_id: 'curry', dinners: { ...selection({}).dinners, name: 'Curry' } }),
  ];

  /** The slot is only in the three-across (md+) card, so these run at a desktop width. */
  function renderAtDesktop() {
    vi.stubGlobal('matchMedia', (query: string) => {
      const min = /min-width:\s*([\d.]+)em/.exec(query);
      const max = /max-width:\s*([\d.]+)em/.exec(query);
      const matches = (!min || 1280 >= Number(min[1]) * 16) && (!max || 1280 <= Number(max[1]) * 16);
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <PlanPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(3);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    photoSlots.show = false;
  });

  it('should leave the empty photo tile out of the three-across cards while photo slots are off', async () => {
    renderAtDesktop();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-slot')).not.toBeInTheDocument();
  });

  it('should render one photo tile per three-across card when photo slots are on', async () => {
    photoSlots.show = true;
    renderAtDesktop();

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getAllByTestId('photo-slot')).toHaveLength(3);
  });
});

describe('PlanPage picked dinner details (intent 026)', () => {
  const mockedFetchDetails = vi.mocked(fetchDinnerFullDetails);
  const threeSelections = [
    selection({ id: 'sel-1', dinner_id: 'tacos', dinners: { ...selection({}).dinners, name: 'Tacos' } }),
    selection({ id: 'sel-2', dinner_id: 'pasta', dinners: { ...selection({}).dinners, name: 'Pasta' } }),
    selection({ id: 'sel-3', dinner_id: 'curry', dinners: { ...selection({}).dinners, name: 'Curry' } }),
  ];

  function details(dinnerId: string): DinnerFullDetails {
    return {
      dinner_steps: [
        { id: `${dinnerId}-s1`, dinner_id: dinnerId, step_number: 1, instruction: `Cook the ${dinnerId}.` },
      ],
      dinner_ingredients: [
        {
          id: `${dinnerId}-i1`,
          dinner_id: dinnerId,
          name: `${dinnerId} base`,
          quantity: 2,
          unit: 'cup',
          category: 'Pantry',
        },
      ],
      tags: [{ id: 't1', name: 'kid-friendly' }],
    };
  }

  /** Width in px for Chakra's breakpoint queries: 1280 gives the three-across cards, 390 the phone rows. */
  function renderAt(width: number) {
    vi.stubGlobal('matchMedia', (query: string) => {
      const min = /min-width:\s*([\d.]+)em/.exec(query);
      const max = /max-width:\s*([\d.]+)em/.exec(query);
      const matches = (!min || width >= Number(min[1]) * 16) && (!max || width <= Number(max[1]) * 16);
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <PlanPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(3);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    vi.mocked(removeSelection).mockResolvedValue(undefined);
    mockedFetchDetails.mockImplementation((dinnerId) => Promise.resolve(details(dinnerId)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('on a phone', () => {
    it('should start every dinner collapsed, without fetching any details', async () => {
      renderAt(390);

      await screen.findByText('Tacos');
      for (const name of ['Tacos', 'Pasta', 'Curry']) {
        expect(screen.getByRole('button', { name: `Expand ${name}` })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
      expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
      expect(mockedFetchDetails).not.toHaveBeenCalled();
    });

    it('should show ingredients, then steps, and no tags, for the opened dinner only', async () => {
      const user = userEvent.setup();
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));

      const ingredient = await screen.findByText('2 cup tacos base');
      const step = screen.getByText('Cook the tacos.');
      expect(ingredient.compareDocumentPosition(step) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText('Ingredients')).toBeInTheDocument();
      expect(screen.getByText('Steps')).toBeInTheDocument();
      expect(screen.queryByText('kid-friendly')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse Tacos' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Expand Pasta' })).toHaveAttribute('aria-expanded', 'false');
      expect(mockedFetchDetails).toHaveBeenCalledTimes(1);
      expect(mockedFetchDetails).toHaveBeenCalledWith('tacos');
    });

    it('should open and close each row independently, with several open at once', async () => {
      const user = userEvent.setup();
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));
      await user.click(screen.getByRole('button', { name: 'Expand Pasta' }));

      expect(await screen.findByText('Cook the tacos.')).toBeInTheDocument();
      expect(await screen.findByText('Cook the pasta.')).toBeInTheDocument();
      expect(screen.queryByText('Cook the curry.')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Collapse Tacos' }));

      expect(screen.queryByText('Cook the tacos.')).not.toBeInTheDocument();
      expect(screen.getByText('Cook the pasta.')).toBeInTheDocument();
    });

    it('should keep expand and remove from triggering each other', async () => {
      const user = userEvent.setup();
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));
      expect(vi.mocked(removeSelection)).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Remove Pasta' }));
      expect(vi.mocked(removeSelection)).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Expand Pasta' })).toHaveAttribute('aria-expanded', 'false');
      expect(mockedFetchDetails).not.toHaveBeenCalledWith('pasta');
    });

    it('should say so when a dinner has no ingredients or steps', async () => {
      const user = userEvent.setup();
      mockedFetchDetails.mockResolvedValue({ dinner_steps: [], dinner_ingredients: [], tags: [] });
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));

      expect(await screen.findByText('No ingredients recorded.')).toBeInTheDocument();
      expect(screen.getByText('No steps recorded.')).toBeInTheDocument();
    });

    it('should show a spinner while loading, then an error without breaking the page', async () => {
      const user = userEvent.setup();
      let fail: (error: Error) => void = () => {};
      mockedFetchDetails.mockReturnValue(
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
      );
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      fail(new Error('network'));

      expect(await screen.findByText('Couldn’t load details for this dinner.')).toBeInTheDocument();
      expect(screen.getByText('Pasta')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand Pasta' })).toBeEnabled();
    });

    it('should expand a dinner on a past, locked week', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchPlanByStartDate).mockResolvedValue(
        plan({
          start_date: '2026-08-17',
          locked_at: '2026-08-20T12:00:00Z',
          weekly_plan_selections: [
            selection({
              id: 'old-1',
              dinner_id: 'stew',
              dinners: { ...selection({}).dinners, name: 'Stew' },
            }),
          ],
        }),
      );
      renderAt(390);

      await screen.findByText('Tacos');
      await user.click(screen.getByRole('button', { name: /previous week/i }));
      await user.click(await screen.findByRole('button', { name: 'Expand Stew' }));

      expect(await screen.findByText('Cook the stew.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should collapse everything when the week changes', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchPlanByStartDate).mockResolvedValue(null);
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Expand Tacos' }));
      expect(await screen.findByText('Cook the tacos.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /previous week/i }));
      await screen.findByText('No plan this week.');
      await user.click(screen.getByRole('button', { name: /next week/i }));

      expect(await screen.findByRole('button', { name: 'Expand Tacos' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByText('Cook the tacos.')).not.toBeInTheDocument();
    });
  });

  describe('on a desktop', () => {
    it('should open all three cards from one, and close them all from another', async () => {
      const user = userEvent.setup();
      renderAt(1280);

      await user.click(await screen.findByRole('button', { name: 'Expand Pasta' }));

      for (const name of ['tacos', 'pasta', 'curry']) {
        expect(await screen.findByText(`Cook the ${name}.`)).toBeInTheDocument();
      }
      for (const name of ['Tacos', 'Pasta', 'Curry']) {
        expect(screen.getByRole('button', { name: `Collapse ${name}` })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
      }

      await user.click(screen.getByRole('button', { name: 'Collapse Curry' }));

      expect(screen.queryByText(/^Cook the /)).not.toBeInTheDocument();
      for (const name of ['Tacos', 'Pasta', 'Curry']) {
        expect(screen.getByRole('button', { name: `Expand ${name}` })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
    });
  });

  describe('tapping the bar (intent 027)', () => {
    it('should open and close a phone row from its name, leaving the others alone', async () => {
      const user = userEvent.setup();
      renderAt(390);

      await user.click(await screen.findByText('Tacos'));

      expect(await screen.findByText('Cook the tacos.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse Tacos' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Expand Pasta' })).toHaveAttribute('aria-expanded', 'false');

      await user.click(screen.getByText('Tacos'));

      expect(screen.queryByText('Cook the tacos.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand Tacos' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('should open all three desktop cards from one card’s name, and close them again', async () => {
      const user = userEvent.setup();
      renderAt(1280);

      await user.click(await screen.findByText('Curry'));

      for (const name of ['tacos', 'pasta', 'curry']) {
        expect(await screen.findByText(`Cook the ${name}.`)).toBeInTheDocument();
      }

      await user.click(screen.getByText('Tacos'));

      expect(screen.queryByText(/^Cook the /)).not.toBeInTheDocument();
    });

    it('should leave every row collapsed when remove is tapped', async () => {
      const user = userEvent.setup();
      renderAt(390);

      await user.click(await screen.findByRole('button', { name: 'Remove Pasta' }));

      expect(vi.mocked(removeSelection)).toHaveBeenCalledTimes(1);
      for (const name of ['Tacos', 'Pasta', 'Curry']) {
        expect(screen.getByRole('button', { name: `Expand ${name}` })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
      expect(mockedFetchDetails).not.toHaveBeenCalled();
    });

    it.each([390, 1280])('should stay open when its details are tapped (%ipx)', async (width) => {
      const user = userEvent.setup();
      renderAt(width);

      await user.click(await screen.findByText('Tacos'));
      await user.click(await screen.findByText('2 cup tacos base'));
      await user.click(screen.getByText('Cook the tacos.'));

      expect(screen.getByText('Cook the tacos.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse Tacos' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('should open a past week’s dinner from its bar', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchPlanByStartDate).mockResolvedValue(
        plan({
          start_date: '2026-08-17',
          locked_at: '2026-08-20T12:00:00Z',
          weekly_plan_selections: [
            selection({
              id: 'old-1',
              dinner_id: 'stew',
              dinners: { ...selection({}).dinners, name: 'Stew' },
            }),
          ],
        }),
      );
      renderAt(390);

      await screen.findByText('Tacos');
      await user.click(screen.getByRole('button', { name: /previous week/i }));
      await user.click(await screen.findByText('Stew'));

      expect(await screen.findByText('Cook the stew.')).toBeInTheDocument();
    });

    it('should add no tab stop: only the buttons are focusable in a row', async () => {
      renderAt(390);

      const name = await screen.findByText('Tacos');
      let bar: HTMLElement | null = name;
      while (bar && !bar.contains(screen.getByRole('button', { name: 'Expand Tacos' }))) {
        bar = bar.parentElement;
      }
      expect(bar).not.toBeNull();
      expect(bar).not.toHaveAttribute('tabindex');
      expect(bar).not.toHaveAttribute('role');
    });

    it.each([390, 1280])(
      'should put expand before remove, so remove sits at the edge (%ipx)',
      async (width) => {
        renderAt(width);

        const expand = await screen.findByRole('button', { name: 'Expand Tacos' });
        const remove = screen.getByRole('button', { name: 'Remove Tacos' });

        expect(expand.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      },
    );
  });
});
