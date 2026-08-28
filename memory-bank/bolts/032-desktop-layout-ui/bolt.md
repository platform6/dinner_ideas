---
id: 032-desktop-layout-ui
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
type: simple-construction-bolt
status: complete
stories:
  - 009-responsive-test-infrastructure
  - 001-left-rail-navigation
  - 002-content-measure-cap
  - 003-login-vertical-centring
created: '2026-08-28T19:45:00Z'
started: '2026-08-28T19:50:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T19:52:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T19:58:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T20:00:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 033-desktop-layout-ui
  - 034-desktop-layout-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
completed: '2026-08-28T19:17:16Z'
---

# Bolt: 032-desktop-layout-ui

## Objective

Foundation for the desktop layer: the responsive test infrastructure, then the left-rail `Layout`
shell (single-nav render), the content measure cap, and login vertical centring. Everything else in
this intent assumes the rail and the cap exist.

## Stories Included

- [ ] **009-responsive-test-infrastructure**: `matchMedia` polyfill + `ChakraProvider` render helper — Priority: Must
- [ ] **001-left-rail-navigation**: rail at md+, header + tab bar below md, one nav rendered at a time — Priority: Must
- [ ] **002-content-measure-cap**: 720 / 1080px `mx="auto"`, pathname-derived `WIDE_ROUTES` — Priority: Must
- [ ] **003-login-vertical-centring**: replace login `mt` with md+ vertical centring — Priority: Should

Order: 009 first (unblocks testing the rest), then 001 + 002 (same `Layout.tsx`), then 003.

## Expected Outputs

- `src/test/setup.ts` — `window.matchMedia` stub
- `src/test/` render helper (`renderWithProviders`) wrapping `ChakraProvider theme={theme}` (+ Router / QueryClient as needed)
- `src/shared/components/Layout.tsx` — rail + measure cap, from `Layout.reference.tsx`, single-nav via `useBreakpointValue`
- `src/shared/components/Layout.test.tsx` — rewritten
- `src/features/auth/LoginForm.tsx` — md+ vertical centring
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Requires

- None (first bolt of the unit). Intent `003` (complete) supplies `line.brandSubtle` etc.

### Enables

- 033-desktop-layout-ui, 034-desktop-layout-ui

## Success Criteria

- [ ] Every route reachable at md+ via the rail; Store setup + Log out reachable at every breakpoint
- [ ] Exactly one link per route in the DOM
- [ ] App name quieter than a card title (review finding 11)
- [ ] Content capped 720 / 1080px, centred
- [ ] Login vertically centred at md+; unchanged below md
- [ ] `Layout.test.tsx` rewritten; full `vitest run` green
- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

## Notes

`Layout.reference.tsx` uses CSS `display` toggling for the two navs — replaced here with a
`useBreakpointValue` single-nav render so `Layout.test.tsx`'s singular queries stay valid. That is
why 009 (the `matchMedia` polyfill) lands first.
