/* eslint-disable react-refresh/only-export-components -- test-only helper module */
import type { ReactElement, ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

import { theme } from '@/shared/theme';

/**
 * Shared test render helper. Wraps the tree in `ChakraProvider` (so responsive hooks like
 * `useBreakpointValue` have a theme with `__breakpoints`), plus `MemoryRouter` and — when a
 * `queryClient` is passed — `QueryClientProvider`. `src/test/setup.ts` stubs `window.matchMedia`,
 * so `useBreakpointValue` resolves to its `base` value under jsdom.
 */
interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route(s) for the MemoryRouter. Default: `['/']`. */
  route?: string | string[];
  /** Pass a client to also wrap in QueryClientProvider. */
  queryClient?: QueryClient;
}

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = '/', queryClient, ...renderOptions } = options;
  const initialEntries = Array.isArray(route) ? route : [route];

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = (
      <ChakraProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ChakraProvider>
    );
    return queryClient ? <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider> : tree;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
