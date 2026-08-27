---
stage: plan
bolt: 014-kitchen-table-ui
created: 2026-08-27T09:45:00Z
---

## Implementation Plan: kitchen-table-ui (foundation)

### Objective

Drop in the "Kitchen Table" design tokens and icon vocabulary from the design handoff, and recolor every teal-branded surface to the new palette — the foundation every other bolt in this intent builds on.

### Deliverables

- `src/shared/theme/index.ts` — the handoff's `theme.ts`, used as-written.
- `src/shared/components/icons.tsx` — the handoff's `icons.tsx`, used as-written for this bolt (new entries for week-nav/store-config/tag icons are added by the stories that actually consume them, per `002-icon-vocabulary`'s own note — this bolt lands the vocabulary, later bolts extend it where needed).
- `package.json`: add `lucide-react`.
- `index.html`: Lora + Outfit `<link>` tags in `<head>`; `theme-color` meta updated from `#2c7a7b` to `#4A6741` (brand.500).
- `src/main.tsx`: `<ChakraProvider theme={theme}>` importing from `@/shared/theme`.
- `vite.config.ts`: PWA manifest's `theme_color` updated to `#4A6741` (`background_color` stays `#ffffff` — close enough to `paper.base` #FFFDFA that changing it isn't required by any FR).
- `public/icon.svg`: recolor the 3 hardcoded teal hex values to brand.500 + a darker shade.
- `scripts/generate-pwa-icons.mjs`: recolor its hardcoded `teal`/`darkTeal` RGB arrays the same way, then re-run it to regenerate `public/icon-192.png`/`icon-512.png`.

### Dependencies

None — first bolt in this intent.

### Technical Approach

- No component (`.tsx` page/feature files) changes in this bolt — every existing screen keeps its current markup and will render under the new tokens with default Chakra component styles until its own restyle story lands. This is an expected, brief transitional state, not a bug.
- `theme.ts`/`icons.tsx` land close to verbatim — no adaptation needed, they're already written against this exact codebase's conventions (per the handoff's own framing).

### Acceptance Criteria

Directly from stories `001-design-token-foundation` and `002-icon-vocabulary`:

- [ ] `theme.ts` in place, used by `ChakraProvider`
- [ ] `icons.tsx` in place, its maps/helpers importable
- [ ] Fonts linked; `lucide-react` installed
- [ ] `theme-color` (both `index.html` meta and the PWA manifest) and both icon files recolored to brand.500
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?
