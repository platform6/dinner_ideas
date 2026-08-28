---
unit: 001-dino-branding-ui
intent: 006-dino-branding
phase: inception
status: complete
created: '2026-08-28T00:00:00Z'
updated: '2026-08-28T00:00:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Dino Branding UI

## Purpose

Integrate the supplied dinosaur logo as the app mark and rename the visible product to
"Dino Recipes" on the five agreed surfaces. Presentation-only, one bolt.

## Scope

### In Scope

- Prepare mark-only, transparent, mobile-sized assets from `logo.png` (FR-1)
- Rename "Dinner Ideas" → "Dino Recipes" in `Layout.tsx` (rail + mobile header),
  `LoginForm.tsx` (heading), `index.html` (`<title>`), `vite.config.ts` (manifest
  `name` / `short_name`) (FR-2)
- Render the dino mark in the rail header, the mobile header, and on the login screen
  (replacing `uiIcons.logo`) (FR-3)
- Repoint favicon + apple-touch + PWA manifest icons at the new assets (FR-4)
- Update affected tests

### Out of Scope

- `package.json` name, the repo name, `memory-bank/` docs, code comments
- The login tagline "Three dinners, one shopping list." and the manifest `description`
- Any SVG redraw, dark-mode variant, animation, or responsive art direction
- Any change to routing, data, state, or non-`LoginForm` feature code

---

## Assigned Requirements

| FR   | Requirement                                     | Priority |
| ---- | ----------------------------------------------- | -------- |
| FR-1 | Prepare trimmed transparent dino-mark asset set | Must     |
| FR-2 | Rename visible product to "Dino Recipes"        | Must     |
| FR-3 | Show the dino mark in app chrome + login        | Must     |
| FR-4 | Wire the dino mark as favicon + PWA icon        | Should   |

---

## Domain Concepts

### Key Entities

_None. No data model._

### Key Operations

| Operation         | Description                                         | Inputs           | Outputs        |
| ----------------- | --------------------------------------------------- | ---------------- | -------------- |
| Render brand mark | Chakra `<Image>` of the dino mark in chrome / login | asset URL, `alt` | themed markup  |
| Resolve app name  | Static string / manifest field read                 | —                | "Dino Recipes" |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 3     |
| Must Have     | 3     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                                | Title                                               | Priority | Status  |
| --------------------------------------- | --------------------------------------------------- | -------- | ------- |
| 001-prepare-dino-mark-assets            | Trimmed transparent dino-mark asset set             | Must     | Planned |
| 002-dino-recipes-wordmark-and-title     | "Dino Recipes" text on the five surfaces            | Must     | Planned |
| 003-dino-mark-in-chrome-login-and-icons | Mark in rail / header / login + favicon + PWA icons | Must     | Planned |

---

## Dependencies

### Depends On

_None._

### Depended By

_None._

### External Dependencies

| System            | Purpose                          | Risk |
| ----------------- | -------------------------------- | ---- |
| `vite-plugin-pwa` | Build-time manifest name + icons | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 `<Image>`, existing Vite + `vite-plugin-pwa`, Vitest/RTL. Asset editing is a one-off
(any image tool); the committed PNGs are the deliverable — no runtime image processing.

### Integration Points

| Integration                              | Type   | Protocol    |
| ---------------------------------------- | ------ | ----------- |
| `index.html` `<head>`                    | Edited | HTML        |
| `vite.config.ts` `VitePWA({ manifest })` | Edited | Vite config |

### Data Storage

_None._

---

## Constraints

- Files touched: `Layout.tsx`, `LoginForm.tsx`, `index.html`, `vite.config.ts`, `public/` assets,
  and the matching test files. Nothing else.
- In-app mark asset ≤ ~15 KB; `logo.png` is never served to the client.
- Light mode only; Chakra v2; no new dependencies.

## Success Criteria

### Functional

- [ ] Trimmed transparent mark assets exist at the sizes FR-1 lists; `logo.png` is unreferenced
- [ ] No "Dinner Ideas" text on the rail header, mobile header, login heading, `<title>`, or manifest
- [ ] The dino mark renders in the rail header, the mobile header, and on login; `uiIcons.logo` is gone from login
- [ ] Browser tab + installed-PWA icon show the dino mark; `vite build` manifest lists the new icons

### Non-Functional

- [ ] Mark green reads acceptably on `paper.base` (informal spot-check)
- [ ] No layout shift/overflow at the `md` breakpoint
- [ ] In-app mark adds ≤ ~15 KB

### Quality

- [ ] `npx tsc -b`, `eslint`, `vite build` clean; existing suite green with updated assertions
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                 | Type   | Stories       | Objective                                                                                   |
| -------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------- |
| 035-dino-branding-ui | Simple | 001, 002, 003 | Prepare assets, rename to "Dino Recipes", wire the mark into chrome / login / favicon / PWA |

Sequence within the bolt: `001` (assets) → `002` (text) → `003` (mark wiring + icons).

---

## Notes

`uiIcons.logo` stays exported from `src/shared/components/icons.tsx` — `RailLink`'s type
annotation (`Icon: typeof uiIcons.logo`) references it — it just stops being rendered on the
login screen.
