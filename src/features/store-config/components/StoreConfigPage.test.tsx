import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StoreConfigPage } from '@/features/store-config/components/StoreConfigPage';
import {
  addLocation,
  countPlacementsAtLocation,
  deleteLocation,
  dismissSuggestion,
  fetchActiveStore,
  fetchCategoryPlacements,
  fetchDismissals,
  fetchInRecipeNameKeys,
  fetchLocations,
  fetchResolvedItems,
  placeItem,
  renameLocation,
  reorderLocation,
  setCategoryPlacement,
  unplaceItem,
  unsetCategoryPlacement,
} from '@/features/store-config/api';
import { theme } from '@/shared/theme';
import type { CategoryPlacementView, Location, ResolvedItem, Store } from '@/features/store-config/types';

vi.mock('@/features/store-config/api');

const store: Store = {
  id: 'store-1',
  household_id: 'hh-1',
  name: 'My Store',
  is_active: true,
  created_at: '2026-09-04T00:00:00Z',
};

/**
 * Fixtures default to REVIEWED because that is what production looks like after bolt 055's
 * backfill: every item that predates the feature is marked, and only newly registered ones
 * are null. A fixture defaulting to unreviewed would describe a state these suites never meet.
 */
const REVIEWED = '2026-09-05T00:00:00Z';

function location(overrides: Partial<Location> & Pick<Location, 'id' | 'name' | 'position'>): Location {
  return {
    household_id: 'hh-1',
    store_id: 'store-1',
    type: 'section',
    created_at: '2026-09-04T00:00:00Z',
    ...overrides,
  };
}

function resolved(
  overrides: Partial<ResolvedItem> & Pick<ResolvedItem, 'itemId' | 'itemName'>,
): ResolvedItem {
  return {
    nameKey: overrides.itemName.toLowerCase(),
    category: 'Produce',
    state: 'inherited',
    locationId: null,
    locationName: null,
    locationPosition: null,
    viaCategory: null,
    reviewedAt: REVIEWED,
    ...overrides,
  };
}

/**
 * All five categories, always — an unplaced one is a row with a null stop, not an absent row.
 * `Pantry` is left unplaced on purpose so at least one test sees the state that used to be
 * unrepresentable in this fixture.
 */
const categoryPlacements: CategoryPlacementView[] = [
  { category: 'Produce', locationId: 'loc-1', locationName: 'Produce', locationPosition: 1 },
  { category: 'Protein', locationId: 'loc-2', locationName: 'Aisle 3', locationPosition: 2 },
  { category: 'Dairy', locationId: 'loc-1', locationName: 'Produce', locationPosition: 1 },
  { category: 'Grains', locationId: 'loc-3', locationName: 'Bakery', locationPosition: 3 },
  { category: 'Pantry', locationId: null, locationName: null, locationPosition: null },
];

const path: Location[] = [
  location({ id: 'loc-1', name: 'Produce', position: 1 }),
  location({ id: 'loc-2', name: 'Aisle 3', position: 2, type: 'aisle' }),
  location({ id: 'loc-3', name: 'Bakery', position: 3 }),
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ChakraProvider theme={theme}>
        <StoreConfigPage />
      </ChakraProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Vitest is not configured with `clearMocks`, so call counts would otherwise leak between
  // tests in this file — and several assertions here are about a mutation NOT being called.
  vi.clearAllMocks();
  vi.mocked(fetchActiveStore).mockResolvedValue(store);
  vi.mocked(fetchLocations).mockResolvedValue(path);
  vi.mocked(fetchResolvedItems).mockResolvedValue([
    resolved({ itemId: 'i1', itemName: 'kale', locationId: 'loc-1' }),
    resolved({ itemId: 'i2', itemName: 'apples', locationId: 'loc-1' }),
    resolved({ itemId: 'i3', itemName: 'sourdough', locationId: 'loc-3' }),
    resolved({ itemId: 'i4', itemName: 'cheddar', locationId: null, state: 'unassigned' }),
  ]);
  vi.mocked(reorderLocation).mockResolvedValue(path);
  vi.mocked(addLocation).mockResolvedValue(location({ id: 'loc-4', name: 'Aisle 9', position: 4 }));
  vi.mocked(renameLocation).mockResolvedValue(path[0]);
  vi.mocked(deleteLocation).mockResolvedValue(undefined);
  vi.mocked(countPlacementsAtLocation).mockResolvedValue(0);
  vi.mocked(fetchDismissals).mockResolvedValue([]);
  vi.mocked(fetchInRecipeNameKeys).mockResolvedValue(new Set(['kale', 'apples', 'cheddar']));
  vi.mocked(placeItem).mockResolvedValue(undefined);
  vi.mocked(unplaceItem).mockResolvedValue(undefined);
  vi.mocked(dismissSuggestion).mockResolvedValue(undefined);
  vi.mocked(fetchCategoryPlacements).mockResolvedValue(categoryPlacements);
  vi.mocked(setCategoryPlacement).mockResolvedValue(undefined);
  vi.mocked(unsetCategoryPlacement).mockResolvedValue(undefined);
});

describe('StoreConfigPage — the walking path', () => {
  it('renders one ordered list of stops, not two panels', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /walking path/i })).toBeInTheDocument();
    for (const name of ['Produce', 'Aisle 3', 'Bakery']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    // The retired two-panel layout is gone: no per-category row selector remains.
    expect(screen.queryByText(/category assignments/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('previews the items at each stop, and says so plainly when a stop is empty', async () => {
    renderPage();

    expect(await screen.findByText(/apples, kale/i)).toBeInTheDocument();
    expect(screen.getByText('sourdough')).toBeInTheDocument();
    // Aisle 3 has nothing pointing at it — a statement, not a prompt.
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('never shows an unassigned item against a stop', async () => {
    renderPage();

    await screen.findByText(/apples, kale/i);
    // "cheddar" resolves to no location, so it belongs to bolt 053's section, not to a row.
    expect(screen.queryByText(/cheddar/i)).not.toBeInTheDocument();
  });

  it('disables the arrows at the ends of the list so the row geometry stays stable', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /move produce earlier/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move produce later/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /move bakery later/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move bakery earlier/i })).toBeEnabled();
  });

  it('reorders through the RPC using the neighbour position, and announces the result', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /move bakery earlier/i }));

    await waitFor(() => expect(reorderLocation).toHaveBeenCalledWith('loc-3', 2));
    expect(await screen.findByText('Bakery moved to position 2')).toBeInTheDocument();
  });

  it('appends a new stop at the end of the path', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /add an aisle or section/i }));
    await user.type(screen.getByRole('textbox', { name: /name of the new stop/i }), 'Aisle 9');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(addLocation).toHaveBeenCalledWith(store, 'Aisle 9', 4));
  });

  it('renames in place, re-deriving the type from the new name', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename bakery/i }));
    const field = screen.getByRole('textbox', { name: /rename bakery/i });
    await user.clear(field);
    await user.type(field, 'Aisle 6');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(renameLocation).toHaveBeenCalledWith('loc-3', 'Aisle 6'));
  });
});

describe('StoreConfigPage — removing a stop', () => {
  it('deletes an empty stop immediately, with no confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(countPlacementsAtLocation).mockResolvedValue(0);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename aisle 3/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(deleteLocation).toHaveBeenCalledWith('loc-2'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('states the count and the consequence before removing a stop that has groceries', async () => {
    const user = userEvent.setup();
    vi.mocked(countPlacementsAtLocation).mockResolvedValue(6);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename produce/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /remove produce\?/i });
    expect(dialog).toHaveTextContent(/6 groceries point here/i);
    expect(dialog).toHaveTextContent(/fall back to their category/i);
    expect(dialog).toHaveTextContent(/nothing is deleted/i);
    expect(deleteLocation).not.toHaveBeenCalled();
  });

  it('offers exactly two actions, and "Keep it" changes nothing', async () => {
    const user = userEvent.setup();
    vi.mocked(countPlacementsAtLocation).mockResolvedValue(2);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename produce/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(screen.getByRole('button', { name: /keep it/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /keep it/i }));

    expect(dialog).not.toBeInTheDocument();
    expect(deleteLocation).not.toHaveBeenCalled();
  });

  it('deletes once the confirm is accepted', async () => {
    const user = userEvent.setup();
    vi.mocked(countPlacementsAtLocation).mockResolvedValue(3);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename produce/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    await screen.findByRole('alertdialog');
    // The confirm's own "Remove" — the filled heart.500 button.
    await user.click(screen.getAllByRole('button', { name: /^remove$/i }).at(-1) as HTMLElement);

    await waitFor(() => expect(deleteLocation).toHaveBeenCalledWith('loc-1'));
  });

  it('warns for a stop holding only a category default, not just explicit placements', async () => {
    const user = userEvent.setup();
    // Aisle 3 shows "Nothing here yet" (no items resolve to it) but still holds a category
    // placement — the count comes from the database, not from the visible item list.
    vi.mocked(countPlacementsAtLocation).mockResolvedValue(1);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /rename aisle 3/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /remove aisle 3\?/i });
    expect(dialog).toHaveTextContent(/1 grocery points here/i);
  });
});

describe('StoreConfigPage — first run and desktop', () => {
  it('shows a calm starting point when no stops are configured', async () => {
    vi.mocked(fetchLocations).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Start where you start')).toBeInTheDocument();
    expect(screen.getByText(/add the first place you walk into/i)).toBeInTheDocument();
    // The line that matters most: it says nothing is broken while the path is empty.
    expect(screen.getByText('Until then, lists stay in alphabetical order.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add the first stop/i })).toBeInTheDocument();
  });

  it('adds the first stop straight from the first-run panel', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchLocations).mockResolvedValue([]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /add the first stop/i }));

    await waitFor(() => expect(addLocation).toHaveBeenCalledWith(store, 'Produce', 1));
  });

  it('hides the unassigned section at first run — nothing to be off a path that does not exist', async () => {
    vi.mocked(fetchLocations).mockResolvedValue([]);
    renderPage();

    await screen.findByText('Start where you start');
    expect(screen.queryByText('Not on the path yet')).not.toBeInTheDocument();
  });

  it('shows the active store as a read-only chip beside the title', async () => {
    renderPage();

    await screen.findByRole('heading', { name: /walking path/i });
    expect(screen.getByText('My Store')).toBeInTheDocument();
    // v1 has no selector — the chip is a label, not a control.
    expect(screen.queryByRole('button', { name: /my store/i })).not.toBeInTheDocument();
  });

  it('stays a single column — no second panel at any width', async () => {
    renderPage();

    await screen.findByRole('heading', { name: /walking path/i });
    // The retired layout's second panel was a category-per-row selector grid.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText(/category assignments/i)).not.toBeInTheDocument();
  });
});

describe('StoreConfigPage — placing an item', () => {
  it('opens the assign flow from a placement pill on an expanded stop', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Produce'));
    await user.click(screen.getByRole('button', { name: /where do you find apples/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'apples' })).toBeInTheDocument();
  });

  it('writes the placement when a spot is picked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Produce'));
    await user.click(screen.getByRole('button', { name: /where do you find apples/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /put apples in bakery/i }));

    await waitFor(() => expect(placeItem).toHaveBeenCalledWith(store, 'i2', 'loc-3'));
  });
});

/**
 * The regression suite for intent 013's founding defect.
 *
 * Intent 010 shipped 290 passing tests over a feature nobody could reach, because its fixtures
 * built `unassigned` items directly — a state the data model cannot produce, since every item
 * inherits a stop from its category. These cases work from the distribution production actually
 * has: everything `inherited`, nothing unassigned. If placement ever becomes unreachable again,
 * they fail.
 */
describe('StoreConfigPage — reaching every grocery (intent 013)', () => {
  const allInherited: ResolvedItem[] = [
    resolved({
      itemId: 'g1',
      itemName: 'whole wheat spaghetti',
      locationId: 'loc-3',
      state: 'inherited',
      locationName: 'Bakery',
      viaCategory: 'Grains',
    }),
    resolved({
      itemId: 'g2',
      itemName: 'basmati rice',
      locationId: 'loc-3',
      state: 'inherited',
      locationName: 'Bakery',
      viaCategory: 'Grains',
    }),
    resolved({
      itemId: 'g3',
      itemName: 'kale',
      locationId: 'loc-1',
      state: 'inherited',
      locationName: 'Produce',
      viaCategory: 'Produce',
    }),
  ];

  it('finds an INHERITED item by name and opens the move flow — the thing that was impossible', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValue(allInherited);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /All groceries/i }));
    await user.type(screen.getByLabelText('Search groceries'), 'spag');

    // Present despite being `inherited` — the old section only listed `unassigned`, so this
    // search returned nothing on production.
    expect(await screen.findByText('whole wheat spaghetti')).toBeInTheDocument();
    expect(screen.queryByText('basmati rice')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move whole wheat spaghetti' }));
    expect(await screen.findByText('Where do you find it')).toBeInTheDocument();
  });

  it('says HOW each item got its stop, so the user knows which lever to pull', async () => {
    vi.mocked(fetchResolvedItems).mockResolvedValue([
      ...allInherited,
      resolved({
        itemId: 'g4',
        itemName: 'butter',
        locationId: 'loc-2',
        state: 'placed',
        locationName: 'Aisle 3',
      }),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /All groceries/i }));

    // Two Grains items share the inherited line; the placed one is unique.
    expect(await screen.findAllByText('Bakery · follows Grains')).toHaveLength(2);
    expect(screen.getByText('Aisle 3 · you chose this')).toBeInTheDocument();
  });

  it('lists every grocery, with no cap and no search required', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      resolved({
        itemId: `m${i}`,
        itemName: `item ${String(i).padStart(2, '0')}`,
        locationId: 'loc-1',
        state: 'inherited',
        locationName: 'Produce',
        viaCategory: 'Produce',
      }),
    );
    vi.mocked(fetchResolvedItems).mockResolvedValue(many);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /All groceries/i }));

    // All twelve, including the last — a capped list would stop short.
    expect(await screen.findByText('item 00')).toBeInTheDocument();
    expect(screen.getByText('item 11')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Move item / })).toHaveLength(12);
  });
});

describe('StoreConfigPage — moving a category (intent 013)', () => {
  it('lists all five categories, including one sitting nowhere', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Where each kind of thing lives/i }));

    // Asserted through each category's Move button rather than its bare name: "Produce" is both
    // a stop on the path and a category, so a text query would match either and prove neither.
    for (const name of ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry']) {
      expect(await screen.findByRole('button', { name: `Move ${name}` })).toBeInTheDocument();
    }
    // The unplaced one must still be listed, or it could never be placed.
    expect(screen.getByText('Nowhere yet')).toBeInTheDocument();
  });

  it('writes the category placement when a stop is picked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Where each kind of thing lives/i }));
    await user.click(screen.getByRole('button', { name: 'Move Pantry' }));
    await user.click(screen.getByRole('button', { name: 'Put Pantry in Bakery' }));

    await waitFor(() => {
      expect(setCategoryPlacement).toHaveBeenCalledWith(store, 'Pantry', 'loc-3');
    });
  });

  it('offers "take it off the path" only for a category that HAS a stop', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Where each kind of thing lives/i }));

    // Pantry sits nowhere — nothing to remove.
    await user.click(screen.getByRole('button', { name: 'Move Pantry' }));
    expect(screen.queryByRole('button', { name: /Take Pantry off the path/i })).not.toBeInTheDocument();

    // Grains sits at Bakery — removable.
    await user.click(screen.getByRole('button', { name: 'Move Grains' }));
    await user.click(screen.getByRole('button', { name: /Take Grains off the path/i }));

    await waitFor(() => {
      expect(unsetCategoryPlacement).toHaveBeenCalledWith('store-1', 'Grains');
    });
  });
});

describe('StoreConfigPage — a stop lists what it actually holds (intent 013)', () => {
  it('shows EVERY item at a stop, past the four the old cap allowed', async () => {
    // Nine at one stop. Under EXPANDED_ITEM_CAP = 4 the last five were unreachable, and the
    // pill beside each was one of only two ways into the assign flow — which is how ~100 of
    // 121 groceries ended up unplaceable in production.
    const nine = Array.from({ length: 9 }, (_, i) =>
      resolved({
        itemId: `p${i}`,
        itemName: `produce ${String(i).padStart(2, '0')}`,
        locationId: 'loc-1',
        state: 'inherited',
        locationName: 'Produce',
        viaCategory: 'Produce',
      }),
    );
    vi.mocked(fetchResolvedItems).mockResolvedValue(nine);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Produce'));

    // The fifth and ninth are the ones the cap used to swallow.
    expect(await screen.findByText('produce 04')).toBeInTheDocument();
    expect(screen.getByText('produce 08')).toBeInTheDocument();
    expect(screen.queryByText(/\+ \d+ more/)).not.toBeInTheDocument();
  });

  it('the collapsed count equals the true total, not the number rendered', async () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      resolved({
        itemId: `p${i}`,
        itemName: `produce ${String(i).padStart(2, '0')}`,
        locationId: 'loc-1',
        state: 'inherited',
        locationName: 'Produce',
        viaCategory: 'Produce',
      }),
    );
    vi.mocked(fetchResolvedItems).mockResolvedValue(nine);
    renderPage();

    // Collapsed: the count beside the row is the whole truth even while the preview abbreviates.
    expect(await screen.findByText('9')).toBeInTheDocument();
  });
});

describe('StoreConfigPage — a stop shows the rule behind its items (intent 013)', () => {
  it('lists a placed category as an entry distinct from the items', async () => {
    const user = userEvent.setup();
    renderPage();

    // Produce and Dairy both point at loc-1 in the fixture.
    await user.click(await screen.findByText('Produce'));

    expect(await screen.findByText('Everything in Produce')).toBeInTheDocument();
    expect(screen.getByText('Everything in Dairy')).toBeInTheDocument();
    // Distinct from the items sitting there, which keep their own pill.
    expect(screen.getByText('kale')).toBeInTheDocument();
  });

  it('"Move all" opens that category\'s picker, so the affordance leads somewhere', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Produce'));
    await user.click(screen.getByRole('button', { name: 'Move the Dairy category' }));

    // The category section expands with Dairy's stop picker already open.
    expect(await screen.findByRole('button', { name: 'Put Dairy in Bakery' })).toBeInTheDocument();
  });
});
