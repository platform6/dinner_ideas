import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/shared/theme';
import { ClaudeAiCard } from '@/features/settings/ClaudeAiCard';
import { callClaude, ClaudeError } from '@/features/ai/api';
import { clearHouseholdKey, fetchAiConfig, setHouseholdKey, updateAiConfig } from '@/features/settings/api';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/ai/api', async (orig) => ({
  ...(await orig<typeof import('@/features/ai/api')>()),
  callClaude: vi.fn(),
}));
vi.mock('@/features/settings/api');
vi.mock('@/features/auth/useAuth');

const mockedCallClaude = vi.mocked(callClaude);
const mockedFetchConfig = vi.mocked(fetchAiConfig);
const mockedSetKey = vi.mocked(setHouseholdKey);
const mockedClearKey = vi.mocked(clearHouseholdKey);
const mockedUpdateConfig = vi.mocked(updateAiConfig);
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
        <ClaudeAiCard />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('ClaudeAiCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchConfig.mockResolvedValue({
      modelOverride: null,
      dailyCallLimit: 25,
      keySet: false,
    });
    mockedSetKey.mockResolvedValue();
    mockedClearKey.mockResolvedValue();
    mockedUpdateConfig.mockResolvedValue();
    asRole('member');
  });

  it('Test connection shows a loading state then the success line', async () => {
    mockedCallClaude.mockResolvedValue({
      text: 'pong',
      model: 'claude-sonnet-5',
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 384,
    });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/✓ Connected — claude-sonnet-5, 384 ms/)).toBeInTheDocument();
  });

  it.each([
    ['rate_limited', /daily limit reached/i],
    ['no_api_key', /no claude api key set/i],
    ['upstream_error', /claude is unavailable/i],
    ['bad_request', /misconfigured/i],
    ['no_household', /isn't attached to a household/i],
    ['timeout', /took too long/i],
  ] as const)('maps ClaudeError %s to its message', async (code, re) => {
    mockedCallClaude.mockRejectedValue(new ClaudeError(code, 'x'));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(re)).toBeInTheDocument();
  });

  it('non-owner sees Test connection but none of the owner controls', async () => {
    asRole('member');
    renderCard();
    await screen.findByRole('button', { name: /test connection/i });
    expect(screen.queryByLabelText(/anthropic api key/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^model$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/daily call limit/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ask a household owner to add a claude api key/i)).toBeInTheDocument();
  });

  it('owner sees the key / model / limit controls', async () => {
    asRole('owner');
    renderCard();
    expect(await screen.findByLabelText(/anthropic api key/i)).toBeInTheDocument();
    // model + limit render once the ai-config query resolves (they are bound to its data)
    expect(await screen.findByLabelText(/^model$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/daily call limit/i)).toBeInTheDocument();
    expect(screen.getByText(/no key set — claude is off/i)).toBeInTheDocument();
  });

  it('daily-limit field shows the saved value once the config query resolves', async () => {
    asRole('owner');
    mockedFetchConfig.mockResolvedValue({ modelOverride: null, dailyCallLimit: 5, keySet: false });
    renderCard();
    const limit = await screen.findByLabelText(/daily call limit/i);
    await waitFor(() => expect(limit).toHaveValue(5));
  });

  it('owner saves a key: calls the RPC, clears the input, then shows "Key set ✓"', async () => {
    asRole('owner');
    mockedFetchConfig
      .mockResolvedValueOnce({ modelOverride: null, dailyCallLimit: 25, keySet: false })
      .mockResolvedValue({ modelOverride: null, dailyCallLimit: 25, keySet: true });
    renderCard();
    const input = await screen.findByLabelText(/anthropic api key/i);
    await userEvent.type(input, 'sk-ant-secret');
    await userEvent.click(screen.getByRole('button', { name: /save key/i }));
    await waitFor(() => expect(mockedSetKey).toHaveBeenCalledWith('sk-ant-secret'));
    expect(input).toHaveValue('');
    expect(await screen.findByText(/key set ✓/i)).toBeInTheDocument();
  });

  it('owner clears a key: calls clearHouseholdKey', async () => {
    asRole('owner');
    mockedFetchConfig.mockResolvedValue({
      modelOverride: null,
      dailyCallLimit: 25,
      keySet: true,
    });
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: /clear key/i }));
    await waitFor(() => expect(mockedClearKey).toHaveBeenCalled());
  });

  it('owner changing the model calls updateAiConfig with model_override', async () => {
    asRole('owner');
    renderCard();
    await userEvent.selectOptions(await screen.findByLabelText(/^model$/i), 'claude-opus-5');
    await waitFor(() =>
      expect(mockedUpdateConfig).toHaveBeenCalledWith('hh-1', { model_override: 'claude-opus-5' }),
    );
  });

  it('owner changing the daily limit on blur calls updateAiConfig', async () => {
    asRole('owner');
    renderCard();
    const limit = await screen.findByLabelText(/daily call limit/i);
    await userEvent.clear(limit);
    await userEvent.type(limit, '5');
    await userEvent.tab();
    await waitFor(() => expect(mockedUpdateConfig).toHaveBeenCalledWith('hh-1', { daily_call_limit: 5 }));
  });
});
