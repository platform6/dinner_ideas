import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/auth/useAuth');

const mockedUseAuth = vi.mocked(useAuth);

function mockSignIn(result: { error: string | null }) {
  mockedUseAuth.mockReturnValue({
    session: null,
    isLoading: false,
    signIn: vi.fn().mockResolvedValue(result),
    signOut: vi.fn(),
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a clear error message when credentials are rejected', async () => {
    mockSignIn({ error: 'Invalid login credentials' });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/couldn.t log in/i)).toBeInTheDocument();
  });

  it('calls signIn with the entered credentials and shows no error on success', async () => {
    mockSignIn({ error: null });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'household@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(mockedUseAuth().signIn).toHaveBeenCalledWith('household@example.com', 'correct-password');
    expect(screen.queryByText(/couldn.t log in/i)).not.toBeInTheDocument();
  });
});
