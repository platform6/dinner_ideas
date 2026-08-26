import type { ReactNode } from 'react';
import { Center, Spinner } from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';
import { LoginForm } from '@/features/auth/LoginForm';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Renders the login form when logged out, the app when logged in.
 * No routing here on purpose — there's nothing behind the gate worth a
 * "/login" URL for a single shared household login.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
