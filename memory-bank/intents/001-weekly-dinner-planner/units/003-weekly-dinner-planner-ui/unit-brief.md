---
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:26:14Z'
updated: '2026-08-26T20:15:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Weekly Dinner Planner UI

## Purpose

The React PWA itself: lets the wife log in, browse/filter the dinner catalog, pick up to 3 dinners for the week (freely editable until sent), and get a copyable, category-grouped shopping list — copying it is what locks the plan in.

## Scope

### In Scope
- Login (shared household password via Supabase Auth)
- Dinner catalog page: list + filters (cuisine, cook time, Rosie-approved) + sort (cook time, "least recently made")
- Pick-3 selection flow: each pick/unpick persists immediately, freely editable (swap anytime) until the plan locks
- Shopping list view: client-side ingredient merge/aggregation, category grouping, copy-to-clipboard (which also locks the plan)
- Cooking view: the current plan's 3 dinners, each with its ordered step-by-step instructions from `dinner_steps`
- Real routing (`react-router-dom`): catalog, this week's plan, shopping list, and cooking view as separate pages — not tabs on one screen — so a future recipe-management page is additive
- Variety-nudging UI (e.g. "last made 2 weeks ago" / "never made" indicator)
- PWA setup: manifest, service worker, offline caching of the active shopping list
- "Not interested" suppress action + a "Suppressed" filter/view to un-suppress

### Out of Scope
- Dinner/ingredient schema → `001-dinner-catalog`
- Weekly plan schema/constraints → `002-weekly-planning`
- Add/edit-recipe UI (future work, FR-6)

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Browsable/filterable catalog (UI) | Must |
| FR-2 | Pick exactly 3 (selection flow UI) | Must |
| FR-3 | Shopping list generation (client-side aggregation + copy) | Must |
| FR-4 | Selection history & variety nudging (UI) | Should |
| FR-7 | Suppress a dinner (UI) | Must |
| FR-8 | Cooking view (UI) | Must |

---

## Domain Concepts

### Key Entities
_Consumes entities owned by `001-dinner-catalog` and `002-weekly-planning`; no new persisted entities of its own._

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| Aggregate shopping list | Merge ingredients across 3 selected dinners by name+unit, group by category | 3 dinners' ingredient lists | Grouped, merged shopping list |
| Copy shopping list | Format grouped list as plain text and write to clipboard | Grouped shopping list | Clipboard content |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 10 |
| Must Have | 8 |
| Should Have | 2 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-household-login | Household login | Must | Complete |
| 002-browse-filter-sort-catalog | Browse/filter/sort catalog | Must | Complete |
| 003-pick-three-dinners | Pick three dinners | Must | Complete |
| 004-editable-until-locked | Editable until locked | Must | Complete |
| 005-generate-shopping-list | Generate shopping list | Must | Complete |
| 006-copy-shopping-list-to-clipboard | Copy shopping list to clipboard | Must | Complete |
| 007-variety-indicator | Variety indicator | Should | Complete |
| 008-pwa-install-offline | PWA install & offline | Should | Complete |
| 009-suppress-dinner | Suppress dinner | Must | Complete |
| 010-cooking-view | Cooking view | Must | Complete |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-dinner-catalog | Source of dinners + ingredients to display/aggregate |
| 002-weekly-planning | Persists picks in real time, locks the plan, reads selection history |

### Depended By
| Unit | Reason |
|------|--------|
| None | Top of the dependency chain |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| Supabase Auth | Shared household login | Low |
| Browser Clipboard API | Copy shopping list to clipboard | Low |

---

## Technical Context

### Suggested Technology
TypeScript + Vite + React + Chakra UI + `@tanstack/react-query` + `react-router-dom` + `vite-plugin-pwa`, per `standards/tech-stack.md`, `standards/system-architecture.md`, `standards/ux-guide.md`.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| 001-dinner-catalog | DB read | Supabase client (PostgREST), incl. `dinner_steps` for the cooking view |
| 002-weekly-planning | DB read/write | Supabase client (PostgREST) |

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

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| 003-weekly-dinner-planner-ui | Simple | Auth + catalog stories | Login, catalog browse/filter/sort, suppress/un-suppress, routing scaffold |
| 004-weekly-dinner-planner-ui | Simple | Selection flow stories | Pick-3 flow, real-time persistence, editable-until-locked view |
| 005-weekly-dinner-planner-ui | Simple | Shopping list stories | Aggregation logic, grouped view, copy-to-clipboard |
| 006-weekly-dinner-planner-ui | Simple | PWA + variety UI stories | PWA install/offline, last-chosen indicators |
| 008-weekly-dinner-planner-ui | Simple | Cooking view story | Cooking view page, depends on `007-dinner-catalog`'s step data |

---

## Notes

This is the largest unit by scope (L complexity) — likely to span multiple bolts, split roughly along the bolt suggestions above.

**Revised 2026-08-26 during Construction**: the pick flow no longer has a separate "confirm" step — picks persist immediately and stay editable until the shopping list is copied, which is now the lock moment. See `inception-log.md` Scope Changes and `002-weekly-planning/unit-brief.md`.

**Revised again 2026-08-26 during bolt `003-weekly-dinner-planner-ui` Stage 1 (Plan)**: added FR-8 (Cooking View) and story `010-cooking-view`. This also settled the earlier-deferred routing question — real routes (`react-router-dom`) from the start, not a single-screen app, so the eventual recipe-management page (FR-6) is additive rather than a rework.
