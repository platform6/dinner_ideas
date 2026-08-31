import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import { AuthGate } from '@/features/auth/AuthGate';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/auth/useAuth');

const mockedUseAuth = vi.mocked(useAuth);

describe('AuthGate', () => {
  it('shows only the login form when logged out', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      isLoading: false,
      profile: null,
      householdId: null,
      role: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the app once a session exists', () => {
    mockedUseAuth.mockReturnValue({
      session: {} as Session,
      isLoading: false,
      profile: null,
      householdId: null,
      role: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
  });

  it('shows a spinner instead of the login form while the initial session check is in flight', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      isLoading: true,
      profile: null,
      householdId: null,
      role: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
