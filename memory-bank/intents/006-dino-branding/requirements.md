---
intent: 006-dino-branding
phase: inception
status: complete
created: '2026-08-28T00:00:00Z'
updated: '2026-08-28T00:00:00Z'
---

# Requirements: dino-branding

## Intent Overview

Integrate the supplied `logo.png` (a chef-hatted dinosaur illustration with a "Dino Recipes"
wordmark) as the app's brand, and rename the visible product name from "Dinner Ideas" to
"Dino Recipes". Deliberately light — a presentation-only pass over the app chrome, the login
screen, the document title, and the PWA manifest. No routing, data, or feature change.

Inserted ahead of `004-account-model` construction at the user's request; `004`'s follow-on
intents shift to `007-auth-flows` / `008-account-settings`.

## Business Goals

| Goal                                                          | Success Metric                                                                                                                               | Priority |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| The dinosaur logo is the app's mark everywhere a mark appears | Rail header, mobile header, login screen, browser tab, and installed-PWA icon all show the dino mark                                         | Must     |
| The product reads as "Dino Recipes"                           | No visible "Dinner Ideas" string remains in the rail header, mobile header, login heading, `<title>`, or PWA manifest                        | Must     |
| The mark loads well on mobile                                 | The in-app mark asset is a trimmed, transparent PNG at a small display size (target ≤ ~15 KB); no full-size `logo.png` shipped to the client | Should   |

---

## Functional Requirements

### FR-1: Prepare a trimmed, transparent dino-mark asset set

- **Description**: From the source `logo.png`, produce **mark-only** assets — the dinosaur
  illustration cropped out, the baked-in "Dino Recipes" wordmark removed, and the off-white
  background made transparent. Export the small raster sizes the app needs:
  - a display mark for in-app chrome / login (target ~96 px, transparent PNG),
  - `icon-192.png` and `icon-512.png` (replace the existing files) for the PWA,
  - a favicon (32 px) and apple-touch icon (180 px).
- **Acceptance Criteria**:
  - New/updated asset files live in `public/` (PWA/favicon) and `src/assets/` (or `public/`) for
    the in-app mark; the original `logo.png` is not referenced by any shipped code.
  - Each asset has a transparent background and shows only the dinosaur (no wordmark).
  - The in-app display mark is ≤ ~15 KB; `icon-512.png` stays a reasonable size (< ~40 KB).
- **Priority**: Must

### FR-2: Rename the visible product to "Dino Recipes"

- **Description**: Replace the text "Dinner Ideas" with "Dino Recipes" in exactly these places:
  - `src/shared/components/Layout.tsx` — the desktop rail header text and the mobile header text
  - `src/features/auth/LoginForm.tsx` — the `<Heading>` ("Dinner Ideas")
  - `index.html` — `<title>`
  - `vite.config.ts` — `VitePWA` manifest `name` and `short_name`
- **Acceptance Criteria**:
  - None of those five surfaces render "Dinner Ideas" anymore.
  - Out of scope and left unchanged: `package.json` `name`, the repo, the login tagline
    "Three dinners, one shopping list.", the manifest `description`, code comments, and all
    `memory-bank/` docs.
  - Tests that assert the old string in these surfaces are updated.
- **Priority**: Must

### FR-3: Show the dino mark in the app chrome and on the login screen

- **Description**: Render the dino-mark image:
  - `Layout.tsx` — beside the "Dino Recipes" text in the 240 px desktop rail header and in the
    mobile top header (small, ~20–28 px tall).
  - `LoginForm.tsx` — in place of the current `uiIcons.logo` lucide glyph above the heading
    (keep or drop the surrounding `brand.100` circle — implementer's call, whichever looks
    right with a transparent mark).
  - All use the same asset from FR-1, with sensible `alt` text ("Dino Recipes").
- **Acceptance Criteria**:
  - The lucide `uiIcons.logo` mark no longer appears on the login screen.
  - The mark is present in both the desktop rail header and the mobile header.
  - Images have non-empty `alt`; layout does not shift or overflow at the `md` breakpoint.
- **Priority**: Must

### FR-4: Wire the dino mark as favicon and PWA icon

- **Description**: Point `index.html` (`rel="icon"`, `rel="apple-touch-icon"`) and the
  `vite.config.ts` manifest `icons` array at the new assets from FR-1, replacing the current
  `icon.svg` / `icon-192.png` / `icon-512.png` references (a `maskable` 512 entry is retained).
- **Acceptance Criteria**:
  - The browser tab shows the dino mark.
  - `vite build` succeeds and the generated manifest lists the new icons (192, 512, 512
    maskable).
  - No broken `icon.svg` reference remains (file may be deleted or left unreferenced).
- **Priority**: Should

---

## Non-Functional Requirements

### Compatibility

| Requirement          | Notes                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| No feature/UX change | Only the mark and the product name change; navigation, layout structure, and all flows behave exactly as before                            |
| Theme fit            | The mark's green reads acceptably on `paper.base` in both the rail and the login screen (informal spot-check, per `standards/ux-guide.md`) |

### Performance

| Requirement         | Target                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Client asset weight | The in-app mark adds ≤ ~15 KB; the full-resolution `logo.png` is never served to the browser |

---

## Constraints

### Technical Constraints

- Chakra UI v2, existing Vite + `vite-plugin-pwa` setup; no new dependencies.
- Asset editing (crop / background removal / resize) is a build-time / one-off step; the
  committed assets are the deliverable, not a runtime image pipeline.
- Presentation-layer only — no changes under `src/features/*` beyond `LoginForm.tsx`, and no
  Supabase, routing, or state changes.

### Business Constraints

- The rename is limited to the five surfaces in FR-2 — this is a visible-brand pass, not a
  full project rename.

---

## Assumptions

| Assumption                                                                                         | Risk if Invalid                                                  | Mitigation                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| "Rail header" in the user's instruction means both chrome wordmarks (desktop rail + mobile header) | The mobile header keeps saying "Dinner Ideas"                    | Called out here for Checkpoint review; trivial to narrow                                                     |
| The dinosaur can be cleanly separated from the wordmark and background in `logo.png`               | A crisp transparent mark isn't achievable from the raster source | Accept a tight rectangular crop with the near-white background keyed out; revisit with a vector redraw later |
| A raster favicon is acceptable in place of the current `icon.svg`                                  | Slight quality loss at tiny sizes                                | Export favicon at 32 px from the highest-res crop; keep `icon.svg` if the result is poor                     |

## Open Questions

| #    | Question                                                                              | Resolution                                                              |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| OQ-1 | Keep the `brand.100` circle behind the login mark, or show the transparent dino bare? | Implementer's call during the bolt; note the choice                     |
| OQ-2 | Delete `public/icon.svg`, or leave it unreferenced?                                   | Non-blocking; default is to leave it unless it trips a lint/build check |

## Out of Scope (Won't — this intent)

- Renaming `package.json`, the git repo, or any `memory-bank/` document
- Changing the login tagline or the manifest `description`
- A vector (SVG) redraw of the logo
- Any animation, dark-mode variant, or responsive art direction for the mark
- Splash screens beyond what `vite-plugin-pwa` generates from the manifest icons
