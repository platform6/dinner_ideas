import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DinnerCard } from '@/features/dinners/components/DinnerCard';
import { addTagToDinner, fetchDinnerFullDetails, removeTagFromDinner } from '@/features/dinners/api';
import type { CatalogDinner, DinnerFullDetails } from '@/features/dinners/types';

vi.mock('@/features/dinners/api');

const mockedFetchDetails = vi.mocked(fetchDinnerFullDetails);
const mockedAddTag = vi.mocked(addTagToDinner);
const mockedRemoveTag = vi.mocked(removeTagFromDinner);

const dinner: CatalogDinner = {
  id: 'd1',
  name: 'Tacos',
  cuisine_type: 'Mexican',
  cook_time_minutes: 25,
  is_active: true,
  instructions: '',
  created_at: '2026-01-01T00:00:00Z',
  dinner_ingredients: [],
  tags: ['kid-friendly'],
};

const details: DinnerFullDetails = {
  dinner_steps: [{ id: 's1', dinner_id: 'd1', step_number: 1, instruction: 'Cook the meat.' }],
  dinner_ingredients: [
    { id: 'i1', dinner_id: 'd1', name: 'Tortillas', quantity: 6, unit: 'each', category: 'Bakery' },
  ],
  tags: [{ id: 't1', name: 'kid-friendly' }],
};

function renderCard(onSuppress = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DinnerCard
        dinner={dinner}
        onSuppress={onSuppress}
        isMutating={false}
        selection={{
          isSelected: false,
          selectionDisabled: false,
          isTogglingSelection: false,
          onToggleSelect: vi.fn(),
        }}
      />
    </QueryClientProvider>,
  );
}

describe('DinnerCard details section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
    mockedAddTag.mockResolvedValue(undefined);
    mockedRemoveTag.mockResolvedValue(undefined);
  });

  it('does not fetch details until expanded', async () => {
    renderCard();
    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(mockedFetchDetails).not.toHaveBeenCalled();
  });

  it('expands to show steps, ingredients, and tags on click', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(await screen.findByText('Cook the meat.')).toBeInTheDocument();
    expect(screen.getByText(/Tortillas/)).toBeInTheDocument();
    expect(mockedFetchDetails).toHaveBeenCalledWith('d1');
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');
    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.queryByText('Cook the meat.')).not.toBeInTheDocument();
  });

  it('adds a new tag', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');

    await user.type(screen.getByLabelText('New tag name'), 'spicy');
    await user.click(screen.getByRole('button', { name: '+' }));

    expect(mockedAddTag).toHaveBeenCalledWith('d1', 'spicy');
  });

  it('removes an existing tag', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');

    await user.click(screen.getByRole('button', { name: 'Remove tag kid-friendly' }));

    expect(mockedRemoveTag).toHaveBeenCalledWith('d1', 't1');
  });
});

describe('DinnerCard overflow menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
  });

  it('is not a persistent button on the card face', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /not interested/i })).not.toBeInTheDocument();
  });

  it('suppresses the dinner via the overflow menu (FR-5)', async () => {
    const user = userEvent.setup();
    const onSuppress = vi.fn();
    renderCard(onSuppress);

    await user.click(screen.getByRole('button', { name: `More actions for ${dinner.name}` }));
    await user.click(await screen.findByRole('menuitem', { name: /not interested/i }));

    expect(onSuppress).toHaveBeenCalledWith('d1');
  });
});
