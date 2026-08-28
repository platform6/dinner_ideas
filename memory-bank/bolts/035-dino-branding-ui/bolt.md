---
id: 035-dino-branding-ui
unit: 001-dino-branding-ui
intent: 006-dino-branding
type: simple-construction-bolt
status: complete
stories:
  - 001-prepare-dino-mark-assets
  - 002-dino-recipes-wordmark-and-title
  - 003-dino-mark-in-chrome-login-and-icons
created: '2026-08-28T00:00:00Z'
started: '2026-08-28T00:00:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T00:00:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T00:00:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T20:09:39Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
completed: '2026-08-28T20:09:39Z'
---

# Bolt: 035-dino-branding-ui

## Objective

Ship the dino-logo integration and the "Dino Recipes" rename in one pass: prepare trimmed
transparent mark assets from `logo.png`, rename the five visible-brand surfaces, and wire the
mark into the rail header, mobile header, login screen, favicon, and PWA manifest icons.

## Stories Included

- [ ] **001-prepare-dino-mark-assets**: crop to the dino, transparent background, mobile-sized
      PNGs (in-app ~96 px, `icon-192`/`icon-512` replaced, 32 px favicon, 180 px apple-touch) —
      Priority: Must
- [ ] **002-dino-recipes-wordmark-and-title**: "Dinner Ideas" → "Dino Recipes" in `Layout.tsx`
      (rail + mobile header), `LoginForm.tsx` heading, `index.html` `<title>`, `vite.config.ts`
      manifest `name`/`short_name` — Priority: Must
- [ ] **003-dino-mark-in-chrome-login-and-icons**: render the mark in the rail header, mobile
      header, and login (replacing `uiIcons.logo`); repoint `index.html` + manifest icons —
      Priority: Must

## Expected Outputs

- `public/` assets (new + replaced icons) and an in-app display mark
- `src/shared/components/Layout.tsx`, `src/features/auth/LoginForm.tsx`, `index.html`,
  `vite.config.ts`
- Updated `Layout.test.tsx`, `LoginForm.test.tsx`, and any affected snapshots
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- None — single bolt

### Unit Dependencies (cross-unit)

- None — independent of `004-account-model` and every other intent

### Enables

- None

## Success Criteria

- [ ] Trimmed transparent mark assets committed at the sizes story `001` lists; `logo.png` unreferenced by shipped code
- [ ] No "Dinner Ideas" on the rail header, mobile header, login heading, `<title>`, or manifest (`grep -rn "Dinner Ideas" src index.html vite.config.ts` is empty)
- [ ] Dino mark renders in the rail header, mobile header, and login; `uiIcons.logo` gone from login
- [ ] Browser tab + installed-PWA icon show the dino; `vite build` manifest lists the new icons
- [ ] No `md`-breakpoint layout shift/overflow; in-app mark ≤ ~15 KB
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; suite green with updated assertions
- [ ] Code reviewed

## Notes

Internal order: `001` (assets) → `002` (text) → `003` (wire the mark + icons). `002` has no hard
dependency on `001` and can go first if convenient. Keep `uiIcons.logo` exported — `RailLink`'s
prop type still references it.
