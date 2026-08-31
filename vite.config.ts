import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dino Recipes',
        short_name: 'Dino Recipes',
        description: 'Weekly dinner planning, shopping list, and cooking view for the household.',
        theme_color: '#4A6741',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Drop precache entries from superseded SW versions so a client that updates through
        // several deploys doesn't accumulate stale hashed chunks.
        cleanupOutdatedCaches: true,
        // Precaches the built app shell (JS/CSS/HTML/icons) automatically. On top of that,
        // this one rule keeps Supabase data available offline: fresh whenever there's a
        // connection, falling back to the last successful response (e.g. the current plan's
        // shopping list) when there isn't — see implementation-plan.md's Technical Approach.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // App tests only. Supabase Edge Functions are Deno + npm: specifiers — run those with
    // `deno task test` in supabase/functions/claude-proxy, not Vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
