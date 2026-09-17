import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/shared/theme';
import { RemoveDinnerDialog } from '@/features/dinners/components/RemoveDinnerDialog';
import { fetchRemovalImpact, removeDinner, type RemovalImpact } from '@/features/dinners/api';

// Partial mock: `mapRemovalError` is real — it is the code under test for the failure messages.
vi.mock('@/features/dinners/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/dinners/api')>()),
  fetchRemovalImpact: vi.fn(),
  removeDinner: vi.fn(),
}));

const mockedImpact = vi.mocked(fetchRemovalImpact);
const mockedRemove = vi.mocked(removeDinner);

const NOTHING: RemovalImpact = {
  historyCount: 0,
  pastPlanCount: 0,
  inCurrentDraft: false,
  inCurrentLockedPlan: false,
};

function renderDialog(overrides: { onClose?: () => void; onHideInstead?: () => void } = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onHideInstead = overrides.onHideInstead ?? vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <RemoveDinnerDialog
          dinnerId="d1"
          dinnerName="Salted Chocolate Toffee Pretzel Bark"
          isOpen
          onClose={onClose}
          onHideInstead={onHideInstead}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  );
  return { onClose, onHideInstead };
}

const removeButton = () => screen.getByRole('button', { name: 'Remove' });

describe('RemoveDinnerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedImpact.mockResolvedValue(NOTHING);
    mockedRemove.mockResolvedValue();
  });

  it('names the dinner and says it cannot be undone', async () => {
    renderDialog();

    expect(screen.getByText(/Remove “Salted Chocolate Toffee Pretzel Bark”\?/)).toBeInTheDocument();
    expect(await screen.findByText('This can’t be undone.')).toBeInTheDocument();
  });

  it('loads the impact FIRST — Remove is disabled until the user can decide on facts', async () => {
    let resolve: (impact: RemovalImpact) => void = () => {};
    mockedImpact.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDialog();

    expect(screen.getByText(/Checking what this dinner is part of/)).toBeInTheDocument();
    expect(removeButton()).toBeDisabled();

    resolve(NOTHING);
    await waitFor(() => expect(removeButton()).toBeEnabled());
  });

  it('puts the initial focus on Cancel — a permanent action is never one Enter key away', async () => {
    renderDialog();
    await screen.findByText('This can’t be undone.');

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('shows only the lines that apply — nothing about history for a never-planned dinner', async () => {
    renderDialog();
    await screen.findByText('This can’t be undone.');

    expect(screen.queryByText(/cooked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/this week’s plan/)).not.toBeInTheDocument();
  });

  it.each([
    [1, 'once'],
    [3, '3 times'],
  ])('says the history goes too — cooked %i → "%s"', async (historyCount, words) => {
    mockedImpact.mockResolvedValue({ ...NOTHING, historyCount, pastPlanCount: historyCount });
    renderDialog();

    expect(
      await screen.findByText(`It’s been cooked ${words} — that history goes with it.`),
    ).toBeInTheDocument();
  });

  it('warns that this week’s plan and shopping list will change', async () => {
    mockedImpact.mockResolvedValue({ ...NOTHING, inCurrentDraft: true });
    renderDialog();

    expect(
      await screen.findByText(/it’ll be taken off, and this week’s shopping list will change/),
    ).toBeInTheDocument();
  });

  describe('this week’s locked plan — the one refusal (ADR-15)', () => {
    beforeEach(() =>
      mockedImpact.mockResolvedValue({ ...NOTHING, historyCount: 1, inCurrentLockedPlan: true }),
    );

    it('disables Remove and says why, and when it becomes possible', async () => {
      renderDialog();

      expect(await screen.findByText(/can’t be removed until the week is over/)).toBeInTheDocument();
      expect(removeButton()).toBeDisabled();
    });

    it('offers Not interested as what to do now', async () => {
      const user = userEvent.setup();
      const { onHideInstead, onClose } = renderDialog();
      await screen.findByText(/can’t be removed until the week is over/);

      await user.click(screen.getByRole('button', { name: 'Not interested instead' }));

      expect(onHideInstead).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockedRemove).not.toHaveBeenCalled();
    });
  });

  it('always names Not interested as the reversible alternative', async () => {
    renderDialog();

    expect(
      await screen.findByText(/To just hide it, use Not interested instead — that can be undone/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not interested instead' })).toBeInTheDocument();
  });

  it('removes on confirm, then closes', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await waitFor(() => expect(removeButton()).toBeEnabled());

    await user.click(removeButton());

    await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['P0001', /can’t be removed until the week is over\. Nothing was changed/],
    ['P0002', /already gone/],
    ['XX000', /Couldn’t remove that dinner\. Nothing was changed/],
  ])('explains a %s failure in plain words, and stays open', async (code, message) => {
    mockedRemove.mockRejectedValue({ code, message: 'raw postgres text' });
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await waitFor(() => expect(removeButton()).toBeEnabled());

    await user.click(removeButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/raw postgres text/)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('refuses to remove when the impact could not be checked', async () => {
    mockedImpact.mockRejectedValue(new Error('network'));
    renderDialog();

    expect(await screen.findByText(/Couldn’t check what removing it would affect/)).toBeInTheDocument();
    expect(removeButton()).toBeDisabled();
  });
});
