---
stage: plan
bolt: 006-weekly-dinner-planner-ui
created: 2026-08-26T22:11:00Z
---

## Implementation Plan: weekly-dinner-planner-ui (bolt 4 of 4 original; final polish)

### Objective

Round out the app with its two "Should"-priority enhancements: a "last made" variety cue (and recency-based default catalog ordering), and PWA installability with offline access to the current shopping list.

### Deliverables

**Variety indicator** (`007-variety-indicator`)
- `src/features/dinners/api.ts`: add `fetchLastChosenDates()` — reads the `dinner_last_chosen` view (from `002-weekly-planning`), returns a `Map<dinnerId, lastChosenDate | null>`
- `src/features/dinners/hooks.ts`: add `useLastChosenDates()`
- `src/features/dinners/last-chosen.ts` — pure functions: `daysSince(date, now?)`, `formatLastChosen(lastChosenDate, now?)` (→ "Never made" / "Last made N day(s)/week(s)/month(s)/year(s) ago")
- `src/features/dinners/filters.ts`: extend `applyFilters` with an optional `lastChosenDates` map (defaults to empty). When `sortByCookTime` is off (the default), order by **least-recently-made first** (never-made dinners first) instead of the current alphabetical default; cook-time sort, when on, is unchanged and takes priority
- `DinnerCard.tsx` / `CatalogPage.tsx`: show the formatted "last made" text on each card

**PWA install & offline** (`008-pwa-install-offline`)
- `vite-plugin-pwa` (added as a dev dependency — network access confirmed) configured in `vite.config.ts`: `registerType: 'autoUpdate'`, manifest (name, short_name, theme/background color, icons), Workbox `runtimeCaching` rule for Supabase REST calls (`NetworkFirst`, so online data stays fresh but the last successful response — including the current plan/shopping list — remains available offline)
- `public/icon.svg` — a small hand-authored icon (no external asset dependency); manifest also references generated 192×192/512×512 PNGs (`public/icon-192.png`, `public/icon-512.png`) for platforms that need raster icons (e.g. iOS home-screen), produced by a one-off local script rather than fetched from anywhere
- `index.html`: theme-color meta tag, apple-touch-icon link
- A first-visit-offline message: if the app shell itself isn't cached yet, show a plain "You're offline — connect once to load the app" fallback (per the story's edge case) rather than a blank/broken screen

### Dependencies

- `002-weekly-planning` (complete): `dinner_last_chosen` view
- `005-generate-shopping-list` (complete): something meaningful to cache/view offline
- New dev dependency: `vite-plugin-pwa` (confirmed installable — network access available)

### Technical Approach

- **Variety is a nudge, not a restriction** (per the story): recently-made dinners stay fully selectable; only the default sort order and the display text change.
- **Default ordering change**: `applyFilters`'s cook-time-sort branch is unchanged; when it's off, dinners now sort by days-since-last-chosen descending (never-made treated as `Infinity`, sorting first), tie-broken alphabetically by name for determinism. `lastChosenDates` is an optional parameter defaulting to an empty map so existing call sites/tests aren't broken by the signature change.
- **Offline scope stays intentionally narrow**: one `NetworkFirst` runtime-caching rule for Supabase REST traffic is simpler than trying to precisely allowlist "only the current plan's endpoints," and matches the story's explicit "full catalog offline is nice-to-have, not required" — whatever happens to be cached from normal use is what's available offline.
- **SVG + generated PNG icons instead of a placeholder image dependency**: keeps the bolt self-contained; the PNGs are produced by a small local script (raw PNG encoding via Node's `zlib`), not downloaded from anywhere.
- **`autoUpdate` registration type**: matches the story's "updates on next online launch without breaking the cached offline view" — no manual "new version available" prompt needed at this scale.

### Acceptance Criteria

- [ ] A dinner chosen in a past locked plan shows "Last made N [unit] ago" in the catalog
- [ ] A never-chosen dinner shows "Never made"
- [ ] With no other sort applied, dinners not made recently are surfaced ahead of recently-repeated ones
- [ ] Recently-made dinners remain fully selectable (no restriction)
- [ ] The app is installable to a mobile home screen (manifest + service worker present, icons valid)
- [ ] After an initial online visit, losing connectivity still allows viewing the current shopping list
- [ ] The installed app launches full-screen (standalone display mode)
- [ ] A first-ever offline visit (nothing cached yet) shows a clear message instead of breaking
