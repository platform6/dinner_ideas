---
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:20:36Z'
updated: '2026-08-26T20:15:00Z'
---

# Requirements: Weekly Dinner Planner

## Intent Overview

A household web app that lets the user's wife browse a catalog of healthy dinner options, filter/sort them, pick exactly 3 dinners for the week, and get an auto-generated shopping list (aggregated ingredients across the 3 picks, grouped by grocery category) that she can copy and text to her husband. Once 3 dinners are picked, a cooking view shows each one's clear, step-by-step instructions for use while actually cooking. The catalog tracks selection history to nudge toward variety rather than repeats. Seeded at launch with a curated set of healthy dinners suitable for a family of 3 (two adults + one small child, "Rosie"). A future enhancement (out of scope for this intent's MVP, but the data model and navigation structure should accommodate it) is letting the husband add/edit recipes himself.

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| Replace ad-hoc "what's for dinner" decision-making with a fast, filterable pick-3 flow | Wife can select a week's dinners in under a few minutes | Must |
| Eliminate manual shopping-list-writing | Shopping list is generated automatically from the 3 picks, ready to copy/text | Must |
| Reduce meal repetition | Catalog surfaces variety by tracking recency of past selections | Should |
| Let the wife curate the catalog to her actual taste | Dinners she'll never make can be suppressed out of view | Must |
| Make actually cooking easier, not just planning | Each picked dinner has clear step-by-step instructions in a dedicated cooking view | Must |
| Seed data supports real weekly use immediately | A usable set of healthy, kid-friendly dinners exists at launch, no empty catalog | Must |

---

## Functional Requirements

### FR-1: Browsable/Filterable Dinner Catalog
- **Description**: Users can view all dinners in the catalog and filter/sort by cuisine type, cook time, and "Rosie-approved" (kid-friendly) tag.
- **Acceptance Criteria**:
  - Catalog displays each dinner's name, cuisine, cook time, and Rosie-approved indicator.
  - Filtering by cuisine type narrows results to matching dinners only.
  - Filtering by "Rosie-approved" shows only kid-tested dinners.
  - Sorting by cook time (ascending) is available.
  - Filters can be combined (e.g. cuisine + Rosie-approved) and cleared.
  - By default, only active (non-suppressed) dinners appear in the catalog.
- **Priority**: Must
- **Related Stories**: `001-dinner-catalog-schema`, `002-browse-filter-sort-catalog`

### FR-2: Weekly Dinner Selection (Pick Exactly 3, Editable Until Sent)
- **Description**: Wife selects up to 3 dinners from the catalog to form the current week's plan. Selections save immediately as she picks — there's no separate "confirm" step. She can freely swap any pick for another **as long as the shopping list hasn't been copied/sent yet**. Once the shopping list is copied (FR-3), the plan locks and becomes immutable.
- **Acceptance Criteria**:
  - User can toggle dinners as "selected" from the catalog view; each add/remove saves immediately.
  - The system never allows more than 3 selections in a plan at once (must remove one before adding a 4th).
  - The shopping list becomes available once exactly 3 dinners are selected.
  - Selections can be freely changed (swap any dinner for another) at any point before the shopping list is copied.
  - Once the shopping list is copied (see FR-3), the plan and its selections lock — no further changes are possible; starting a new week begins a fresh plan.
- **Priority**: Must
- **Related Stories**: `001-weekly-plan-schema`, `002-enforce-exactly-three-immutable`, `003-pick-three-dinners`, `004-editable-until-locked`

### FR-3: Shopping List Generation (Locks the Plan)
- **Description**: Once exactly 3 dinners are selected, generate a single shopping list from their ingredient lists: ingredients shared across dinners are merged, quantities reflect a 3-person serving size, and items are grouped by grocery category (e.g. produce, dairy, meat/protein, pantry). Copying the list is also the moment the week's plan locks (see FR-2).
- **Acceptance Criteria**:
  - Shopping list combines ingredients from all 3 dinners into one list.
  - Ingredients appearing in multiple dinners are merged into a single line with combined quantity when units match.
  - Quantities reflect serving sizes for 3 people (2 adults + 1 small child).
  - List is grouped under category headings.
  - A "copy" action places the formatted list on the clipboard for pasting into a text message, **and locks the plan** so its selections can no longer change.
- **Priority**: Must
- **Related Stories**: `005-generate-shopping-list`, `006-copy-shopping-list-to-clipboard`

### FR-4: Selection History & Variety Nudging
- **Description**: The system records which dinners were part of each **locked** (shopping-list-sent) weekly plan and uses that history to nudge toward variety rather than hard-blocking repeats. Plans that were never locked (e.g. abandoned mid-edit) don't count as "made."
- **Acceptance Criteria**:
  - Each locked weekly plan is stored with its start date and its 3 dinner selections.
  - The catalog view indicates when a dinner was last part of a *locked* plan (e.g. "last made 2 weeks ago" / "never made").
  - A default sort or filter option surfaces dinners not chosen recently ahead of recently-repeated ones.
- **Priority**: Should
- **Related Stories**: `003-last-chosen-query`, `007-variety-indicator`

### FR-5: Seed Data — Healthy Family Dinners
- **Description**: The catalog launches pre-populated with a curated set of healthy dinners suitable for a family of 3, each with cook time under 45 minutes, tagged with cuisine type and Rosie-approved status where applicable.
- **Acceptance Criteria**:
  - At least 50 seed dinners exist at launch (enough for a full year of weekly variety without forced repeats).
  - Every seed dinner has a cook time ≤ 45 minutes.
  - Every seed dinner has a cuisine type, and an ingredient list with quantities pre-scaled to 3 servings and assigned a grocery category.
  - A meaningful subset (just over half) are marked "Rosie-approved."
- **Priority**: Must
- **Related Stories**: `002-seed-healthy-family-dinners`

### FR-6: Recipe Management (Future — Out of Scope)
- **Description**: Husband can add/edit recipes through the app UI.
- **Acceptance Criteria**: N/A — not built in this intent.
- **Priority**: Won't (this intent) — data model must not preclude adding this later.
- **Related Stories**: N/A

### FR-7: Suppress a Dinner
- **Description**: Wife can mark a dinner as "not interested" so it's hidden from the active catalog. Suppression is reversible — a filter/view surfaces suppressed dinners so she can un-suppress one if she changes her mind.
- **Acceptance Criteria**:
  - Any dinner offers a "Not interested" action.
  - Marking a dinner suppressed sets it inactive and it no longer appears in the default catalog view.
  - A "Suppressed" filter/view lists inactive dinners and allows un-suppressing them (setting them active again).
  - Suppressing/un-suppressing a dinner does not alter historical weekly plans that included it.
- **Priority**: Must
- **Related Stories**: `001-dinner-catalog-schema` (`is_active` flag), `009-suppress-dinner`

### FR-8: Cooking View
- **Description**: Once a plan has its dinners picked, a cooking view shows each of the 3 dinners with clear, step-by-step instructions — meant to be used while actually cooking, distinct from the shopping list.
- **Acceptance Criteria**:
  - A dedicated cooking view/page lists the current plan's dinners, each with its instructions broken into discrete, ordered steps (not a single paragraph).
  - Available as soon as a plan has exactly 3 selections — not gated on the plan being locked.
  - Reachable as its own page/route, separate from the shopping list page (see navigation note below).
- **Priority**: Must
- **Related Stories**: `003-dinner-step-by-step-instructions`, `010-cooking-view`

---

## Non-Functional Requirements

### Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Catalog filtering | Perceived response | Instant — filtering happens client-side against a small (tens-of-rows) dataset already loaded |

### Scalability
Not applicable at household scale — single active plan, one household's worth of data (tens of dinners, weekly history rows).

### Security
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Access control | Supabase Row Level Security | Per `system-architecture.md` — shared household auth session, no per-user roles |

### Reliability
No formal uptime target — personal-scale app on free-tier hosting; brief downtime is acceptable.

### Compliance
Not applicable.

---

## Constraints

### Technical Constraints

**Project-wide standards**: Loaded from `memory-bank/standards/` (tech-stack, data-stack, coding-standards, system-architecture, ux-guide).

**Intent-specific constraints**:
- Ingredient quantities in seed data must be authored pre-scaled to 3 servings — no dynamic per-serving scaling UI in this intent.
- Dinner instructions must be stored as ordered, discrete steps (not a single free-text blob) to support FR-8's cooking view.
- Navigation uses real routes (`react-router-dom`), one page per concern (catalog, this week's plan, shopping list, cooking view) — not a single mega-screen — so a future "add/edit recipe" page (FR-6) slots in as another route rather than a rework.

### Business Constraints
- Household project — single family, not a multi-tenant product.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| Wife will always pick from the existing catalog for MVP; recipe-adding UI is future work | If she wants to add a dinner sooner, she'd need to ask the husband to add it via direct DB/SQL | Data model designed so a future "add recipe" UI is additive, not a rework |
| "Week" means "current active plan" vs. history, not strict calendar-week enforcement | If calendar alignment matters later, minor schema/UI adjustment needed | Store an explicit start date per plan rather than inferring from row order |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Exact seed dinner count/list | User + Assistant | Before FR-5 seed data is generated | Resolved — 50 dinners drafted, see `units/001-dinner-catalog/seed-data-draft.md` |
| How "variety nudging" surfaces in UI (badge vs. sort vs. both) | User + Assistant | During units/stories | Resolved — both: a "Last made ... ago" / "Never made" text cue on each catalog card, plus the default (non-cook-time) sort order surfaces least-recently-made dinners first. See `007-variety-indicator`, implemented in bolt `006-weekly-dinner-planner-ui`. |
