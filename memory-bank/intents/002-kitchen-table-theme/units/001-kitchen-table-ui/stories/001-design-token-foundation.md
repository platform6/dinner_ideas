---
id: 001-design-token-foundation
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 001-design-token-foundation

## User Story

**As a** wife using the app
**I want** it to look warm and considered instead of a stock admin-panel blue
**So that** it feels like a tool made for her kitchen, not generic software

## Acceptance Criteria

- [ ] **Given** the design handoff's `theme.ts`, **When** it's placed at `src/shared/theme/index.ts`, **Then** it's used close to as-written (colors, fonts, radii, shadows, text/layer styles, component overrides)
- [ ] **Given** `main.tsx`, **When** the app renders, **Then** `<ChakraProvider theme={theme}>` imports from `@/shared/theme`
- [ ] **Given** `index.html`, **When** the page loads, **Then** the exact Lora + Outfit `<link>` tags from the handoff are present in `<head>`
- [ ] **Given** `lucide-react` is added as a dependency, **When** `pnpm install` runs, **Then** it resolves cleanly alongside existing dependencies
- [ ] **Given** `public/icon.svg` and the PNGs from `scripts/generate-pwa-icons.mjs`, **When** recolored to `brand.500`/a darker shade, **Then** both the hand-written SVG and the script's hardcoded RGB literals are updated and the PNGs regenerated

## Technical Notes

- This is the foundation story — every other story in this unit depends on the theme existing first.
- `scripts/generate-pwa-icons.mjs` hardcodes teal RGB triples (`[44,122,123,255]`/`[35,96,97,255]`) directly in a `pixelAt` function — swap for `brand.500` (#4A6741) and a darker shade, then re-run `node scripts/generate-pwa-icons.mjs`.
- No component code should change in this story beyond `main.tsx`/`index.html` — screens still render with their _old_ markup, just under new tokens, until their own restyle stories land.

## Dependencies

### Requires

- None — first story in this unit

### Enables

- Every other story in this unit (all restyle work assumes the theme exists)

## Edge Cases

| Scenario                                                         | Expected Behavior                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A component uses a hardcoded color/font not covered by the theme | Falls back to browser defaults until its own restyle story updates it — acceptable transient state within this bolt |

## Out of Scope

- Any screen's actual restyle (later stories)
