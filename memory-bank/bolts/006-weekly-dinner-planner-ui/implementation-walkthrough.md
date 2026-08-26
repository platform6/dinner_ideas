---
stage: implement
bolt: 006-weekly-dinner-planner-ui
created: 2026-08-26T22:27:38Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 4 of 4 original; final polish)

### Summary

Added the "last made" variety cue (with a new least-recently-made-first default catalog order) and full PWA support — installable manifest, service worker with offline caching for Supabase data, and app icons generated locally rather than sourced externally.

### Structure Overview

Variety indicator logic lives in `dinners/last-chosen.ts` (pure date formatting/sorting) alongside the existing `filters.ts`, following the same pattern as prior bolts. PWA setup is entirely configuration (`vite.config.ts`, `index.html`, `public/`) plus a one-off icon-generation script — no new application code paths.

### Completed Work

- [x] `src/features/dinners/last-chosen.ts` — `daysSince`, `formatLastChosen` ("Never made" / "Made today" / "Last made N day(s)/week(s)/month(s)/year(s) ago"), `daysSinceForSort`
- [x] `src/features/dinners/api.ts` — added `fetchLastChosenDates` (reads the `dinner_last_chosen` view)
- [x] `src/features/dinners/hooks.ts` — added `useLastChosenDates`
- [x] `src/features/dinners/filters.ts` — `applyFilters` now takes an optional `lastChosenDates` map; when cook-time sort is off, the default order is least-recently-made-first (was alphabetical)
- [x] `DinnerCard.tsx` — shows the "last made" text; gave the pick checkbox a dinner-specific `aria-label` (was identical text on every card — a real accessibility gap surfaced while updating a test)
- [x] `CatalogPage.tsx` — wires `useLastChosenDates` into both the sort and each card's display text
- [x] `vite.config.ts` — `VitePWA` plugin: manifest, `autoUpdate` registration, `NetworkFirst` runtime caching for Supabase REST calls
- [x] `scripts/generate-pwa-icons.mjs` — one-off script producing `public/icon-192.png` / `icon-512.png` via raw PNG encoding (no external asset dependency)
- [x] `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png` — app icons
- [x] `index.html` — theme-color meta tag, favicon and apple-touch-icon links

### Key Decisions

- **`lastChosenDates` is optional on `applyFilters`** (defaults to an empty map): avoided touching every existing call site/test from bolt 003; with an empty map every dinner ties at "never made" and falls back to the pre-existing alphabetical order, so no prior test needed to change.
- **One broad `NetworkFirst` rule for all Supabase REST traffic**, not per-endpoint allowlisting — see the Stage 1 checkpoint discussion; simplest design most likely to work given this bolt's flagged uncertainty.
- **Self-generated PNG icons** (`scripts/generate-pwa-icons.mjs`, raw PNG encoding via Node's `zlib`) instead of sourcing an image asset — keeps the bolt fully self-contained and reproducible.
- **`aria-label` added to the pick checkbox**: found while adjusting a test that assumed positional DOM order, which broke once the default sort order changed. Fixed the actual accessibility gap (every checkbox had the identical accessible name "Pick for this week") rather than just working around it in the test.

### Deviations from Plan

None — implemented as scoped in `implementation-plan.md`.

### Dependencies Added

- [x] `vite-plugin-pwa` — manifest + service worker generation, per `standards/tech-stack.md`

### Developer Notes

- The "first-ever visit with no network" edge case needs no extra handling: with no service worker installed yet, the browser's own offline error page appears, which the story explicitly accepts as sufficient.
- `pnpm run lint`, `pnpm exec tsc -b`, `pnpm run build` (confirms `dist/sw.js`, `dist/manifest.webmanifest` are generated and `index.html` is correctly injected), and the full test suite (41/41) all pass clean.
