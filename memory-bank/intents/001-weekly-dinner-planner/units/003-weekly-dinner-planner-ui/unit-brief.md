---
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:26:14Z'
updated: '2026-08-28T12:00:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Weekly Dinner Planner UI

## Purpose

The React PWA itself: lets the wife log in, browse/filter the dinner catalog, pick up to 3 dinners for the week (freely editable until sent), and get a copyable, category-grouped shopping list — copying it is what locks the plan in. Also hosts recipe detail/tag management, past/future week browsing, and grocery store configuration.

## Scope

### In Scope

- Login (shared household password via Supabase Auth)
- Dinner catalog page: list + filters (cuisine, cook time, tags) + sort (cook time, "least recently made")
- Pick-3 selection flow: each pick/unpick persists immediately, freely editable (swap anytime) until the plan locks
- Shopping list view: client-side ingredient merge/aggregation, category grouping (ordered per FR-12 config), copy-to-clipboard (which also locks the plan)
- Cooking view: the current plan's 3 dinners, each with its ordered step-by-step instructions from `dinner_steps`
- Real routing (`react-router-dom`): catalog, this week's plan, shopping list, cooking view, and (new) grocery store config as separate pages — not tabs on one screen — so a future recipe-management page is additive
- Variety-nudging UI (e.g. "last made 2 weeks ago" / "never made" indicator)
- PWA setup: manifest, service worker, offline caching of the active shopping list
- "Not interested" suppress action + a "Suppressed" filter/view to un-suppress
- Expandable "Details" section per catalog card: ordered cooking steps, ingredient list, tag list + "+" add-tag control, tag removal (FR-9/FR-10)
- Week view: ◀ / ▶ navigation one week at a time, date-range header (e.g. "8/23 – 8/29"), eaten-vs-current distinction (FR-11)
- Grocery store row config page: add/reorder named rows, assign ingredient categories to rows (FR-12)

### Out of Scope

- Dinner/ingredient/tags schema → `001-dinner-catalog`
- Weekly plan/meal-history schema → `002-weekly-planning`
- Grocery store row schema + reorder logic → `004-grocery-store-config`
- Add/edit-recipe UI (future work, FR-6)
- Real-time/optimistic redesign of the pick flow — deferred to a future dedicated UX Inception pass, not this unit's scope right now

---

## Assigned Requirements

| FR    | Requirement                                                  | Priority |
| ----- | ------------------------------------------------------------ | -------- |
| FR-1  | Browsable/filterable catalog (UI)                            | Must     |
| FR-2  | Pick exactly 3 (selection flow UI)                           | Must     |
| FR-3  | Shopping list generation (client-side aggregation + copy)    | Must     |
| FR-4  | Selection history & variety nudging (UI)                     | Should   |
| FR-7  | Suppress a dinner (UI)                                       | Must     |
| FR-8  | Cooking view (UI)                                            | Must     |
| FR-9  | Generic tag system (UI: card tag list + "+" control, filter) | Must     |
| FR-10 | Expandable recipe details on catalog card                    | Must     |
| FR-11 | Week navigation & eaten history (UI)                         | Should   |
| FR-12 | Grocery store row config (UI page)                           | Must     |
| FR-13 | Standalone tag filter dropdown (split from cuisine menu)     | Must     |
| FR-14 | Rename catalog filter menu "More" → "Cuisine"                | Must     |

---

## Domain Concepts

### Key Entities

_Consumes entities owned by `001-dinner-catalog`, `002-weekly-planning`, and `004-grocery-store-config`; no new persisted entities of its own._

### Key Operations

| Operation                           | Description                                                                                       | Inputs                            | Outputs                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------- |
| Aggregate shopping list             | Merge ingredients across 3 selected dinners by name+unit, group by category                       | 3 dinners' ingredient lists       | Grouped, merged shopping list           |
| Copy shopping list                  | Format grouped list as plain text and write to clipboard                                          | Grouped shopping list             | Clipboard content                       |
| Reorder shopping list by store rows | Sort the aggregated groups using `004-grocery-store-config`'s row order instead of alphabetically | Grouped shopping list, row config | Reordered shopping list                 |
| Toggle card details                 | Expand/collapse a catalog card's steps/ingredients/tags section                                   | dinner_id                         | UI state only                           |
| Navigate week                       | Move the week view one week forward/backward                                                      | current week offset               | WeeklyPlan (or null if past the latest) |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 17    |
| Must Have     | 13    |
| Should Have   | 4     |
| Could Have    | 0     |

### Stories

| Story ID                            | Title                                | Priority | Status   |
| ----------------------------------- | ------------------------------------ | -------- | -------- |
| 001-household-login                 | Household login                      | Must     | Complete |
| 002-browse-filter-sort-catalog      | Browse/filter/sort catalog           | Must     | Complete |
| 003-pick-three-dinners              | Pick three dinners                   | Must     | Complete |
| 004-editable-until-locked           | Editable until locked                | Must     | Complete |
| 005-generate-shopping-list          | Generate shopping list               | Must     | Complete |
| 006-copy-shopping-list-to-clipboard | Copy shopping list to clipboard      | Must     | Complete |
| 007-variety-indicator               | Variety indicator                    | Should   | Complete |
| 008-pwa-install-offline             | PWA install & offline                | Should   | Complete |
| 009-suppress-dinner                 | Suppress dinner                      | Must     | Complete |
| 010-cooking-view                    | Cooking view                         | Must     | Complete |
| 011-catalog-card-expandable-details | Catalog card expandable details      | Must     | Complete |
| 012-tag-management-ui               | Tag management UI                    | Must     | Complete |
| 013-week-navigation-view            | Week navigation view                 | Should   | Complete |
| 014-grocery-store-config-page       | Grocery store config page            | Must     | Complete |
| 015-standalone-tag-filter-dropdown  | Standalone tag filter dropdown       | Must     | Complete |
| 016-rename-filter-menu-cuisine      | Rename filter menu to "Cuisine"      | Must     | Complete |
| 017-at-capacity-list-banner         | Single list-level at-capacity banner | Should   | Complete |

---

## Dependencies

### Depends On

| Unit                     | Reason                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| 001-dinner-catalog       | Source of dinners + ingredients + tags to display/aggregate               |
| 002-weekly-planning      | Persists picks in real time, locks the plan, reads selection/meal history |
| 004-grocery-store-config | Reorders shopping list groups by the configured store row sequence        |

### Depended By

| Unit | Reason                      |
| ---- | --------------------------- |
| None | Top of the dependency chain |

### External Dependencies

| System                | Purpose                         | Risk |
| --------------------- | ------------------------------- | ---- |
| Supabase Auth         | Shared household login          | Low  |
| Browser Clipboard API | Copy shopping list to clipboard | Low  |

---

## Technical Context

### Suggested Technology

TypeScript + Vite + React + Chakra UI + `@tanstack/react-query` + `react-router-dom` + `vite-plugin-pwa`, per `standards/tech-stack.md`, `standards/system-architecture.md`, `standards/ux-guide.md`.

### Integration Points

| Integration              | Type          | Protocol                                                                        |
| ------------------------ | ------------- | ------------------------------------------------------------------------------- |
| 001-dinner-catalog       | DB read       | Supabase client (PostgREST), incl. `dinner_steps`, tags for the details section |
| 002-weekly-planning      | DB read/write | Supabase client (PostgREST), incl. `meal_history` for week navigation           |
| 004-grocery-store-config | DB read/write | Supabase client (PostgREST)                                                     |

### Data Storage

_None owned — consumes Supabase directly; every pick/unpick is persisted immediately, so there's no meaningful local-only draft state to manage._

---

## Constraints

- Must work well installed as a PWA on a phone (primary usage context) — mobile-first per `ux-guide.md`.
- Ingredient merge logic must handle unit mismatches gracefully (e.g. differing units for the same ingredient shouldn't silently produce wrong totals) — flag for domain modeling during Construction.
- Navigation must use real routes, one per concern (catalog, this week's plan, shopping list, cooking view), not tabs on a single screen — per `requirements.md`'s constraint that a future recipe-management page (FR-6) should be additive.

---

## Success Criteria

### Functional

- [x] Wife can log in, filter/sort the catalog, and pick up to 3 dinners, with each pick saved immediately
- [x] Picks stay freely editable (swap any dinner) until the shopping list is copied, at which point the plan locks and further edits are blocked
- [x] Shopping list correctly merges shared ingredients and groups by category
- [x] Shopping list can be copied to clipboard in one tap
- [x] Catalog shows last-chosen recency per dinner
- [x] A dinner can be suppressed (hidden) and later un-suppressed via a "Suppressed" view
- [x] A cooking view shows the current plan's 3 dinners with ordered, step-by-step instructions, as its own page

### Non-Functional

- [x] Installable as a PWA; core browsing/shopping-list view works offline once loaded

### Quality

- [x] Ingredient aggregation and pick-3 validation covered by unit tests (per `coding-standards.md`)
- [x] All acceptance criteria met

---

## Bolt Suggestions

| Bolt                         | Type   | Stories                                                            | Objective                                                                                                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 003-weekly-dinner-planner-ui | Simple | Auth + catalog stories                                             | Login, catalog browse/filter/sort, suppress/un-suppress, routing scaffold                                                                                                          |
| 004-weekly-dinner-planner-ui | Simple | Selection flow stories                                             | Pick-3 flow, real-time persistence, editable-until-locked view                                                                                                                     |
| 005-weekly-dinner-planner-ui | Simple | Shopping list stories                                              | Aggregation logic, grouped view, copy-to-clipboard                                                                                                                                 |
| 006-weekly-dinner-planner-ui | Simple | PWA + variety UI stories                                           | PWA install/offline, last-chosen indicators                                                                                                                                        |
| 008-weekly-dinner-planner-ui | Simple | Cooking view story                                                 | Cooking view page, depends on `007-dinner-catalog`'s step data                                                                                                                     |
| 012-weekly-dinner-planner-ui | Simple | 011-catalog-card-expandable-details, 012-tag-management-ui         | Catalog card details dropdown + tag list/add/remove UI, depends on `009-dinner-catalog`'s tags schema                                                                              |
| 013-weekly-dinner-planner-ui | Simple | 013-week-navigation-view, 014-grocery-store-config-page            | Week ◀ / ▶ navigation view + grocery store config page, depends on `010-weekly-planning`'s `meal_history` and `011-grocery-store-config`'s schema                                  |
| 020-weekly-dinner-planner-ui | Simple | 015-standalone-tag-filter-dropdown, 016-rename-filter-menu-cuisine | Split the tag filter into its own "Tags" dropdown and rename the "More" menu to "Cuisine" — both are `CatalogFilters.tsx` presentation changes, no state/logic change              |
| 036-weekly-dinner-planner-ui | Simple | 017-at-capacity-list-banner                                        | Remove the per-card "Already have 3 picked" notice from `DinnerCard.tsx`; add one at-capacity banner above the grid in `CatalogPage.tsx`. Presentation-only, no state/logic change |

---

## Notes

This is the largest unit by scope (L complexity) — likely to span multiple bolts, split roughly along the bolt suggestions above.

**Revised 2026-08-26 during Construction**: the pick flow no longer has a separate "confirm" step — picks persist immediately and stay editable until the shopping list is copied, which is now the lock moment. See `inception-log.md` Scope Changes and `002-weekly-planning/unit-brief.md`.

**Revised again 2026-08-26 during bolt `003-weekly-dinner-planner-ui` Stage 1 (Plan)**: added FR-8 (Cooking View) and story `010-cooking-view`. This also settled the earlier-deferred routing question — real routes (`react-router-dom`) from the start, not a single-screen app, so the eventual recipe-management page (FR-6) is additive rather than a rework.

**Revised 2026-08-27 post-deployment**: added FR-9–FR-12 and 4 new stories (`011`–`014`). The real-time/optimistic pick-flow feel raised alongside these was explicitly deferred to a future dedicated UX Inception pass — not addressed in this unit's upcoming bolts. See `inception-log.md` Scope Changes.

**Revised 2026-08-28 (enhancement round 3)**: added FR-13 (standalone "Tags" filter dropdown) and FR-14 (rename the "More" catalog filter menu to "Cuisine") with stories `015`–`016`, planned as bolt `020-weekly-dinner-planner-ui`. Both are presentation-only changes to `CatalogFilters.tsx`. Sourced from `tasks.md`; user revised the originally-requested label "Category" to "Cuisine" during requirements intake. See `inception-log.md` Scope Changes.

**Revised 2026-08-28 (at-capacity banner)**: added story `017-at-capacity-list-banner` under existing FR-2 — a presentation refinement, no new FR. Replaces the per-card "Already have 3 picked" inline notice in `DinnerCard.tsx` with a single banner above the grid in `CatalogPage.tsx`, shown while the plan is at 3 selections. Cards keep the dim + "Full" pill. Planned as bolt `036-weekly-dinner-planner-ui` (simple). Also refreshed the Story Summary status column — stories `011`/`012`/`015`/`016` were built long ago but still read "Planned" here.
