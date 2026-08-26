import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/shared/lib/supabase';

interface UseAuthResult {
  session: Session | null;
  /** True only while the initial session is being read on first load. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * Thin wrapper around Supabase Auth for the shared household login.
 * There are no per-user accounts — every authenticated session represents
 * the same household (see standards/tech-stack.md).
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, isLoading, signIn, signOut };
}
