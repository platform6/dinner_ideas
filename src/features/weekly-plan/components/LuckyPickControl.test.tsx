import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LuckyPickControl } from '@/features/weekly-plan/components/LuckyPickControl';
import { theme } from '@/shared/theme';

function renderControl(props: Partial<Parameters<typeof LuckyPickControl>[0]> = {}) {
  const onPick = props.onPick ?? vi.fn();
  render(
    <ChakraProvider theme={theme}>
      <LuckyPickControl slotsToFill={3} candidateCount={40} isLocked={false} onPick={onPick} {...props} />
    </ChakraProvider>,
  );
  return { onPick };
}

describe('LuckyPickControl', () => {
  it('is enabled and fires when there are slots and candidates', async () => {
    const user = userEvent.setup();
    const { onPick } = renderControl();

    const button = screen.getByRole('button', { name: /surprise me/i });
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('has no confirm step — it is non-destructive, unlike Clear picks and Lock', async () => {
    const user = userEvent.setup();
    const { onPick } = renderControl();

    await user.click(screen.getByRole('button', { name: /surprise me/i }));
    // One press, one action. Its siblings swap in an inline confirm; this one must not.
    expect(onPick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /keep|cancel/i })).not.toBeInTheDocument();
  });

  // Each disabled state must SAY why. "Disabled and silent" leaves the user unsure whether the app
  // is broken or they are.
  it('disables and explains when the week is already full', () => {
    renderControl({ slotsToFill: 0 });
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeDisabled();
    expect(screen.getByText(/already full/i)).toBeInTheDocument();
  });

  it('disables and explains when the plan is locked', () => {
    renderControl({ isLocked: true });
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeDisabled();
    expect(screen.getByText(/locked in/i)).toBeInTheDocument();
  });

  it('disables and explains when there is nothing left to choose from', () => {
    renderControl({ candidateCount: 0 });
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeDisabled();
    expect(screen.getByText(/no dinners left/i)).toBeInTheDocument();
  });

  it('warns before the press when there are fewer dinners than slots', () => {
    renderControl({ slotsToFill: 4, candidateCount: 2 });
    // Still usable — it just cannot finish the job. Saying so beforehand beats a "ran out" after.
    expect(screen.getByRole('button', { name: /surprise me/i })).not.toBeDisabled();
    expect(screen.getByText(/only 2 left to choose from/i)).toBeInTheDocument();
  });

  it('locked takes precedence over full — the more fundamental reason wins', () => {
    renderControl({ isLocked: true, slotsToFill: 0 });
    expect(screen.getByText(/locked in/i)).toBeInTheDocument();
    expect(screen.queryByText(/already full/i)).not.toBeInTheDocument();
  });
});
