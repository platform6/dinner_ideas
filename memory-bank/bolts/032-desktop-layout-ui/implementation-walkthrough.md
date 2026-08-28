---
stage: implement
bolt: 032-desktop-layout-ui
created: 2026-08-28T19:58:00Z
---

## Implementation Walkthrough: desktop-layout-ui — bolt 032 (test infra + rail + measure cap + login)

### Summary

Added responsive-component test infrastructure, replaced `Layout.tsx` with a rail-at-md+ /
tab-bar-below shell that renders exactly one nav at a time, capped the content measure at
720/1080px, and vertically centred the login card at md+.

### Completed Work

- [x] `src/test/setup.ts` — stub `window.matchMedia` (guarded; `matches: false`, no-op listeners)
- [x] `src/test/render.tsx` — `renderWithProviders(ui, { route?, queryClient? })` wrapping
      `ChakraProvider theme={theme}` + `MemoryRouter` (+ `QueryClientProvider` when a client is passed);
      `makeTestQueryClient()` helper; re-exports `@testing-library/react`
- [x] `src/shared/components/Layout.tsx` — rewritten from `Layout.reference.tsx`:
  - `const view = useBreakpointValue({ base: 'mobile', md: 'desktop' }, { ssr: false }) ?? 'mobile'`
    → renders EITHER the 240px left rail OR (header + fixed bottom tab bar), never both
  - rail: sticky, `h=100vh`, app name `fontFamily="heading"` `0.9375rem` `ink.900`, `navItems` as
    `RailLink`s, foot = Store setup + Log out
  - phone header: app name `fontFamily="heading"` `0.9375rem` `ink.700` (not `textStyle="cardTitle"`
    — review finding 11) + store-setup / log-out `IconButton`s; tab bar unchanged from before
  - `<main>` inner `<Box maxW={isWide ? '1080px' : '720px'} mx="auto">`; `isWide = wide ?? WIDE_ROUTES.has(pathname)`,
    `WIDE_ROUTES = {'/', '/store-config'}`
- [x] `src/shared/components/Layout.test.tsx` — rewritten via `renderWithProviders`; asserts 4 nav
      links render once, active-route marking, Store setup + Log out outside the tab-bar `nav`, `signOut` on click
- [x] `src/features/auth/LoginForm.tsx` — wrapped the `maxW="sm"` box in
      `<Flex minH={{ md: '100vh' }} align={{ md: 'center' }} justify="center">`; inner box keeps
      `mt={{ base: 12, md: 0 }}` (phone spacing preserved, no top gap at md+)

### Key Decisions

- **Single-nav render via `useBreakpointValue`** instead of `Layout.reference.tsx`'s CSS `display`
  toggle — two navs in the DOM would put two links per route and break every `Layout.test.tsx`
  query. `{ ssr: false }` makes it read `matchMedia` synchronously on mount (no mobile→desktop
  flash on a real laptop).
- **`renderWithProviders` centralises `ChakraProvider`** — `useBreakpoint` needs a theme with
  `__breakpoints`, the other half of the crash seen in `003` bolt `025`.

### Deviations from Plan

None (plan already noted the single-nav deviation from the reference file).

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `npm run build` — clean
- [x] `npm run lint` — clean (0 errors, 0 warnings)
- [x] `npm run test` — 134 / 134

### Developer Notes

Under jsdom `useBreakpointValue` resolves to `base` → tests see the phone view; the rail is
browser-verified. `renderWithProviders` is available for other suites to adopt (not migrated here).
