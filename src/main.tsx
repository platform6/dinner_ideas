import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';

import { queryClient } from '@/shared/lib/queryClient';
import { theme } from '@/shared/theme';
import { App } from '@/App';

// registerType is 'autoUpdate' (vite.config.ts). Without this call the plugin only injects a
// bare register() — the new service worker precaches the next load but an already-open tab keeps
// running the old JS forever. `registerSW` adds the missing half: it polls for a new worker and
// reloads the page once when one takes control, so long-lived desktop tabs / installed PWA
// windows actually pick up a deploy instead of showing stale UI.
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  </StrictMode>,
);
