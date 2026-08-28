---
id: 001-prepare-dino-mark-assets
unit: 001-dino-branding-ui
intent: 006-dino-branding
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 035-dino-branding-ui
implemented: true
---

# Story: 001-prepare-dino-mark-assets

## User Story

**As a** mobile user of the app
**I want** the logo to be a small, clean, transparent image
**So that** it loads fast and sits properly on the app's paper background without a white box

## Acceptance Criteria

- [ ] **Given** the source `logo.png`, **When** the mark is prepared, **Then** it is cropped to
      the dinosaur illustration only — the baked-in "Dino Recipes" wordmark is removed
- [ ] **Given** the crop, **Then** the off-white background is transparent (alpha), with no
      visible halo/fringe on `paper.base` (#FFFDFA)
- [ ] **Given** the prepared mark, **Then** these files exist: - an in-app display mark (~96 px on its longest side, transparent PNG) in `public/` or
      `src/assets/` - `public/icon-192.png` and `public/icon-512.png` — replaced with the dino mark - a 32 px favicon and a 180 px apple-touch icon in `public/`
- [ ] **Given** file sizes, **Then** the in-app display mark is ≤ ~15 KB and `icon-512.png` is
      < ~40 KB
- [ ] **Given** the repo, **Then** `logo.png` remains only as the source (root) and is not
      imported or linked by any shipped code
- [ ] **Given** the assets, **Then** they are committed to the repo (this is not a runtime
      pipeline)

## Technical Notes

- Any image tool is fine for the one-off crop / background key / resize. Squash a Construction
  note describing exactly what was done so it's reproducible.
- The maskable 512 icon needs safe padding — keep the dino within the central ~80% so it isn't
  clipped by a circular mask.
- If a 32 px raster favicon looks muddy, keeping the existing `public/icon.svg` is an acceptable
  fallback (OQ-2) — but the 192/512 PWA icons must be the dino.

## Dependencies

### Requires

- None (first story)

### Enables

- `003-dino-mark-in-chrome-login-and-icons` (consumes every asset produced here)

## Edge Cases

| Scenario                                                                       | Expected Behavior                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| The line-art has anti-aliased near-white pixels against the background         | Key with a tolerance / matte to transparent; accept a 1px soft edge over a hard halo |
| Transparent mark is nearly invisible on a white surface                        | It won't be — the art is dark green; but verify on `paper.base` and the login screen |
| Existing `icon-192.png` / `icon-512.png` referenced by a cached service worker | `vite-plugin-pwa` `autoUpdate` re-precaches on deploy; no action needed              |

## Out of Scope

- SVG / vector version
- Multiple color variants or a dark-mode mark
- Wiring the assets into markup / config (story `003`)
