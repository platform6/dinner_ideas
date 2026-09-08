import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShoppingListPage } from '@/features/shopping-list/components/ShoppingListPage';
import { fetchDinnersByIds } from '@/features/dinners/api';
import { fetchCurrentPlan } from '@/features/weekly-plan/api';
import { fetchDinnersPerWeek, fetchWeekStartDay } from '@/features/settings/api';
import {
  fetchActiveStore,
  fetchDismissals,
  fetchLocations,
  fetchResolvedItems,
  markItemReviewed,
  placeItem,
  setCategoryPlacement,
  unsetCategoryPlacement,
} from '@/features/store-config/api';
import { theme } from '@/shared/theme';
import type { DinnerWithIngredients } from '@/features/dinners/types';
import type { CurrentPlan, SelectionWithDinner } from '@/features/weekly-plan/types';

vi.mock('@/features/dinners/api');
vi.mock('@/features/weekly-plan/api');
vi.mock('@/features/store-config/api');
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
  const mockedFetchActiveStore = vi.mocked(fetchActiveStore);
  const mockedFetchResolvedItems = vi.mocked(fetchResolvedItems);
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
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    mockedFetchDinnersByIds.mockResolvedValue(threeDinners);
    // No store configured: every group falls back to alphabetical order, which is what these
    // tests assert on. The location sort itself is covered in reorder.test.ts.
    mockedFetchActiveStore.mockResolvedValue(null);
    mockedFetchResolvedItems.mockResolvedValue([]);
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

  it('copies the list and never locks — no "also lock" checkbox exists', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    expect(screen.queryByRole('checkbox', { name: /also lock/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    await waitFor(() => expect(mockedWriteText).toHaveBeenCalledWith(expect.stringContaining('onion')));
    expect(await screen.findByText(/^copied!$/i)).toBeInTheDocument();
  });

  it('shows a non-blocking "not locked in yet" note linking to This Week for an unlocked plan', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    expect(screen.getByText(/this week isn’t locked in yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lock it on this week/i })).toHaveAttribute('href', '/plan');

    // The note never blocks copying.
    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));
    expect(await screen.findByText(/^copied!$/i)).toBeInTheDocument();
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

  it('hides the "not locked in yet" note once the plan is locked; copy still shows plain "Copied!"', async () => {
    mockedFetchCurrentPlan.mockResolvedValue(
      plan({ locked_at: '2026-08-27T12:00:00Z', weekly_plan_selections: threeSelections }),
    );
    const user = setupUser();
    renderPage();

    await screen.findByText('Produce');
    expect(screen.queryByText(/not locked in yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /also lock/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy shopping list/i }));

    await waitFor(() => expect(mockedWriteText).toHaveBeenCalled());
    expect(await screen.findByText(/^copied!$/i)).toBeInTheDocument();
  });
});

/**
 * Bolt 058 — moving a grocery from the shopping list.
 *
 * A SEPARATE top-level block with its own fixtures and render helper, deliberately: the suite above
 * is the evidence that this unit did not degrade checking items off, and that evidence is only
 * worth something if not one line of it was adjusted to accommodate the feature.
 *
 * It also has a gap this block exists to close. Those tests mock `fetchActiveStore` to null, so the
 * move affordance never renders in any of them — they pass because the feature is ABSENT. The
 * question story 002 actually asks is whether checking off still works with the affordance present,
 * so these fixtures configure a real store and then check items off.
 */
describe('ShoppingListPage — moving an item (intent 013, unit 003)', () => {
  const store = {
    id: 'store-1',
    household_id: 'hh-test',
    name: 'Corner Market',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  function location(id: string, name: string, position: number) {
    return {
      id,
      household_id: 'hh-test',
      store_id: 'store-1',
      name,
      type: 'aisle',
      position,
      created_at: '2026-01-01T00:00:00Z',
    };
  }

  const stops = [location('loc-1', 'Entrance', 1), location('loc-2', 'Back wall', 2)];

  /** Two categories, so a move can visibly reorder the list. */
  function twoCategoryDinner(id: string): DinnerWithIngredients {
    return {
      id,
      household_id: 'hh-test',
      name: `Dinner ${id}`,
      cuisine_type: 'Italian',
      cook_time_minutes: 30,
      is_active: true,
      instructions: '',
      created_at: '2026-01-01T00:00:00Z',
      dinner_ingredients: [
        { id: `${id}-a`, dinner_id: id, name: 'onion', unit: 'each', quantity: 1, category: 'Produce' },
        { id: `${id}-b`, dinner_id: id, name: 'cheddar', unit: 'g', quantity: 50, category: 'Dairy' },
      ],
    };
  }

  function resolvedItem(
    name: string,
    category: string,
    locationId: string | null,
    position: number | null,
    state: 'placed' | 'inherited' = 'inherited',
  ) {
    return {
      itemId: `item-${name}`,
      itemName: name,
      nameKey: name.toLowerCase(),
      category,
      state,
      locationId,
      locationName: locationId === 'loc-1' ? 'Entrance' : locationId === 'loc-2' ? 'Back wall' : null,
      locationPosition: position,
      viaCategory: state === 'inherited' ? category : null,
      reviewedAt: '2026-09-05T00:00:00Z',
    };
  }

  // Produce at the entrance, Dairy at the back → onion's group sorts first.
  const beforeMove = [
    resolvedItem('onion', 'Produce', 'loc-1', 1),
    resolvedItem('cheddar', 'Dairy', 'loc-2', 2),
  ];
  // After moving cheddar to the entrance its group takes position 1 and ties; `Array.sort` is
  // stable and buildShoppingList emits alphabetically, so Dairy lands first.
  const afterMove = [
    resolvedItem('onion', 'Produce', 'loc-1', 1),
    resolvedItem('cheddar', 'Dairy', 'loc-1', 1, 'placed'),
  ];

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

  /** Item names in the order the list renders them — the assertion for "did it re-sort?". */
  function listedItems() {
    return screen.getAllByText(/^(onion|cheddar)$/).map((el) => el.textContent);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    vi.mocked(fetchDinnersByIds).mockResolvedValue([
      twoCategoryDinner('1'),
      twoCategoryDinner('2'),
      twoCategoryDinner('3'),
    ]);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    vi.mocked(fetchActiveStore).mockResolvedValue(store);
    vi.mocked(fetchLocations).mockResolvedValue(stops);
    vi.mocked(fetchResolvedItems).mockResolvedValue(beforeMove);
    vi.mocked(fetchDismissals).mockResolvedValue([]);
    vi.mocked(placeItem).mockResolvedValue(undefined);
    vi.mocked(markItemReviewed).mockResolvedValue(undefined);
  });

  it('opens the same assign sheet the store page uses', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move cheddar' }));

    // The sheet's own vocabulary — same component, so the same copy and the same stop list.
    expect(await screen.findByText(/where do you find it/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put cheddar in Entrance' })).toBeInTheDocument();
    expect(screen.getByText(/following Dairy to Back wall/i)).toBeInTheDocument();
  });

  it('writes an item placement and marks it reviewed — never a category placement', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move cheddar' }));
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    await waitFor(() => expect(placeItem).toHaveBeenCalledWith(store, 'item-cheddar', 'loc-1'));
    await waitFor(() => expect(markItemReviewed).toHaveBeenCalledWith('item-cheddar'));

    // The point of the unit: from this surface a move says "this thing is here", never
    // "everything like it is here".
    expect(setCategoryPlacement).not.toHaveBeenCalled();
    expect(unsetCategoryPlacement).not.toHaveBeenCalled();
  });

  it('re-sorts the list to the new walking-path order without a reload', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValueOnce(beforeMove).mockResolvedValue(afterMove);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move cheddar' });
    expect(listedItems()).toEqual(['onion', 'cheddar']);

    await user.click(screen.getByRole('button', { name: 'Move cheddar' }));
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    await waitFor(() => expect(listedItems()).toEqual(['cheddar', 'onion']));
  });

  it('preserves check state across the re-sort', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValueOnce(beforeMove).mockResolvedValue(afterMove);
    const user = userEvent.setup();
    renderPage();

    // Check onion off first — it is the item NOT being moved, so nothing about the move should
    // touch it, and it is the one a positional key would lose.
    await user.click(await screen.findByRole('checkbox', { name: /onion/i }));
    expect(screen.getByRole('checkbox', { name: /onion/i })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Move cheddar' }));
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    await waitFor(() => expect(listedItems()).toEqual(['cheddar', 'onion']));
    expect(screen.getByRole('checkbox', { name: /onion/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /cheddar/i })).not.toBeChecked();
  });

  it('leaves the list unchanged and says so when the write fails', async () => {
    vi.mocked(placeItem).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move cheddar' });
    expect(listedItems()).toEqual(['onion', 'cheddar']);

    await user.click(screen.getByRole('button', { name: 'Move cheddar' }));
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    expect(await screen.findByText(/couldn.t move cheddar/i)).toBeInTheDocument();
    // No optimistic reorder that misrepresents what was saved.
    expect(listedItems()).toEqual(['onion', 'cheddar']);
    expect(markItemReviewed).not.toHaveBeenCalled();
  });

  it('offers "take it off the path" only for an item that was explicitly placed', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValue([
      resolvedItem('onion', 'Produce', 'loc-1', 1),
      resolvedItem('cheddar', 'Dairy', 'loc-2', 2, 'placed'),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move cheddar' }));
    expect(await screen.findByRole('button', { name: /take it off the path/i })).toBeInTheDocument();
  });

  it('offers no move affordance when there is no walking path to move to', async () => {
    vi.mocked(fetchLocations).mockResolvedValue([]);
    renderPage();

    await screen.findByText('onion');
    expect(screen.queryByRole('button', { name: 'Move cheddar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move onion' })).not.toBeInTheDocument();
  });

  /**
   * The gap the suite above cannot cover, and the real answer to story 002: with the affordance
   * PRESENT on every row, is checking things off still the thing this page does best?
   */
  it('still checks items off normally with the move affordance present', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move cheddar' });

    const onion = screen.getByRole('checkbox', { name: /onion/i });
    await user.click(onion);
    expect(onion).toBeChecked();

    const cheddar = screen.getByRole('checkbox', { name: /cheddar/i });
    await user.click(cheddar);
    expect(cheddar).toBeChecked();

    // Unchecking still works, and neither toggle opened the sheet — the move button is a sibling
    // of the checkbox, not a child of its label, so a tap on the row cannot reach it.
    await user.click(onion);
    expect(onion).not.toBeChecked();
    expect(screen.queryByText(/where do you find it/i)).not.toBeInTheDocument();
    expect(placeItem).not.toHaveBeenCalled();
  });

  /**
   * Scroll anchoring, as far as jsdom can honestly go.
   *
   * jsdom has no layout engine — every `getBoundingClientRect` is zero — so the moved row's
   * position is SIMULATED here. What this proves is the logic: that the row's offset is measured
   * before the write, measured again after the new order paints, and the difference handed to
   * `scrollBy`. What it cannot prove is that real browser layout lands where we expect, which is
   * why a human still checks this one on a phone.
   */
  it('scrolls to keep the moved row where it was when the list re-sorts', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValueOnce(beforeMove).mockResolvedValue(afterMove);

    const scrollBy = vi.fn();
    Object.defineProperty(window, 'scrollBy', { value: scrollBy, configurable: true, writable: true });

    // The row sits 400px down a scrolled list; after the re-sort it has risen to 120px.
    let cheddarRowTop = 400;
    const realRect = Element.prototype.getBoundingClientRect;
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute('data-testrow') === 'cheddar') {
        return { ...realRect.call(this), top: cheddarRowTop } as DOMRect;
      }
      return realRect.call(this);
    });

    // The move succeeds and the list re-lays-out — the row's new offset.
    vi.mocked(placeItem).mockImplementation(async () => {
      cheddarRowTop = 120;
    });

    const user = userEvent.setup();
    renderPage();

    const moveButton = await screen.findByRole('button', { name: 'Move cheddar' });
    // Tag the row the component holds a ref to, so the stub above applies to that element only.
    moveButton.parentElement?.setAttribute('data-testrow', 'cheddar');

    await user.click(moveButton);
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    await waitFor(() => expect(listedItems()).toEqual(['cheddar', 'onion']));
    // Rose by 280px, so the page scrolls up by 280 to leave it under the same thumb.
    expect(scrollBy).toHaveBeenCalledWith(0, -280);

    rectSpy.mockRestore();
  });

  it('does not scroll when a move leaves the order alone', async () => {
    const scrollBy = vi.fn();
    Object.defineProperty(window, 'scrollBy', { value: scrollBy, configurable: true, writable: true });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move cheddar' }));
    await user.click(await screen.findByRole('button', { name: 'Put cheddar in Entrance' }));

    await waitFor(() => expect(placeItem).toHaveBeenCalled());
    // Nothing moved, so nothing to correct — and, importantly, the anchor is cleared rather than
    // left to misapply itself to an unrelated re-sort later.
    expect(scrollBy).not.toHaveBeenCalled();
  });
});

/** Intent 015 (bolt 065): the gate and its copy follow households.dinners_per_week. */
describe('ShoppingListPage — dinners per week (intent 015)', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWeekStartDay).mockResolvedValue(0);
    vi.mocked(fetchDinnersByIds).mockResolvedValue(threeDinners);
    vi.mocked(fetchActiveStore).mockResolvedValue(null);
    vi.mocked(fetchResolvedItems).mockResolvedValue([]);
  });

  it('gates at the household number, not at three', async () => {
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(5);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    // three picks is no longer "full" when the household plans five
    expect(await screen.findByText(/pick 5 dinners/i)).toBeInTheDocument();
  });

  it('says "1 dinner", not "1 dinners", when the household plans one', async () => {
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(1);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: [] }));
    renderPage();

    expect(await screen.findByText(/pick 1 dinner\b/i)).toBeInTheDocument();
    expect(screen.queryByText(/pick 1 dinners/i)).not.toBeInTheDocument();
  });

  it('shows the list once the household number is met', async () => {
    vi.mocked(fetchDinnersPerWeek).mockResolvedValue(3);
    vi.mocked(fetchCurrentPlan).mockResolvedValue(plan({ weekly_plan_selections: threeSelections }));
    renderPage();

    expect(await screen.findByText('Produce')).toBeInTheDocument();
  });
});
