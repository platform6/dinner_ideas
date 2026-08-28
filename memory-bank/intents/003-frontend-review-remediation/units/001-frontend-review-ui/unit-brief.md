---
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
phase: inception
status: complete
created: '2026-08-28T17:10:00Z'
updated: '2026-08-28T17:20:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Frontend Review UI

## Purpose

Apply the non-desktop subset of the twelve front-end review findings against the shipped Kitchen
Table build: the `theme-patch.ts` corrections (one file, every screen) plus targeted call-site
fixes in six components. Remediation, not a rebuild.

## Scope

### In Scope

- Ink ramp AA correction — `theme-patch.ts` §1 (FR-1)
- Shopping-list sticky action bar: clear the tab bar on phone, relocate to the header at md+ (FR-2)
- Alert palette — `theme-patch.ts` §4, error → `heart`, success → `brand` (FR-3)
- Theme entries for Menu, Textarea, CloseButton — `theme-patch.ts` §3 (FR-4)
- Cuisine filter → genuinely multi-select: `cuisine: string[]`, OR semantics in `filters.ts` (FR-5)
- `line.brandSubtle` token; replace the 3 raw `#E3E7DA` literals — `theme-patch.ts` §2 (FR-6)
- `layerStyle="card"` on `PlanPage` / `SuppressedPage` / `CookingViewPage` (FR-7)
- Filter chips: `uiIcons.x` glyph, remove button gets its own hit area (FR-8)
- Global focus ring — `theme-patch.ts` §5, promoted to `styles.global`; `Button` drops its copy (FR-9)

### Out of Scope

- Everything desktop — left rail, measure caps, responsive screen reshapes, app-name treatment
  (finding 11), pointer/hover states, catalog `lg`→`xl` breakpoint → intent `004-desktop-layout`
- Finding 12 (dinner-card photo slot): confirmed to ship as the cuisine icon — no work, no schema
- Any Supabase change — no tables, RLS, RPCs, or query changes
- Persisting filter state (there is no URL/`localStorage` layer today; FR-5 stays in-memory)

---

## Assigned Requirements

| FR   | Requirement                                        | Priority |
| ---- | -------------------------------------------------- | -------- |
| FR-1 | Ink ramp WCAG AA correction                        | Must     |
| FR-2 | Shopping-list action bar — clear tab bar, md+ move | Should   |
| FR-3 | Alert palette                                      | Should   |
| FR-4 | Menu / Textarea / CloseButton theme entries        | Must     |
| FR-5 | Cuisine filter becomes multi-select                | Should   |
| FR-6 | Name the olive hairline `line.brandSubtle`         | Could    |
| FR-7 | `card` layerStyles on Plan / Suppressed / Cooking  | Could    |
| FR-8 | Filter chips — Lucide glyph and own hit area       | Could    |
| FR-9 | Global focus ring                                  | Must     |

---

## Domain Concepts

### Key Entities

_None new. Consumes the same entities as `001-weekly-dinner-planner` (`Dinner`, `WeeklyPlan`,
`GroceryStoreRow`, …) purely for display._

### Key Operations

| Operation                 | Description                                                                      | Inputs                       | Outputs                          |
| ------------------------- | -------------------------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| Filter catalog by cuisine | Match a dinner if its cuisine is in the selected set (OR); empty set = no filter | `cuisine: string[]`, dinners | filtered dinner list             |
| Resolve theme token       | Chakra reads a corrected/added token or component entry at render                | token name                   | corrected colour / themed markup |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 9     |
| Must Have     | 3     |
| Should Have   | 3     |
| Could Have    | 3     |

### Stories

| Story ID                            | Title                                         | Priority | Status  |
| ----------------------------------- | --------------------------------------------- | -------- | ------- |
| 001-ink-ramp-aa-correction          | Ink ramp WCAG AA correction                   | Must     | Planned |
| 002-alert-palette                   | Alert palette (heart / brand)                 | Should   | Planned |
| 003-menu-textarea-closebutton-theme | Menu / Textarea / CloseButton theme entries   | Must     | Planned |
| 004-global-focus-ring               | Global focus ring                             | Must     | Planned |
| 005-name-brand-subtle-hairline      | Name the `line.brandSubtle` hairline          | Could    | Planned |
| 006-shopping-list-action-bar        | Shopping-list action bar — tab bar + md move  | Should   | Planned |
| 007-cuisine-filter-multi-select     | Cuisine filter becomes multi-select           | Should   | Planned |
| 008-card-layerstyles-three-screens  | `card` layerStyles on Plan/Suppressed/Cooking | Could    | Planned |
| 009-filter-chip-remove-affordance   | Filter-chip Lucide glyph and own hit area     | Could    | Planned |

---

## Dependencies

### Depends On

| Unit                                 | Reason                                                       |
| ------------------------------------ | ------------------------------------------------------------ |
| `002-kitchen-table-theme` (complete) | This unit remediates that intent's shipped theme and screens |

### Depended By

| Unit                          | Reason                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `004-desktop-layout` (future) | Needs corrected ink ramp, `line.brandSubtle`, and FR-2's sticky-bar fix first |

### External Dependencies

| System                       | Purpose                                            | Risk |
| ---------------------------- | -------------------------------------------------- | ---- |
| `lucide-react` (`uiIcons.x`) | Filter-chip remove glyph (FR-8) — already exported | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 `extendTheme`, existing TanStack Query / React Router / Vitest setup — no new
frameworks, per `standards/tech-stack.md` and `standards/ux-guide.md`.

### Integration Points

| Integration                                          | Type           | Protocol                |
| ---------------------------------------------------- | -------------- | ----------------------- |
| `001-weekly-dinner-planner`'s existing hooks/queries | Consumed as-is | React hooks (no change) |

### Data Storage

_None owned. `CatalogFilterState` is in-memory React state; FR-5 changes its shape, not its
persistence (there is none)._

---

## Constraints

- `theme-patch.ts` values applied verbatim; diff section-by-section against the current
  `src/shared/theme/index.ts` first.
- FR-7 adopts the `card` layerStyle as-is — minor padding/radius shifts from today are acceptable
  (recorded decision), not tuned to pixel-match.
- Light mode only; Chakra v2 only; exactly one new token (`line.brandSubtle`).
- The only md-breakpoint change in this unit is FR-2, contained to `ShoppingListPage.tsx`.

---

## Success Criteria

### Functional

- [ ] `ink.400/300/200` at the corrected values; `textStyle="faint"` copy re-checked on all five screens
- [ ] All 11 `<Alert>`s and the Menu / Textarea / CloseButton surfaces render Kitchen Table tokens, no stock blue
- [ ] Ticking two cuisines shows dinners of either; unticking one leaves the other active
- [ ] No `#E3E7DA` literal remains in `src/`
- [ ] `PlanPage` / `SuppressedPage` / `CookingViewPage` use `layerStyle="card"`, no hand-rolled cards
- [ ] Active-filter chips have a distinct `uiIcons.x` remove target; the label is not a button
- [ ] Keyboard focus shows the olive ring on the cooking accordion headers and the pick checkbox

### Non-Functional

- [ ] Corrected `ink` tokens meet WCAG AA against `paper.base` (informal spot-check)
- [ ] Existing test suite green; assertions changed only for FR-2, FR-5, FR-8

### Quality

- [ ] All acceptance criteria met
- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                   | Type   | Stories                                                                                                       | Objective                                                                      |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 022-frontend-review-ui | Simple | 001-ink-ramp-aa-correction                                                                                    | Ship the AA fix — blocker, 3 token values, every screen, deployable alone      |
| 023-frontend-review-ui | Simple | 002-alert-palette, 003-menu-textarea-closebutton-theme, 004-global-focus-ring, 005-name-brand-subtle-hairline | Apply the rest of `theme-patch.ts` (§§2–5) + the CookingViewPage hex swap      |
| 024-frontend-review-ui | Simple | 007-cuisine-filter-multi-select, 009-filter-chip-remove-affordance                                            | `CatalogFilters` / `filters.ts`: multi-select cuisine + chip remove affordance |
| 025-frontend-review-ui | Simple | 006-shopping-list-action-bar, 008-card-layerstyles-three-screens                                              | Per-screen call-site cleanups                                                  |

Sequence: `022 → 023 → { 024, 025 }`. 022 is the blocker and ships first; 024 and 025 are
independent of each other once 023 lands.

---

## Notes

The source is an unusually prescriptive review — `theme-patch.ts` gives exact blocks and final
values, so stories 001–005 are "apply this block, verify the call sites." Only story 007 (cuisine
multi-select) carries real logic, and `filters.tags` already proves the pattern.
