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
  fetchActiveStore,
  fetchLocations,
  fetchResolvedItems,
  renameLocation,
  reorderLocation,
} from '@/features/store-config/api';
import { theme } from '@/shared/theme';
import type { Location, ResolvedItem, Store } from '@/features/store-config/types';

vi.mock('@/features/store-config/api');

const store: Store = {
  id: 'store-1',
  household_id: 'hh-1',
  name: 'My Store',
  is_active: true,
  created_at: '2026-09-04T00:00:00Z',
};

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
    ...overrides,
  };
}

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
