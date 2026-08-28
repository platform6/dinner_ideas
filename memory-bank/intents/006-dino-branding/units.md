---
intent: 006-dino-branding
phase: inception
status: units-decomposed
updated: 2026-08-28T00:00:00Z
---

# Dino Branding - Unit Decomposition

## Units Overview

One unit. Every FR is frontend presentation work against the existing app shell — the same
single-UI-unit shape as `003-frontend-review-remediation` and `005-desktop-layout`. There is no
backend surface.

### Unit 1: `001-dino-branding-ui`

**Description**: Owns the whole integration — preparing the trimmed transparent dino-mark assets,
renaming the visible product to "Dino Recipes" on the five agreed surfaces, rendering the mark in
the rail header / mobile header / login screen, and repointing the favicon + PWA manifest icons.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `public/` — trimmed transparent `icon-192.png` / `icon-512.png` (replaced), a 32 px favicon and
  180 px apple-touch icon, and a ~96 px in-app display mark (in `public/` or `src/assets/`)
- `src/shared/components/Layout.tsx` — "Dino Recipes" text + dino mark in the desktop rail header
  and the mobile header
- `src/features/auth/LoginForm.tsx` — dino mark replaces the `uiIcons.logo` glyph; heading →
  "Dino Recipes"
- `index.html` — `<title>` → "Dino Recipes"; `rel="icon"` / `rel="apple-touch-icon"` → new assets
- `vite.config.ts` — manifest `name` / `short_name` → "Dino Recipes"; `icons` → new assets
- Updated tests for `Layout`, `LoginForm`, and any snapshot pinning the old title/name

**Dependencies**:

- Depends on: none (independent of `004-account-model`)
- Depended by: none

**Estimated Complexity**: S — a handful of files, each change small; the only non-trivial step is
producing a clean transparent crop from the raster source.

## Unit Dependency Graph

```text
(independent) ──> [001-dino-branding-ui]
```

## Execution Order

1. `001-dino-branding-ui` (only unit; bolt `035` sequences the work: assets → text rename →
   mark wiring)

## Requirement-to-Unit Mapping

- **FR-1** (Prepare trimmed transparent dino-mark asset set) → `001-dino-branding-ui`
- **FR-2** (Rename visible product to "Dino Recipes") → `001-dino-branding-ui`
- **FR-3** (Show the dino mark in app chrome + login) → `001-dino-branding-ui`
- **FR-4** (Wire the dino mark as favicon + PWA icon) → `001-dino-branding-ui`
