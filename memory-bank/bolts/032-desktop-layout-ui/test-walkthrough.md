---
stage: test
bolt: 032-desktop-layout-ui
created: 2026-08-28T20:00:00Z
---

## Test Report: desktop-layout-ui — bolt 032 (test infra + rail + measure cap + login)

### Summary

- **Tests**: 134 / 134 passed (21 files)
- **Build**: `tsc -b && vite build` clean
- **Lint**: `eslint .` clean (0 / 0)

### Test Files

- [x] `src/shared/components/Layout.test.tsx` — **rewritten** via `renderWithProviders`; 4 tests:
      4 nav links render exactly once + page content; `/plan` marks "This week" active; Store setup +
      Log out outside the tab-bar `nav`; `signOut` on Log-out click
- [x] `src/test/render.tsx` — new shared helper (no tests of its own; exercised by `Layout.test.tsx`)
- [x] `src/test/setup.ts` — `matchMedia` stub; all 21 suites still green (the stub is additive)
- [x] `LoginForm.test.tsx` (3) — unchanged, green (the `Flex` wrapper doesn't change queries)
- [x] remaining 18 suites — unchanged, green

### Acceptance Criteria Validation

- ✅ **`window.matchMedia` stubbed; `renderWithProviders` exists** — `src/test/setup.ts` + `src/test/render.tsx`
- ✅ **Rail at md+, header + tab bar below md, single-nav render** — `useBreakpointValue` picks one
  branch; jsdom → phone branch → `getAllByRole('link', { name })` length 1 per route
- ✅ **App name not `cardTitle`** — `fontFamily="heading"` `0.9375rem`, `ink.700` (header) / `ink.900` (rail)
- ✅ **Store setup + Log out at both breakpoints** — header `IconButton`s (phone) / rail-foot
  `RailLink` + button (desktop); test confirms the phone path
- ✅ **`<main>` inner `maxW` 1080 on `/` + `/store-config`, else 720, `mx="auto"`** — `WIDE_ROUTES` set
- ✅ **Login vertically centred at md+, phone spacing preserved** — `Flex minH={{ md: '100vh' }}
align={{ md: 'center' }}`, inner `mt={{ base: 12, md: 0 }}`
- ✅ **build / lint / full suite green**

### Issues Found

None.

### Notes

The rail (md+ branch) is not exercised in jsdom — `useBreakpointValue` resolves to `base` there.
A browser check of the rail (nav, active state, sticky, foot actions) is a sensible pre-release
step. `renderWithProviders` could later parameterise the breakpoint to test the desktop branch, but
that is out of scope for this bolt.
