import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Household-scale, low-traffic app — a short staleTime avoids
      // refetching the whole catalog on every window focus.
      staleTime: 30_000,
      retry: 1,
    },
  },
});
