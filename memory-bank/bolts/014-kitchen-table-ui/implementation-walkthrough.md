---
stage: implement
bolt: 014-kitchen-table-ui
created: 2026-08-27T10:00:00Z
---

## Implementation Walkthrough: kitchen-table-ui (foundation)

### Summary

Dropped in the "Kitchen Table" design tokens (`theme.ts`) and icon vocabulary (`icons.tsx`) from the design handoff, wired up Google Fonts and `ChakraProvider`, and recolored every teal-branded surface (favicon, PWA manifest/icons, browser theme-color) to the new olive palette. No screen component changed — every existing page renders under the new tokens using Chakra's default component styling until its own restyle bolt lands.

### Structure Overview

Two new files land close to verbatim from the handoff (`src/shared/theme/index.ts`, `src/shared/components/icons.tsx`); everything else is a small, targeted edit to existing config/bootstrap files (`main.tsx`, `index.html`, `vite.config.ts`) or brand-color literals (`public/icon.svg`, `scripts/generate-pwa-icons.mjs`).

### Completed Work

- [x] `src/shared/theme/index.ts` (new) — the handoff's Chakra `extendTheme` config, used as-written
- [x] `src/shared/components/icons.tsx` (new) — the handoff's Lucide icon vocabulary, used as-written for this bolt
- [x] `package.json` — added `lucide-react`
- [x] `src/main.tsx` — `<ChakraProvider theme={theme}>` importing from `@/shared/theme`
- [x] `index.html` — Lora + Outfit `<link>` tags added; `theme-color` meta updated to `#4A6741`
- [x] `vite.config.ts` — PWA manifest `theme_color` updated to `#4A6741`
- [x] `public/icon.svg` — recolored (brand.500 fill, brand.600 ring, paper.base center, was teal/dark-teal/white)
- [x] `scripts/generate-pwa-icons.mjs` — recolored its hardcoded RGB literals the same way, then re-run to regenerate `public/icon-192.png`/`icon-512.png`
- [x] `src/shared/components/icons.test.ts` (new) — unit tests for `cuisineIcon`/`categoryIcon`/`stepIcon`'s fallback and keyword-matching logic

### Key Decisions

- **No component (`.tsx` page) changes in this bolt** — confirmed via a live screenshot that the theme's global component overrides (`Button`, `Input`, `Heading`, etc.) already visibly transform every existing screen without touching their markup; the per-screen restyle bolts (`015`–`019`) add the layout/structural changes on top of this foundation.
- **Icon vocabulary landed as-is**; new entries for week-nav/store-config/tag icons are deferred to the stories that actually consume them (`008`, `009`/`012` per `002-icon-vocabulary`'s own note), so this bolt doesn't guess at icons nothing yet uses.

### Deviations from Plan

None — matches `implementation-plan.md` as approved.

### Dependencies Added

- [x] `lucide-react` — icon glyphs (verified: no unrelated package version changes; the large `pnpm-lock.yaml` diff is peer-dependency-resolution annotation churn only, confirmed by diffing actual pinned versions)

### Developer Notes

- Live-verified via a browser screenshot (see `test-walkthrough.md`) rather than just trusting the build — this is a visual-design bolt, so seeing it render mattered more than usual.
- Ran `npx tsc -b`, `npx eslint .`, `npx vitest run` (107/107 passing), and `npx vite build` — all clean.
