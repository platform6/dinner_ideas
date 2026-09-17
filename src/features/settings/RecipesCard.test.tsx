import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/shared/theme';
import { RecipesCard } from '@/features/settings/RecipesCard';
import { fetchServingsPerDinner, updateServingsPerDinner } from '@/features/settings/api';
import { useAuth } from '@/features/auth/useAuth';

// Partial mock: the range constant is real, so the "offers exactly the database range" test is
// comparing against the same source of truth the card uses.
vi.mock('@/features/settings/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/settings/api')>()),
  fetchServingsPerDinner: vi.fn(),
  updateServingsPerDinner: vi.fn(),
}));
vi.mock('@/features/auth/useAuth');

const mockedFetch = vi.mocked(fetchServingsPerDinner);
const mockedUpdate = vi.mocked(updateServingsPerDinner);
const mockedUseAuth = vi.mocked(useAuth);

function asRole(role: 'owner' | 'member' | null) {
  mockedUseAuth.mockReturnValue({
    role,
    householdId: role ? 'hh-1' : null,
    profile: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  } as never);
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RecipesCard />
        </QueryClientProvider>
      </ChakraProvider>,
    ),
  };
}

describe('RecipesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(3);
    mockedUpdate.mockResolvedValue();
    asRole('owner');
  });

  it('shows the stored number and lets an owner change it', async () => {
    const user = userEvent.setup();
    renderCard();

    const select = await screen.findByLabelText('Servings per dinner');
    await waitFor(() => expect(select).toHaveValue('3'));

    await user.selectOptions(select, '7');
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('hh-1', 7));
  });

  it('offers exactly 1..12 — the same range as the database check', async () => {
    renderCard();

    const select = (await screen.findByLabelText('Servings per dinner')) as HTMLSelectElement;
    const values = [...select.options].map((o) => o.value);
    expect(values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  });

  it('reads a non-default stored value rather than assuming 3', async () => {
    mockedFetch.mockResolvedValue(5);
    renderCard();

    const select = await screen.findByLabelText('Servings per dinner');
    await waitFor(() => expect(select).toHaveValue('5'));
  });

  it('explains what the number is for, and that saved recipes never change (ADR-14)', async () => {
    // Checkpoint 1: "make it explain itself". The last clause is the one that matters — it is the
    // user-facing half of ADR-14, stated where the change is made.
    renderCard();

    expect(await screen.findByText(/target when you choose to scale an imported recipe/)).toBeInTheDocument();
    expect(screen.getByText(/never alters recipes you.ve already saved/)).toBeInTheDocument();
  });

  it('is its own card, not a third control about the planning week', async () => {
    renderCard();

    expect(await screen.findByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
    expect(screen.queryByText(/dinners per week/i)).not.toBeInTheDocument();
  });

  it('disables the control for a non-owner, and says so once', async () => {
    asRole('member');
    renderCard();

    const select = await screen.findByLabelText('Servings per dinner');
    expect(select).toBeDisabled();
    expect(screen.getAllByText('Ask a household owner to change this.')).toHaveLength(1);
  });

  it('keeps the stored number visible when the save fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('rls'));
    const user = userEvent.setup();
    renderCard();

    const select = await screen.findByLabelText('Servings per dinner');
    await waitFor(() => expect(select).toHaveValue('3'));
    await user.selectOptions(select, '6');

    expect(await screen.findByText(/number of servings is unchanged/)).toBeInTheDocument();
    expect(select).toHaveValue('3');
  });

  /**
   * The inverse of PlanningWeekCard's invalidation test, and deliberately so. `dinners_per_week`
   * must invalidate the weekly-plan queries because four screens derive from it. This number must
   * NOT touch any dinner, plan or shopping-list query: under ADR-14 nothing stored depends on it.
   * If this test ever has to change to invalidate dinner data, something has started treating
   * stored quantities as "for N people" — read ADR-14 before changing the test.
   */
  it('invalidates ONLY its own query — no stored dinner depends on this number (ADR-14)', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderCard();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const select = await screen.findByLabelText('Servings per dinner');
    await waitFor(() => expect(select).toHaveValue('3'));
    await user.selectOptions(select, '4');

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['household', 'servings-per-dinner'] }),
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
