import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClearPicksControl } from '@/features/weekly-plan/components/ClearPicksControl';
import { theme } from '@/shared/theme';

function renderControl(props: Partial<Parameters<typeof ClearPicksControl>[0]> = {}) {
  const onClear = props.onClear ?? vi.fn();
  render(
    <ChakraProvider theme={theme}>
      <ClearPicksControl count={3} onClear={onClear} {...props} />
    </ChakraProvider>,
  );
  return { onClear };
}

describe('ClearPicksControl', () => {
  it('renders nothing when no dinners are selected', () => {
    render(
      <ChakraProvider theme={theme}>
        <ClearPicksControl count={0} onClear={vi.fn()} />
      </ChakraProvider>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('renders the "Clear picks" button when 1–3 are selected', () => {
    renderControl({ count: 2 });
    expect(screen.getByRole('button', { name: /clear picks/i })).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('opens an inline confirm with the live count, role and label, and focuses "Keep"', async () => {
    const user = userEvent.setup();
    renderControl({ count: 3 });

    await user.click(screen.getByRole('button', { name: /clear picks/i }));

    expect(screen.getByRole('group', { name: /confirm clearing this week's picks/i })).toBeInTheDocument();
    expect(screen.getByText('Clear all 3?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^keep$/i })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /^clear picks$/i })).not.toBeInTheDocument();
  });

  it('dismisses the confirm on "Keep" without calling onClear', async () => {
    const user = userEvent.setup();
    const { onClear } = renderControl();

    await user.click(screen.getByRole('button', { name: /clear picks/i }));
    await user.click(screen.getByRole('button', { name: /^keep$/i }));

    expect(screen.getByRole('button', { name: /clear picks/i })).toBeInTheDocument();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('dismisses the confirm on Escape without calling onClear', async () => {
    const user = userEvent.setup();
    const { onClear } = renderControl();

    await user.click(screen.getByRole('button', { name: /clear picks/i }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: /clear picks/i })).toBeInTheDocument();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('calls onClear exactly once when "Clear all" is pressed', async () => {
    const user = userEvent.setup();
    const { onClear } = renderControl();

    await user.click(screen.getByRole('button', { name: /clear picks/i }));
    await user.click(screen.getByRole('button', { name: /clear all/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows a loading spinner while clearing', () => {
    renderControl({ isClearing: true });
    expect(screen.getByRole('button', { name: /clear picks/i })).toHaveAttribute('data-loading');
  });
});
