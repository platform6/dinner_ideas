---
stage: plan
bolt: 035-dino-branding-ui
created: 2026-08-28T00:00:00Z
---

## Implementation Plan: dino-branding-ui

### Objective

Ship the dinosaur logo and the "Dino Recipes" rename in one bolt: prepare trimmed, transparent,
mobile-sized mark assets from `logo.png`; rename the five visible-brand surfaces; render the mark
in the desktop rail, the mobile header, and the login screen; and repoint the favicon + PWA
manifest icons.

### Source analysis (`logo.png`, 1254×1254, RGB, bg ≈ `#FEFDFA`)

- Dinosaur illustration occupies ~`x 323–913, y 175–832`.
- "Dino Recipes" wordmark: ~`y 868–1057` — **cropped out** (we render the name as live text).
- Leaf divider: ~`y 1061–1065` — cropped out.
- Ink is a single dark green; background is a near-white cream. A luminance key (fully
  transparent above ~245, opaque below ~205, soft ramp between) cleanly separates the line art
  with no visible halo on `paper.base` (`#FFFDFA`). Interior white areas of the dino become
  transparent too — acceptable for a line-art mark on the app's light surface.

### Deliverables

**Assets** (committed PNGs — a one-off script, not a runtime pipeline):

1. `scripts/prepare-logo-assets.py` — reproducible Pillow script: crop to the dino band,
   auto-trim to the ink bbox, apply the luminance→alpha key, export every size below.
2. `public/dino-mark.png` — in-app display mark, transparent, 160 px longest side, target ≤ 15 KB.
3. `public/icon-192.png` — **replaced**, 192×192, transparent, dino centred with ~10% padding
   (PWA `purpose: any`).
4. `public/icon-512.png` — **replaced**, 512×512, transparent, ~10% padding (PWA `purpose: any`).
5. `public/icon-maskable-512.png` — **new**, 512×512, **opaque** `#FFFDFA` background, dino in
   the centre ~66% safe zone (PWA `purpose: maskable`).
6. `public/favicon-32.png` — new, 32×32, transparent.
7. `public/apple-touch-icon.png` — new, 180×180, **opaque** `#FFFDFA` background (iOS composites
   apple-touch icons on an opaque tile; transparency would render black).
8. `public/icon.svg` — **deleted** (nothing references it after this bolt).

**Code**:

9. `src/shared/components/Layout.tsx` — desktop rail header and mobile header: `<Image
src="/dino-mark.png" alt="Dino Recipes" h="20px" />` beside a `<Text>Dino Recipes</Text>`,
   inside the existing header clusters (no layout restructure).
10. `src/features/auth/LoginForm.tsx` — replace the `uiIcons.logo` glyph + its `brand.100`
    `<Center>` circle with `<Image src="/dino-mark.png" alt="Dino Recipes" boxSize="60px" mb={3} />`
    (OQ-1: circle dropped — a bare transparent mark reads better than a detailed illustration
    boxed in a tinted circle); heading text → "Dino Recipes"; tagline unchanged.
11. `index.html` — `<title>` → `Dino Recipes`; `rel="icon"` → `/favicon-32.png` (type
    `image/png`); `rel="apple-touch-icon"` → `/apple-touch-icon.png`; `theme-color` unchanged.
12. `vite.config.ts` — `VitePWA` manifest `name` + `short_name` → `Dino Recipes`; `icons` array →
    the three PNGs from deliverables 3–5 (drop the `icon.svg` entry); `description`,
    `theme_color`, `background_color` unchanged.

**Tests**:

13. `src/shared/components/Layout.test.tsx` — add assertions that the rail and mobile header show
    "Dino Recipes" text and an `img` named "Dino Recipes".
14. `src/features/auth/LoginForm.test.tsx` — assert the heading is "Dino Recipes" and an `img`
    named "Dino Recipes" is present; assert the old lucide `svg` mark is gone.

### Dependencies

- **Pillow** — `python -m pip install pillow` (already verified working in this environment).
  Dev/one-off only; **not** added to `package.json` or shipped.
- No new npm dependencies. Chakra `Image` is already available from `@chakra-ui/react`.
- `vite-plugin-pwa` — existing; only its `manifest` object is edited.

### Technical Approach

1. **Assets first.** Write and run `scripts/prepare-logo-assets.py`. Eyeball each output on a
   white and a cream swatch; tune the crop box / alpha thresholds if there is fringing or the
   trim is too tight. Commit the script + the PNGs. Delete `public/icon.svg`.
2. **Rename.** Five string edits (Layout ×2, LoginForm heading, `index.html` `<title>`,
   `vite.config.ts` name/short_name). Grep-verify: `grep -rn "Dinner Ideas" src index.html
vite.config.ts` returns nothing. (`icons.tsx` / `theme/index.ts` comments are out of scope
   and stay.)
3. **Wire the mark.** Add the `<Image>` to the two `Layout.tsx` header clusters and to
   `LoginForm.tsx`. Keep sizes small (`h="20px"` in chrome, `boxSize="60px"` on login). Verify
   no horizontal overflow or row-height shift at the `md` breakpoint.
4. **Icons.** Point `index.html` and the manifest at the new files. `pnpm build` and confirm the
   generated `manifest.webmanifest` lists the three icons and the build has no missing-asset
   error.
5. **Tests.** Extend the two component test files. Run `pnpm test`, `pnpm exec tsc -b`,
   `pnpm lint`, `pnpm build`.

### Acceptance Criteria

- [ ] `scripts/prepare-logo-assets.py` reproducibly regenerates every asset from `logo.png`.
- [ ] `public/dino-mark.png` is transparent, shows only the dinosaur (no wordmark), ≤ ~15 KB.
- [ ] `public/icon-192.png` / `icon-512.png` replaced with the transparent dino;
      `public/icon-maskable-512.png`, `favicon-32.png`, `apple-touch-icon.png` created;
      `public/icon.svg` deleted.
- [ ] No "Dinner Ideas" string in the desktop rail header, mobile header, login heading,
      `index.html` `<title>`, or the `vite.config.ts` manifest.
- [ ] `package.json` name, the manifest `description`, the login tagline, and all code comments
      are unchanged.
- [ ] The dino mark renders in the desktop rail header, the mobile header, and on the login
      screen; the lucide `uiIcons.logo` no longer appears on login (`uiIcons.logo` stays
      exported — `RailLink`'s prop type references it).
- [ ] `index.html` favicon + apple-touch and the PWA manifest `icons` point at the new assets;
      `pnpm build` succeeds and the generated manifest lists 192 / 512 / 512-maskable.
- [ ] No layout shift or horizontal overflow at the `md` breakpoint.
- [ ] `pnpm test`, `pnpm exec tsc -b`, `pnpm lint`, `pnpm build` all clean.

### Notes / open questions resolved

- **OQ-1** (login circle): dropped — transparent mark, no `brand.100` circle.
- **OQ-2** (`icon.svg`): deleted, not left orphaned.
- **Assumption confirmed in requirements**: "rail header" is treated as **both** chrome
  wordmarks (desktop rail + mobile header).
