---
id: 003-dino-mark-in-chrome-login-and-icons
unit: 001-dino-branding-ui
intent: 006-dino-branding
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 035-dino-branding-ui
implemented: true
---

# Story: 003-dino-mark-in-chrome-login-and-icons

## User Story

**As a** user
**I want** to see the dinosaur mark in the nav, on the login screen, and in my browser tab
**So that** the app is recognisable at a glance

## Acceptance Criteria

- [ ] **Given** `Layout.tsx` desktop rail header, **When** rendered, **Then** the dino mark
      image appears beside the "Dino Recipes" text, small (~20–28 px tall), with `alt="Dino
    Recipes"`
- [ ] **Given** `Layout.tsx` mobile header, **Then** the same mark appears beside / in place of
      the header text at a comparable size
- [ ] **Given** `LoginForm.tsx`, **Then** the `uiIcons.logo` lucide glyph above the heading is
      replaced by the dino mark image (`alt="Dino Recipes"`); the `brand.100` circle is kept or
      dropped per OQ-1, recorded in the walkthrough
- [ ] **Given** `index.html`, **Then** `rel="icon"` and `rel="apple-touch-icon"` point at the
      dino assets from story `001`
- [ ] **Given** `vite.config.ts`, **Then** the manifest `icons` array points at the new
      `icon-192.png` / `icon-512.png` (plus a `maskable` 512 entry)
- [ ] **Given** `vite build`, **Then** it succeeds and the generated `manifest.webmanifest`
      lists the new icons; no reference to a missing `icon.svg` breaks the build
- [ ] **Given** the `md` breakpoint, **Then** adding the image causes no layout shift or
      horizontal overflow in the rail or the header
- [ ] **Given** the suite, **Then** `Layout.test.tsx` / `LoginForm.test.tsx` are updated (e.g.
      assert `getByRole('img', { name: 'Dino Recipes' })`, drop the lucide-glyph assertion) and
      pass

## Technical Notes

- Use Chakra `<Image src=... alt="Dino Recipes" h=... />`. Reference the in-app display asset
  from story `001` (import from `src/assets/` or a `/`-rooted `public/` path — match whatever
  the repo already does; `public/` is simplest here).
- `RailLink`'s `Icon: typeof uiIcons.logo` prop type is unaffected — the mark is a separate
  `<Image>`, not a nav icon.
- Keep the header layout (`Flex justify="space-between"`) intact — the mark + text go in the
  existing left cluster.

## Dependencies

### Requires

- `001-prepare-dino-mark-assets` (needs the asset files)
- `002-dino-recipes-wordmark-and-title` (mark sits beside the new text) — soft dependency

### Enables

- None (last story)

## Edge Cases

| Scenario                                             | Expected Behavior                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Service worker serves a stale `icon.svg`             | `autoUpdate` re-precaches; acceptable                                  |
| Mark image 404s in a test (jsdom)                    | Assert on the `img` role + `alt`, not a loaded bitmap                  |
| The mark looks too heavy next to the small rail text | Scale down / add a little right margin; no art-direction beyond sizing |

## Out of Scope

- Producing the assets (story `001`)
- Any text rename (story `002`)
- Splash screen art beyond what the manifest icons generate
