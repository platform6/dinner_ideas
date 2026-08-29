import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/shared/lib/supabase';

export type HouseholdRole = 'owner' | 'member';

export interface AuthProfile {
  id: string;
  displayName: string | null;
}

interface UseAuthResult {
  session: Session | null;
  /** True only while the initial session is being read on first load. */
  isLoading: boolean;
  /** The caller's profile row, or null when logged out / not yet loaded. */
  profile: AuthProfile | null;
  /** The caller's household id, or null when logged out or (unexpectedly) not a member of one. */
  householdId: string | null;
  /** The caller's role within their household, or null when logged out / no membership. */
  role: HouseholdRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

interface HouseholdContext {
  profile: AuthProfile | null;
  householdId: string | null;
  role: HouseholdRole | null;
}

const EMPTY_CONTEXT: HouseholdContext = { profile: null, householdId: null, role: null };

/**
 * Wrapper around Supabase Auth. Every user has a personal email/password account and belongs to
 * exactly one household (see standards/tech-stack.md); this hook also resolves that household
 * context (profile, household id, role) once per session so components don't each re-query it.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<HouseholdContext>(EMPTY_CONTEXT);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        // Falls back to the login form rather than spinning forever — e.g. storage access
        // blocked in a private-browsing context, or a transient error reading the token.
        console.error('Failed to read the existing session', error);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Resolve household context whenever the signed-in user changes. Keyed on the user id so it
  // runs once per session resolution, not per render. RLS already restricts household_members
  // to the caller's own household, and `.eq('profile_id', …)` narrows it to their own row.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setContext(EMPTY_CONTEXT);
      return;
    }

    let cancelled = false;
    void supabase
      .from('household_members')
      .select('role, household_id, profiles(id, display_name)')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load household context', error);
          setContext(EMPTY_CONTEXT);
          return;
        }
        const profileRow = (data?.profiles ?? null) as { id: string; display_name: string | null } | null;
        setContext({
          profile: profileRow ? { id: profileRow.id, displayName: profileRow.display_name } : null,
          householdId: data?.household_id ?? null,
          role: (data?.role as HouseholdRole | undefined) ?? null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    isLoading,
    profile: context.profile,
    householdId: context.householdId,
    role: context.role,
    signIn,
    signOut,
  };
}
