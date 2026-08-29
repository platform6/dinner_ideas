import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SuppressedPage } from '@/features/dinners/components/SuppressedPage';
import { fetchActiveDinners, fetchSuppressedDinners, setDinnerActive } from '@/features/dinners/api';
import type { CatalogDinner } from '@/features/dinners/types';

vi.mock('@/features/dinners/api');

function dinner(overrides: Partial<CatalogDinner>): CatalogDinner {
  return {
    id: 'id',
    household_id: 'hh-test',
    name: 'Dinner',
    cuisine_type: 'Italian',
    cook_time_minutes: 30,
    is_active: false,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [],
    tags: [],
    ...overrides,
  };
}

describe('SuppressedPage', () => {
  const mockedFetchSuppressed = vi.mocked(fetchSuppressedDinners);
  const mockedFetchActive = vi.mocked(fetchActiveDinners);
  const mockedSetActive = vi.mocked(setDinnerActive);

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <SuppressedPage />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSetActive.mockResolvedValue(undefined);
  });

  it('lists suppressed dinners with a "Bring back" action', async () => {
    mockedFetchSuppressed.mockResolvedValue([dinner({ id: '2', name: 'Old Casserole' })]);
    mockedFetchActive.mockResolvedValue([dinner({ id: '1', name: 'Tacos', is_active: true })]);
    renderPage();

    expect(await screen.findByText('Old Casserole')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bring back/i })).toBeInTheDocument();
  });

  it('un-suppresses a dinner when "Bring back" is clicked', async () => {
    const user = userEvent.setup();
    mockedFetchSuppressed.mockResolvedValue([dinner({ id: '2', name: 'Old Casserole' })]);
    mockedFetchActive.mockResolvedValue([]);
    renderPage();

    await screen.findByText('Old Casserole');
    await user.click(screen.getByRole('button', { name: /bring back/i }));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledWith('2', true));
  });

  it('shows an empty state when nothing is suppressed', async () => {
    mockedFetchSuppressed.mockResolvedValue([]);
    mockedFetchActive.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/nothing hidden yet/i)).toBeInTheDocument();
  });

  it('shows a live count of dinners still in the catalog', async () => {
    mockedFetchSuppressed.mockResolvedValue([dinner({ id: '2', name: 'Old Casserole' })]);
    mockedFetchActive.mockResolvedValue([
      dinner({ id: '1', name: 'Tacos', is_active: true }),
      dinner({ id: '3', name: 'Pasta', is_active: true }),
    ]);
    renderPage();

    expect(await screen.findByText(/2 dinners still in the catalog/i)).toBeInTheDocument();
  });
});
