import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/shared/theme';
import { PlanningWeekCard } from '@/features/settings/PlanningWeekCard';
import {
  fetchDinnersPerWeek,
  fetchWeekStartDay,
  updateDinnersPerWeek,
  updateWeekStartDay,
} from '@/features/settings/api';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/settings/api');
vi.mock('@/features/auth/useAuth');

const mockedFetch = vi.mocked(fetchWeekStartDay);
const mockedUpdate = vi.mocked(updateWeekStartDay);
const mockedFetchPlanSize = vi.mocked(fetchDinnersPerWeek);
const mockedUpdatePlanSize = vi.mocked(updateDinnersPerWeek);
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
          <PlanningWeekCard />
        </QueryClientProvider>
      </ChakraProvider>,
    ),
  };
}

describe('PlanningWeekCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(0);
    mockedUpdate.mockResolvedValue();
    // Intent 015 put a second setting in this card. Without a default the query resolves
    // undefined and React Query warns on every existing test.
    mockedFetchPlanSize.mockResolvedValue(3);
    mockedUpdatePlanSize.mockResolvedValue();
    asRole('owner');
  });

  it('shows the loaded weekday and lets an owner change it', async () => {
    mockedFetch.mockResolvedValue(3); // Wednesday
    const user = userEvent.setup();
    renderCard();

    const select = (await screen.findByLabelText('Week starts on')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('3'));

    await user.selectOptions(select, 'Saturday');

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('hh-1', 6));
  });

  it('disables the control and points at an owner for a non-owner member', async () => {
    asRole('member');
    renderCard();

    const select = await screen.findByLabelText('Week starts on');
    expect(select).toBeDisabled();
    expect(screen.getByText(/ask a household owner to change this/i)).toBeInTheDocument();
  });

  it('surfaces an inline error and keeps the loaded weekday when the save fails', async () => {
    mockedFetch.mockResolvedValue(1); // Monday
    mockedUpdate.mockRejectedValueOnce(new Error('rls'));
    const user = userEvent.setup();
    renderCard();

    const select = (await screen.findByLabelText('Week starts on')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('1'));

    await user.selectOptions(select, 'Friday');

    expect(await screen.findByText(/couldn’t save that — the week start is unchanged/i)).toBeInTheDocument();
    // Driven by query data, not local state — a failed write leaves the shown value alone.
    expect(select.value).toBe('1');
  });

  it('shows a load error if the setting query fails', async () => {
    mockedFetch.mockRejectedValue(new Error('boom'));
    renderCard();

    expect(await screen.findByText(/couldn’t load the planning-week setting/i)).toBeInTheDocument();
  });
});

/**
 * Intent 015 (bolt 064): the dinners-per-week control, added to this card rather than a new one —
 * when the week starts and how many dinners it holds are the same subject.
 */
describe('PlanningWeekCard — dinners per week (intent 015)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(0);
    mockedUpdate.mockResolvedValue();
    mockedFetchPlanSize.mockResolvedValue(3);
    mockedUpdatePlanSize.mockResolvedValue();
    asRole('owner');
  });

  it('shows the stored number and lets an owner change it', async () => {
    const user = userEvent.setup();
    renderCard();

    const select = await screen.findByLabelText('Dinners per week');
    await waitFor(() => expect(select).toHaveValue('3'));

    await user.selectOptions(select, '5');
    await waitFor(() => expect(mockedUpdatePlanSize).toHaveBeenCalledWith('hh-1', 5));
  });

  it('offers exactly 1..7 — the same range as the database check', async () => {
    renderCard();

    const select = (await screen.findByLabelText('Dinners per week')) as HTMLSelectElement;
    const values = [...select.options].map((o) => o.value);
    expect(values).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('reads a non-default stored value rather than assuming 3', async () => {
    mockedFetchPlanSize.mockResolvedValue(6);
    renderCard();

    const select = await screen.findByLabelText('Dinners per week');
    await waitFor(() => expect(select).toHaveValue('6'));
  });

  it('says which screens follow the number, because one dropdown moves four of them', async () => {
    renderCard();

    expect(
      await screen.findByText(/plan, shopping list and cooking view all follow this number/i),
    ).toBeInTheDocument();
  });

  it('disables the control for a non-owner, and says so exactly once for the card', async () => {
    asRole('member');
    renderCard();

    expect(await screen.findByLabelText('Dinners per week')).toBeDisabled();
    expect(screen.getByLabelText('Week starts on')).toBeDisabled();
    // One hint for both controls — saying it twice reads like a bug rather than emphasis.
    expect(screen.getAllByText(/ask a household owner to change this/i)).toHaveLength(1);
  });

  it('keeps the stored number visible when the save fails', async () => {
    mockedUpdatePlanSize.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    renderCard();

    const select = await screen.findByLabelText('Dinners per week');
    await waitFor(() => expect(select).toHaveValue('3'));
    await user.selectOptions(select, '7');

    expect(await screen.findByText(/number of dinners is unchanged/i)).toBeInTheDocument();
    // Driven by the query, not local state, so a failed write cannot leave a wrong number showing.
    await waitFor(() => expect(select).toHaveValue('3'));
  });

  /**
   * The design decision this bolt most needed to get right. `dinners_per_week` decides whether the
   * current plan is FULL, which drives the lock control, the plan page's nudge, and the
   * shopping-list and cooking-view gates. Invalidating only this setting's own key would let the
   * dropdown show the new number while four other screens carried on with the old one — a failure
   * that looks like a caching bug rather than a missing line.
   */
  it('invalidates the weekly-plan queries too, so dependent screens re-derive immediately', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderCard();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const select = await screen.findByLabelText('Dinners per week');
    await waitFor(() => expect(select).toHaveValue('3'));
    await user.selectOptions(select, '4');

    await waitFor(() => expect(mockedUpdatePlanSize).toHaveBeenCalled());
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['household', 'dinners-per-week'] }),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['weekly-plan'] }));
  });
});
