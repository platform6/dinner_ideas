import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/shared/lib/supabase';

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

const mockedGetSession = vi.mocked(supabase.auth.getSession);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the session and stops loading on a successful read', async () => {
    const fakeSession = {} as Session;
    mockedGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBe(fakeSession);
  });

  it('stops loading (falling back to the login form) when reading the session fails', async () => {
    // Regression: an unhandled rejection here used to leave isLoading stuck at true forever.
    mockedGetSession.mockRejectedValue(new Error('storage access blocked'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
