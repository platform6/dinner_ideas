---
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
phase: inception
status: draft
created: '2026-08-27T09:15:00Z'
updated: '2026-08-27T09:15:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Kitchen Table UI

## Purpose

Restyles the entire Dinner Ideas frontend with the "Kitchen Table" design system (warm olive/cream, Lora + Outfit, phone-first) and 3 structural navigation changes, using a design handoff bundle (`theme.ts`, `icons.tsx`, README) as the source of truth. No backend/schema work.

## Scope

### In Scope

- Design token foundation: `theme.ts` → `src/shared/theme/index.ts`, Google Fonts, `ChakraProvider` wiring, recolored PWA icons (FR-1)
- Icon vocabulary: `icons.tsx` → `src/shared/components/icons.tsx`, extended for post-handoff screens (FR-2)
- Bottom tab bar navigation (FR-3)
- Filter chips + dedicated Suppressed route, replacing `<Select>`/`<Switch>` (FR-4)
- "Not interested" moved to a card overflow menu (FR-5)
- Every screen's restyle: Login (FR-6), Catalog/DinnerCard incl. the `rosie-approved` heart rule (FR-7), This Week incl. week navigation (FR-8), Shopping List (FR-9), Cooking (FR-10), Suppressed (FR-11), Store Config (FR-12)

### Out of Scope

- Any data model, query, RLS, or business-logic change — every existing hook/mutation is reused as-is
- Dark mode (light mode only, per the theme's `config`)
- Real dinner photos (`photo_url`) — placeholder tiles only, future work
- Persisting shopping-list item checkboxes — local-only state

---

## Assigned Requirements

| FR    | Requirement                               | Priority |
| ----- | ----------------------------------------- | -------- |
| FR-1  | Design token foundation                   | Must     |
| FR-2  | Icon vocabulary                           | Must     |
| FR-3  | Bottom tab bar navigation                 | Must     |
| FR-4  | Filter chips & dedicated suppressed route | Must     |
| FR-5  | "Not interested" off the card face        | Must     |
| FR-6  | Login screen restyle                      | Must     |
| FR-7  | Catalog & dinner card restyle             | Must     |
| FR-8  | This week restyle + week navigation       | Must     |
| FR-9  | Shopping list restyle                     | Must     |
| FR-10 | Cooking view restyle                      | Must     |
| FR-11 | Suppressed view restyle                   | Must     |
| FR-12 | Grocery store config page restyle         | Should   |

---

## Domain Concepts

### Key Entities

_None new — this unit persists nothing. It consumes the same entities as `001-weekly-dinner-planner`'s units (`Dinner`, `WeeklyPlan`, `GroceryStoreRow`, etc.) purely for display._

### Key Operations

| Operation                          | Description                                                             | Inputs                                   | Outputs                                             |
| ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Render restyled screen             | Apply theme tokens/icons to an existing page component                  | Existing query/mutation data (unchanged) | Restyled markup, same behavior                      |
| Resolve tag → icon/heart treatment | Given a dinner's tags, decide the heart display rule and per-tag badges | `tags: string[]`                         | `{ isRosieApproved: boolean, otherTags: string[] }` |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 12    |
| Must Have     | 11    |
| Should Have   | 1     |
| Could Have    | 0     |

### Stories

| Story ID                          | Title                           | Priority | Status  |
| --------------------------------- | ------------------------------- | -------- | ------- |
| 001-design-token-foundation       | Design token foundation         | Must     | Planned |
| 002-icon-vocabulary               | Icon vocabulary                 | Must     | Planned |
| 003-bottom-tab-bar-navigation     | Bottom tab bar navigation       | Must     | Planned |
| 004-filter-chips-suppressed-route | Filter chips & suppressed route | Must     | Planned |
| 005-suppress-off-card-face        | Suppress off card face          | Must     | Planned |
| 006-login-restyle                 | Login restyle                   | Must     | Planned |
| 007-catalog-dinner-card-restyle   | Catalog & dinner card restyle   | Must     | Planned |
| 008-this-week-restyle-week-nav    | This week restyle + week nav    | Must     | Planned |
| 009-shopping-list-restyle         | Shopping list restyle           | Must     | Planned |
| 010-cooking-view-restyle          | Cooking view restyle            | Must     | Planned |
| 011-suppressed-view-restyle       | Suppressed view restyle         | Must     | Planned |
| 012-store-config-restyle          | Store config restyle            | Should   | Planned |

---

## Dependencies

### Depends On

| Unit                                      | Reason                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `001-weekly-dinner-planner` (all 4 units) | Restyles their existing frontend; must already exist and be complete |

### Depended By

| Unit | Reason                                              |
| ---- | --------------------------------------------------- |
| None | Top of this intent's (single-unit) dependency chain |

### External Dependencies

| System               | Purpose                                | Risk |
| -------------------- | -------------------------------------- | ---- |
| Google Fonts         | Lora + Outfit, loaded via CDN `<link>` | Low  |
| `lucide-react` (npm) | Icon glyphs, bundled at build time     | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 `extendTheme`, `lucide-react`, existing TanStack Query/React Router setup — no new frameworks, per `standards/tech-stack.md` and `standards/ux-guide.md`.

### Integration Points

| Integration                                            | Type           | Protocol                |
| ------------------------------------------------------ | -------------- | ----------------------- |
| `001-weekly-dinner-planner`'s existing hooks/mutations | Consumed as-is | React hooks (no change) |

### Data Storage

_None owned._

---

## Constraints

- `theme.ts`/`icons.tsx` used close to as-written — extend, don't redesign, except where a post-handoff screen genuinely needs a new icon/pattern (documented per-story).
- Every interactive control ≥ 44×44px; visible focus ring; light mode only.
- No Tailwind (per `ux-guide.md`).

---

## Success Criteria

### Functional

- [ ] Every screen matches the handoff's token spec (colors, type, spacing, radii)
- [ ] Bottom tab bar, filter chips, suppressed route, and card overflow menu all in place
- [ ] The 4 post-handoff screens/features (tags, card details, week nav, store config) are themed consistently with the original 6
- [ ] `rosie-approved` heart renders only for a tag literally named `rosie-approved`

### Non-Functional

- [ ] Every interactive control ≥ 44×44px with a visible focus ring
- [ ] No regression in existing 98 tests' assertions on behavior (only markup/class updates expected)

### Quality

- [ ] All acceptance criteria met
- [ ] Existing test suite green; new/updated tests for restyled interactive elements where selectors changed

---

## Bolt Suggestions

| Bolt                    | Type   | Stories                                                                                                                   | Objective                                                  |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| bolt-kitchen-table-ui-1 | Simple | 001-design-token-foundation, 002-icon-vocabulary                                                                          | Foundation: theme + icons, blocks every other bolt         |
| bolt-kitchen-table-ui-2 | Simple | 003-bottom-tab-bar-navigation, 004-filter-chips-suppressed-route, 005-suppress-off-card-face, 011-suppressed-view-restyle | Structural navigation changes (011 pulled forward)         |
| bolt-kitchen-table-ui-3 | Simple | 006-login-restyle, 007-catalog-dinner-card-restyle                                                                        | Login + Catalog/DinnerCard restyle                         |
| bolt-kitchen-table-ui-4 | Simple | 008-this-week-restyle-week-nav, 009-shopping-list-restyle                                                                 | This Week + Shopping List restyle                          |
| bolt-kitchen-table-ui-5 | Simple | 010-cooking-view-restyle                                                                                                  | Cooking restyle (011 moved to bolt 015)                    |
| bolt-kitchen-table-ui-6 | Simple | 012-store-config-restyle                                                                                                  | Store Config restyle (lowest priority, no pixel reference) |

---

## Notes

Source material is an unusually complete design handoff (README + `theme.ts` + `icons.tsx`) rather than a from-scratch design pass — most stories are "recreate this exact spec in the codebase's patterns," not open design work, except story `012` (Store Config), which has no pixel reference and must extrapolate from the established conventions.
