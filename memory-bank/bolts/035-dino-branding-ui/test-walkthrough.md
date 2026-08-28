---
stage: test
bolt: 035-dino-branding-ui
created: 2026-08-28T00:00:00Z
---

## Test Report: dino-branding-ui

### Summary

- **Tests**: 136/136 passed (21 files) — full suite
- **New/changed test files**: 2 (`Layout.test.tsx` +1 case, `LoginForm.test.tsx` +1 case)
- **Toolchain**: `tsc -b` clean, `eslint .` clean, `pnpm build` clean
- **Coverage**: no formal % target (per `standards/coding-standards.md`); branding is
  presentation-only, so verification is component assertions + the production build output

### Test Files

- [x] `src/shared/components/Layout.test.tsx` — added _"shows the 'Dino Recipes' wordmark and the
      dino mark in the header"_: asserts the phone-view header renders the `Dino Recipes` text,
      no `Dinner Ideas` text, and an `img` named "Dino Recipes" with `src="/dino-mark.png"`
- [x] `src/features/auth/LoginForm.test.tsx` — added _"shows the 'Dino Recipes' heading and the
      dino mark instead of the old glyph"_: asserts the heading is `Dino Recipes` (and not
      `Dinner Ideas`) and the mark `img` is present with the right `src`
- [x] Existing suite (dinners, weekly-plan, shopping-list, cooking-view, store-config, auth,
      layout) — re-run unchanged, all green

### Acceptance Criteria Validation

**FR-1 — asset set**

- ✅ `scripts/prepare-logo-assets.mjs` regenerates every asset from `logo.png` deterministically
  (run twice, identical output)
- ✅ `public/dino-mark.png` transparent, dinosaur only (wordmark cropped), 9.7 KB (≤ ~15 KB)
- ✅ `icon-192.png` / `icon-512.png` replaced (transparent); `icon-maskable-512.png`,
  `favicon-32.png`, `apple-touch-icon.png` created; `public/icon.svg` deleted
- ✅ `icon-512.png` 22 KB (< ~40 KB)

**FR-2 — rename**

- ✅ `grep -rn "Dinner Ideas" src index.html vite.config.ts` → only two hits, both code comments
  (`icons.tsx`, `theme/index.ts`), which are explicitly out of scope
- ✅ Rail header, mobile header, login heading, `<title>`, manifest `name`/`short_name` all read
  "Dino Recipes"
- ✅ `package.json` name, manifest `description`, login tagline, comments — unchanged
- ✅ Component tests updated and passing

**FR-3 — mark in chrome + login**

- ✅ Mobile header: `img` name "Dino Recipes", `src="/dino-mark.png"` — asserted in
  `Layout.test.tsx`
- ✅ Login: lucide `uiIcons.logo` glyph + `brand.100` circle replaced by the `img`;
  `uiIcons.logo` still exported (`RailLink`'s prop type) — `tsc` passes
- ☐ Desktop rail header mark — code adds it identically to the mobile header, but the rail is
  the `md+` view and `useBreakpointValue` resolves to `base` under jsdom (documented in
  `Layout.test.tsx`), so it is **browser-verified**, not unit-tested
- ☐ No layout shift / horizontal overflow at `md` — `h="22px"` mark inside the existing header
  flex clusters; `pnpm build` clean; final confirmation is a browser check

**FR-4 — favicon + PWA**

- ✅ `index.html`: `rel="icon"` → `favicon-32.png` + `icon-192.png`; `rel="apple-touch-icon"` →
  `apple-touch-icon.png`
- ✅ `vite.config.ts` manifest `icons` → `icon-192` / `icon-512` / `icon-maskable-512`
- ✅ `pnpm build` succeeds; `dist/manifest.webmanifest` has `name`/`short_name` "Dino Recipes"
  and the three PNG icons; no `icon.svg` reference; all six PNGs emitted to `dist/`

### Issues Found

None blocking. Two criteria (desktop rail mark rendering, no `md` layout shift) can only be
fully confirmed in a browser — the code path is shared with the unit-tested mobile header and
the build is clean, so risk is low.

### Notes

- React Router v7 future-flag warnings in the test output are pre-existing and unrelated.
- The `vite build` 500 kB chunk-size warning is pre-existing.
