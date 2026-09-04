import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LockWeekControl } from '@/features/weekly-plan/components/LockWeekControl';
import { theme } from '@/shared/theme';

function renderControl(props: Partial<Parameters<typeof LockWeekControl>[0]> = {}) {
  const onLock = props.onLock ?? vi.fn();
  render(
    <ChakraProvider theme={theme}>
      <LockWeekControl selectionCount={3} onLock={onLock} {...props} />
    </ChakraProvider>,
  );
  return { onLock };
}

describe('LockWeekControl', () => {
  it('renders nothing when fewer than 3 dinners are selected', () => {
    render(
      <ChakraProvider theme={theme}>
        <LockWeekControl selectionCount={2} onLock={vi.fn()} />
      </ChakraProvider>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('renders the "Lock in this week" button at exactly 3 selections', () => {
    renderControl();
    expect(screen.getByRole('button', { name: /lock in this week/i })).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('opens an inline confirm with the right copy, role and label, and focuses "Keep editing"', async () => {
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole('button', { name: /lock in this week/i }));

    const group = screen.getByRole('group', { name: /confirm locking this week's plan/i });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByText(/lock in these 3\? you won’t be able to change this week’s picks\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep editing/i })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /^lock in this week$/i })).not.toBeInTheDocument();
  });

  it('dismisses the confirm on "Keep editing" without calling onLock', async () => {
    const user = userEvent.setup();
    const { onLock } = renderControl();

    await user.click(screen.getByRole('button', { name: /lock in this week/i }));
    await user.click(screen.getByRole('button', { name: /keep editing/i }));

    expect(screen.getByRole('button', { name: /lock in this week/i })).toBeInTheDocument();
    expect(onLock).not.toHaveBeenCalled();
  });

  it('dismisses the confirm on Escape without calling onLock', async () => {
    const user = userEvent.setup();
    const { onLock } = renderControl();

    await user.click(screen.getByRole('button', { name: /lock in this week/i }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: /lock in this week/i })).toBeInTheDocument();
    expect(onLock).not.toHaveBeenCalled();
  });

  it('calls onLock exactly once when "Lock it in" is pressed', async () => {
    const user = userEvent.setup();
    const { onLock } = renderControl();

    await user.click(screen.getByRole('button', { name: /lock in this week/i }));
    await user.click(screen.getByRole('button', { name: /lock it in/i }));

    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('shows a loading spinner on the idle button while locking', () => {
    renderControl({ isLocking: true });
    expect(screen.getByRole('button', { name: /lock in this week/i })).toHaveAttribute('data-loading');
  });
});
