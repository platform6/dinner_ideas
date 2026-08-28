---
stage: plan
bolt: 022-frontend-review-ui
created: 2026-08-28T17:30:00Z
---

## Implementation Plan: frontend-review-ui — bolt 022 (ink ramp AA correction)

### Objective

Replace the three pre-correction grey values in the `ink` colour scale with the WCAG-AA values
from `theme-patch.ts` §1, so body copy that currently fails AA against `paper.base` passes it. One
file, three values, no markup changes. Review blocker 1.

### Story

- **001-ink-ramp-aa-correction** (Must)

### Deliverables

1. `src/shared/theme/index.ts` — `ink` block updated:
   | Token                                                                      | Current   | New (theme-patch.ts §1) | Ratio vs `paper.base` #FFFDFA |
   | -------------------------------------------------------------------------- | --------- | ----------------------- | ----------------------------- |
   | `ink.400`                                                                  | `#8C8677` | `#726C5B`               | 3.6:1 → 5.1:1                 |
   | `ink.300`                                                                  | `#A39C8B` | `#757060`               | 2.7:1 → 4.9:1                 |
   | `ink.200`                                                                  | `#B8B1A0` | `#8A8272`               | 2.1:1 → 4.5:1                 |
   | `ink.900` `#232019`, `ink.700` `#5C5749`, `ink.500` `#7E7869` — unchanged. |
2. Live pass over the screens that render `textStyle="faint"` (→ `ink.300`) and `eyebrow`
   (→ `ink.400`): `PlanPage` empty states, `SuppressedPage` metadata, `StoreConfigPage` help text,
   the `ShoppingListPage` prompt, every dinner card's "last made" line, and the eyebrow above every
   page title.

### Dependencies

- **Chakra theme file from `002-kitchen-table-theme`** (complete) — the only file this bolt edits.
- No package, schema, or API dependency.
- Note: the README points at a sibling `design_handoff_dinner_ideas_theme/theme.ts` as a diff
  source — that folder is not in this repo. `theme-patch.ts` §1 carries the exact target values, so
  it is the source of truth here.

### Technical Approach

- Single edit to the `ink` object literal at `src/shared/theme/index.ts` (currently lines ~40–46).
- Nothing references these greys by literal hex elsewhere (`#8C8677` / `#A39C8B` / `#B8B1A0` do not
  appear outside the theme) — a repo grep in Stage 3 confirms this. All usage is via the `ink.*`
  tokens, so the scale swap propagates automatically.
- No component, test-fixture, or snapshot currently pins these literals (to be re-confirmed in
  Stage 2 before editing, and in Stage 3 by running the suite).

### Acceptance Criteria

- [ ] `ink` block in `src/shared/theme/index.ts` matches `theme-patch.ts` §1 exactly; `900/700/500`
      untouched
- [ ] `#8C8677`, `#A39C8B`, `#B8B1A0` appear nowhere in `src/` after the change
- [ ] `textStyle="faint"` body copy re-checked (live) on PlanPage, SuppressedPage, StoreConfigPage,
      ShoppingListPage, DinnerCard
- [ ] `eyebrow` text re-checked above every page title
- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Existing test suite green with no assertion changes (token-value change only)

### Out of Scope

- `theme-patch.ts` §§2–5 (`line.brandSubtle`, Alert, Menu/Textarea/CloseButton, global focus ring)
  → bolt `023`
- Any greys outside the `ink` scale
