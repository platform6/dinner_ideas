---
stage: implement
bolt: 035-dino-branding-ui
created: 2026-08-28T00:00:00Z
---

## Implementation Walkthrough: dino-branding-ui

### Summary

Derived a set of transparent, mobile-sized brand assets from the source `logo.png` (dinosaur
only — the "Dino Recipes" wordmark and leaf divider are cropped away), renamed the visible
product to "Dino Recipes" across the five agreed surfaces, and rendered the new mark in the
desktop rail header, the mobile header, the login screen, the browser favicon, and the PWA
manifest icons.

### Structure Overview

Asset preparation is a single checked-in Node script (`scripts/prepare-logo-assets.mjs`) that
decodes/encodes PNG and resamples using only `node:zlib` — no image library, matching the
project's existing "no external image dependency" convention. It flattens the line art to one
flat colour (the app's `brand.500` olive) plus an alpha key so the RGBA PNGs stay small. The
generated files live in `public/` and are committed; the script is run only if the source logo
or its parameters change. Everything else is small, targeted edits to existing chrome files.

### Completed Work

- [x] `scripts/prepare-logo-assets.mjs` — one-off: decode `logo.png`, crop to the dinosaur,
      trim to the ink bbox, key the cream background to transparent, flatten ink to `brand.500`,
      box-downscale (premultiplied) and write the six assets below
- [x] `scripts/generate-pwa-icons.mjs` — **deleted** (superseded; it produced the old procedural
      "plate" `icon-192/512.png`)
- [x] `public/dino-mark.png` — new, 144×160, transparent, 9.7 KB — the in-app display mark
- [x] `public/icon-192.png` — replaced, 192×192, transparent dino, 10 KB (PWA `any`)
- [x] `public/icon-512.png` — replaced, 512×512, transparent dino, 22 KB (PWA `any`)
- [x] `public/icon-maskable-512.png` — new, 512×512, opaque `#FFFDFA`, dino in a 62% safe zone,
      24 KB (PWA `maskable`)
- [x] `public/favicon-32.png` — new, 32×32, transparent, 1.2 KB
- [x] `public/apple-touch-icon.png` — new, 180×180, opaque `#FFFDFA` tile, 11 KB
- [x] `public/icon.svg` — **deleted** (no longer referenced)
- [x] `index.html` — `<title>` → "Dino Recipes"; `rel="icon"` now `favicon-32.png` + `icon-192.png`
      (PNG); `rel="apple-touch-icon"` → `apple-touch-icon.png`
- [x] `vite.config.ts` — `VitePWA` manifest `name` / `short_name` → "Dino Recipes"; `icons` array
      → the three PNGs (dropped the `icon.svg` entry)
- [x] `src/shared/components/Layout.tsx` — `Image` added to the Chakra import; the desktop rail
      header and the mobile header each now show the mark (`h="22px"`) beside a
      "Dino Recipes" `Text`
- [x] `src/features/auth/LoginForm.tsx` — `Image` added to the Chakra import; the `uiIcons.logo`
      glyph and its `brand.100` circle are replaced by the mark (`boxSize="64px"`); heading →
      "Dino Recipes"; tagline unchanged

### Key Decisions

- **Pure-Node asset script over Pillow/sharp**: keeps the toolchain dependency-free, consistent
  with the script it replaces.
- **Flatten ink to `brand.500` + 8-step alpha**: the source is a single green hue on cream;
  snapping RGB to one flat colour gave large flat runs, cutting `icon-512.png` from ~100 KB to
  22 KB, and makes the mark match the app palette exactly.
- **Separate `icon-maskable-512.png` (opaque, 62% zone)** instead of reusing the transparent 512
  for the maskable slot — a maskable icon should be opaque and keep its content inside the safe
  zone.
- **Opaque cream tile for `apple-touch-icon.png`** — iOS composites apple-touch icons on an
  opaque background; a transparent one would render on black.
- **Login circle dropped (OQ-1)** — a bare transparent mark reads better than a detailed
  illustration boxed in a tinted circle.
- **`icon.svg` deleted (OQ-2)** rather than left orphaned.

### Deviations from Plan

- Plan sized the in-app mark at 160 px "longest side"; the trimmed dino is portrait, so the file
  is 144×160 (height is the long side) — same intent.
- Added a second `rel="icon"` (`icon-192.png`) in `index.html` alongside the 32 px favicon, so
  desktop tabs and higher-DPI contexts get a crisper icon. Not in the plan; harmless.
- `index.html` keeps the lucide `uiIcons.logo` export in `icons.tsx` untouched — `RailLink`'s
  prop type (`Icon: typeof uiIcons.logo`) still references it.

### Dependencies Added

- None shipped. `scripts/prepare-logo-assets.mjs` uses only `node:zlib` / `node:fs`.

### Developer Notes

- To regenerate the assets after a logo change: `node scripts/prepare-logo-assets.mjs`. Tune
  `DINO_CROP`, `KEY_OPAQUE_BELOW` / `KEY_CLEAR_ABOVE`, or the per-asset `frac` values at the
  bottom of the file.
- `tsc -b`, `eslint .`, and `pnpm build` are clean. The generated `dist/manifest.webmanifest`
  carries `name`/`short_name` "Dino Recipes" and the three PNG icons.
- The 500 kB chunk-size warning from `vite build` is pre-existing and unrelated to this bolt.
