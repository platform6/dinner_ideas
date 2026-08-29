import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StoreConfigPage } from '@/features/store-config/components/StoreConfigPage';
import {
  addRow,
  assignCategory,
  deleteRow,
  fetchAssignments,
  fetchRows,
  reorderRow,
} from '@/features/store-config/api';
import { fetchDistinctIngredientCategories } from '@/features/dinners/api';
import type { GroceryStoreRow } from '@/features/store-config/types';

vi.mock('@/features/store-config/api');
vi.mock('@/features/dinners/api');

const mockedFetchRows = vi.mocked(fetchRows);
const mockedFetchAssignments = vi.mocked(fetchAssignments);
const mockedFetchCategories = vi.mocked(fetchDistinctIngredientCategories);
const mockedAddRow = vi.mocked(addRow);
const mockedReorderRow = vi.mocked(reorderRow);
const mockedDeleteRow = vi.mocked(deleteRow);
const mockedAssignCategory = vi.mocked(assignCategory);

const rows: GroceryStoreRow[] = [
  { id: 'r1', household_id: 'hh-test', name: 'Dairy', position: 1 },
  { id: 'r2', household_id: 'hh-test', name: 'Produce', position: 2 },
  { id: 'r3', household_id: 'hh-test', name: 'Bakery', position: 3 },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StoreConfigPage />
    </QueryClientProvider>,
  );
}

describe('StoreConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchRows.mockResolvedValue(rows);
    mockedFetchAssignments.mockResolvedValue([]);
    // Deliberately distinct from the row names above, so text queries for a row (e.g. "Dairy")
    // never collide with a category-select option of the same name.
    mockedFetchCategories.mockResolvedValue(['Meat', 'Pantry']);
    mockedAddRow.mockResolvedValue({ id: 'r4', household_id: 'hh-test', name: 'New Row', position: 4 });
    mockedReorderRow.mockResolvedValue(rows);
    mockedDeleteRow.mockResolvedValue(undefined);
    mockedAssignCategory.mockResolvedValue(undefined);
  });

  it('lists rows in order and distinct categories', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Move Dairy up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Produce up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Bakery up' })).toBeInTheDocument();
    expect(screen.getByLabelText('Row for Meat')).toBeInTheDocument();
    expect(screen.getByLabelText('Row for Pantry')).toBeInTheDocument();
  });

  it('adds a new row', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move Dairy up' });
    await user.type(screen.getByLabelText('New row name'), 'Frozen');
    await user.click(screen.getByRole('button', { name: 'Add row' }));

    expect(mockedAddRow).toHaveBeenCalledWith('Frozen', 3);
  });

  it("moves a row down to the next row's position", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move Dairy up' });
    await user.click(screen.getByRole('button', { name: 'Move Dairy down' }));

    expect(mockedReorderRow).toHaveBeenCalledWith('r1', 2);
  });

  it('disables moving the first row up and the last row down', async () => {
    renderPage();

    await screen.findByRole('button', { name: 'Move Dairy up' });
    expect(screen.getByRole('button', { name: 'Move Dairy up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Bakery down' })).toBeDisabled();
  });

  it('deletes a row', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move Dairy up' });
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => expect(mockedDeleteRow).toHaveBeenCalledWith('r1'));
  });

  it('assigns a category to a row', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: 'Move Dairy up' });
    await user.selectOptions(screen.getByLabelText('Row for Meat'), 'r1');

    expect(mockedAssignCategory).toHaveBeenCalledWith('Meat', 'r1');
  });
});
