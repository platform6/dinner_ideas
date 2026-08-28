---
stage: plan
bolt: 032-desktop-layout-ui
created: 2026-08-28T19:50:00Z
---

## Implementation Plan: desktop-layout-ui — bolt 032 (test infra + rail + measure cap + login)

### Objective

Land the foundation the rest of the intent needs: responsive-component test infrastructure, the
left-rail `Layout` shell (one nav rendered at a time), the 720/1080px content measure cap, and
login vertical centring at md+.

### Stories & order

1. **009-responsive-test-infrastructure** — unblocks testing everything below
2. **001-left-rail-navigation** + **002-content-measure-cap** — same `Layout.tsx` rewrite
3. **003-login-vertical-centring** — small, independent

### Deliverables

**Story 009**

- `src/test/setup.ts` — stub `window.matchMedia` with a `MediaQueryList`-shaped object
  (`matches: false`, no-op `addEventListener` / `removeEventListener` / legacy `addListener` /
  `removeListener` / `dispatchEvent`), alongside the existing `scrollTo` / `scrollIntoView` stubs.
- `src/test/render.tsx` — `renderWithProviders(ui, { route?, queryClient? })` wrapping
  `<ChakraProvider theme={theme}>` + `<MemoryRouter>` (+ `<QueryClientProvider>` when a client is
  passed). Re-exports `screen`, `within`, etc. for convenience.

**Stories 001 + 002 — `src/shared/components/Layout.tsx`** (adapted from `Layout.reference.tsx`)

- `LayoutProps { children; wide? }`; `WIDE_ROUTES = new Set(['/', '/store-config'])`.
- `const view = useBreakpointValue({ base: 'mobile', md: 'desktop' }) ?? 'mobile'` — render EITHER
  the rail OR (header + tab bar), never both, so there is one link per route in the DOM.
- **desktop**: 240px rail (`sticky`, `top=0`, `h=100vh`, `paper.base`, right `1px line.subtle`,
  `px={4} py={6}`); head = app name `fontFamily="heading"` `0.9375rem` `ink.900` `px={3.5} mb={5}`;
  `navItems` as `RailLink`s (44px, `gap={3}`, `px={3.5}`, `borderRadius="chip"`, active
  `bg="brand.50"`/`color="brand.500"`, inactive `color="ink.300"`, hover `bg="paper.subtle"`/`color="ink.700"`,
  icon 17px sw 1.8/2); foot (`borderTopWidth` `line.subtle`, `pt={4}`) = Store setup `RailLink` +
  Log out button (40px, `0.78125rem`).
- **mobile**: header (app name `fontFamily="heading"` `0.9375rem` `ink.700` — review finding 11, not
  `textStyle="cardTitle"`; store-setup + log-out `IconButton`s) + the current fixed bottom tab bar,
  unchanged.
- `<main>` inner wrapper: `<Box maxW={isWide ? '1080px' : '720px'} mx="auto">{children}</Box>`,
  `isWide = wide ?? WIDE_ROUTES.has(location.pathname)`. `<main>` padding
  `px={{ base: 4, md: 8 }} py={{ base: 4, md: 10 }}`.
- Content column carries `pb={{ base: '70px', md: 0 }}` (tab-bar clearance on phone only).
- `App.tsx` unchanged.

**Story 001 — `src/shared/components/Layout.test.tsx`** (rewrite, via `renderWithProviders`)

- jsdom → `useBreakpointValue` resolves to `base` → the mobile view renders.
- Cover: 4 nav links (`Catalog`, `This week`, `List`, `Cooking`) + page content render once;
  `/plan` marks "This week" `aria-current="page"`; Store setup link → `/store-config` and
  `.closest('nav')` is null; Log out button present and calls `signOut`.

**Story 003 — `src/features/auth/LoginForm.tsx`**

- Wrap the `maxW="sm"` box in a `Flex minH={{ md: '100vh' }} align={{ md: 'center' }} justify="center"`;
  keep `mt={{ base: 12, md: 0 }}` on the inner box (phone spacing preserved, no top gap at md+).

### Dependencies

- None (first bolt). Intent `003` (complete) supplies the theme changes it builds on.
- New: none. `@chakra-ui/react` `ChakraProvider` / `useBreakpointValue` already available.

### Technical Approach

- The one deviation from `Layout.reference.tsx` is the single-nav render (it toggles both via CSS
  `display`). Everything else — proportions, tokens, `RailLink`, `WIDE_ROUTES` — is as written.
- `renderWithProviders` centralises the `ChakraProvider` so `useBreakpoint` has a theme with
  `__breakpoints` (the other half of the crash seen in intent `003` bolt `025`).

### Acceptance Criteria

- [ ] `window.matchMedia` stubbed in `src/test/setup.ts`; `renderWithProviders` helper exists
- [ ] Rail at md+, header + tab bar below md, single-nav render (one link per route)
- [ ] App name `fontFamily="heading"` `0.9375rem` (`ink.700` header / `ink.900` rail) — not `cardTitle`
- [ ] Store setup + Log out reachable at both breakpoints
- [ ] `<main>` inner wrapper `maxW` 1080px on `/` and `/store-config`, else 720px, `mx="auto"`
- [ ] Login vertically centred at md+; phone spacing preserved
- [ ] `Layout.test.tsx` rewritten; `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green

### Out of Scope

- The three md+ screen reshapes (bolt `033`); catalog breakpoint + hover states (bolt `034`)
