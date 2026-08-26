---
intent: 001-weekly-dinner-planner
phase: inception
status: units-decomposed
updated: 2026-08-26T17:26:14Z
---

# Weekly Dinner Planner - Unit Decomposition

## Units Overview

This intent decomposes into 3 units of work:

### Unit 1: 001-dinner-catalog

**Description**: Owns the dinner/recipe domain — schema for dinners, ingredients (with quantity/unit/category), tags (cuisine, Rosie-approved), and an active/suppressed flag, plus RLS policies and the seed data migration. Designed so a future "add/edit recipe" UI (FR-6) is additive.

**Stories**: TBD in story-create

**Deliverables**:
- Supabase migration: `dinners` (incl. `is_active` flag), `dinner_ingredients` tables + tag columns/enums
- RLS policies (household-session read/write)
- Seed data migration: 50 healthy family dinners (drafted in `units/001-dinner-catalog/seed-data-draft.md`)
- `dinner_steps` schema (ordered, discrete cooking steps per dinner) + step content for all 50 seed dinners, added via a follow-up bolt for FR-8

**Dependencies**:
- Depends on: none
- Depended by: 002-weekly-planning, 003-weekly-dinner-planner-ui

**Estimated Complexity**: M

### Unit 2: 002-weekly-planning

**Description**: Owns the weekly-plan domain — schema for a confirmed weekly plan (3 dinner selections + start date), enforcement of "exactly 3, immutable once confirmed," and the selection-history data used for variety nudging (e.g. a view/query for "last chosen date" per dinner).

**Stories**: TBD in story-create

**Deliverables**:
- Supabase migration: `weekly_plans`, `weekly_plan_selections` tables
- DB constraint/trigger enforcing exactly-3 selections and immutability post-confirmation
- RLS policies
- Query/view exposing "last chosen" per dinner for variety nudging

**Dependencies**:
- Depends on: 001-dinner-catalog (references dinners)
- Depended by: 003-weekly-dinner-planner-ui

**Estimated Complexity**: M

### Unit 3: 003-weekly-dinner-planner-ui

**Description**: The React PWA itself — catalog browsing/filtering (FR-1), the pick-3 selection flow (FR-2), client-side shopping list generation with ingredient merging/grouping and clipboard copy (FR-3), variety-nudging UI (FR-4, using data from 002-weekly-planning), suppress/un-suppress dinner actions (FR-7), and a cooking view showing step-by-step instructions for the picked dinners (FR-8). Uses real routes (one page per concern) so future recipe-management pages (FR-6) are additive.

**Stories**: TBD in story-create

**Deliverables**:
- Dinner catalog page with filters (cuisine, cook time, Rosie-approved) and sort (cook time, "least recently made")
- Pick-3 selection flow with validation and confirmation
- Shopping list view: merged, category-grouped, with copy-to-clipboard
- Cooking view: the plan's 3 dinners, each with ordered step-by-step instructions
- Real routing (`react-router-dom`): separate pages for catalog, this week's plan, shopping list, and cooking view
- PWA setup (installable, offline caching for the active shopping list)
- Supabase Auth login (shared household password)
- "Not interested" / suppress action + a "Suppressed" view to un-suppress

**Dependencies**:
- Depends on: 001-dinner-catalog, 002-weekly-planning
- Depended by: none

**Estimated Complexity**: L

## Unit Dependency Graph

```text
[001-dinner-catalog] ──> [002-weekly-planning] ──> [003-weekly-dinner-planner-ui]
        │                                                    ▲
        └────────────────────────────────────────────────────┘
```

## Execution Order

Based on dependencies:

1. 001-dinner-catalog (foundation — schema + seed data)
2. 002-weekly-planning (builds on dinner-catalog)
3. 003-weekly-dinner-planner-ui (consumes both backend units)

## Requirement-to-Unit Mapping

- **FR-1** (Browsable/Filterable Catalog) → `001-dinner-catalog` (schema/tags), `003-weekly-dinner-planner-ui` (filter/sort UI)
- **FR-2** (Pick Exactly 3) → `002-weekly-planning` (schema/constraint), `003-weekly-dinner-planner-ui` (selection flow)
- **FR-3** (Shopping List Generation) → `003-weekly-dinner-planner-ui` (client-side aggregation logic, uses ingredient data from `001-dinner-catalog`)
- **FR-4** (Selection History & Variety) → `002-weekly-planning` (history schema/query), `003-weekly-dinner-planner-ui` (variety UI)
- **FR-5** (Seed Data) → `001-dinner-catalog`
- **FR-6** (Recipe Management — Won't, this intent) → `001-dinner-catalog` (schema must not preclude it later)
- **FR-7** (Suppress a Dinner) → `001-dinner-catalog` (`is_active` flag), `003-weekly-dinner-planner-ui` (suppress/un-suppress UI)
- **FR-8** (Cooking View) → `001-dinner-catalog` (`dinner_steps` schema/content), `003-weekly-dinner-planner-ui` (cooking view page)
