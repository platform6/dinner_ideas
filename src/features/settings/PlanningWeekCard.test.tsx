import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/shared/theme';
import { PlanningWeekCard } from '@/features/settings/PlanningWeekCard';
import { fetchWeekStartDay, updateWeekStartDay } from '@/features/settings/api';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/settings/api');
vi.mock('@/features/auth/useAuth');

const mockedFetch = vi.mocked(fetchWeekStartDay);
const mockedUpdate = vi.mocked(updateWeekStartDay);
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
  return render(
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <PlanningWeekCard />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('PlanningWeekCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(0);
    mockedUpdate.mockResolvedValue();
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
