import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/shared/lib/supabase';

const maybeSingle = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  },
}));

const mockedGetSession = vi.mocked(supabase.auth.getSession);
const mockedFrom = vi.mocked(supabase.from);

const sessionForUser = (id: string) => ({ user: { id } }) as unknown as Session;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
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

  it('leaves household context null and issues no query when logged out', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.householdId).toBeNull();
    expect(result.current.role).toBeNull();
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('resolves profile / householdId / role from the membership row once a session exists', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: sessionForUser('user-1') },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        role: 'owner',
        household_id: 'hh-1',
        profiles: { id: 'user-1', display_name: 'Pat' },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.householdId).toBe('hh-1'));
    expect(result.current.role).toBe('owner');
    expect(result.current.profile).toEqual({ id: 'user-1', displayName: 'Pat' });
    expect(mockedFrom).toHaveBeenCalledWith('household_members');
    expect(mockedFrom).toHaveBeenCalledTimes(1); // once per session resolution, not per render
  });

  it('keeps householdId null (and does not crash) when the user has no membership row', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: sessionForUser('user-2') },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(mockedFrom).toHaveBeenCalled());
    expect(result.current.householdId).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('logs and clears context when the membership query errors', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: sessionForUser('user-3') },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'network' } });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
    expect(result.current.householdId).toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
