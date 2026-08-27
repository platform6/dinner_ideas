---
intent: 001-weekly-dinner-planner
phase: inception
status: complete
updated: 2026-08-27T01:00:00Z
---

# Weekly Dinner Planner - Unit Decomposition

## Units Overview

This intent decomposes into 4 units of work:

### Unit 1: 001-dinner-catalog

**Description**: Owns the dinner/recipe domain — schema for dinners, ingredients (with quantity/unit/category), a generic tag system (cuisine, kid-friendliness, anything else — replacing the old fixed `rosie_approved` flag), and an active/suppressed flag, plus RLS policies and the seed data migration. Designed so a future "add/edit recipe" UI (FR-6) is additive.

**Stories**: TBD in story-create

**Deliverables**:

- Supabase migration: `dinners` (incl. `is_active` flag), `dinner_ingredients` tables
- RLS policies (household-session read/write)
- Seed data migration: 50 healthy family dinners (drafted in `units/001-dinner-catalog/seed-data-draft.md`)
- `dinner_steps` schema (ordered, discrete cooking steps per dinner) + step content for all 50 seed dinners, added via a follow-up bolt for FR-8
- Generic tags schema (`tags`, `dinner_tags` join table) replacing `rosie_approved`, added via a follow-up bolt for FR-9

**Dependencies**:

- Depends on: none
- Depended by: 002-weekly-planning, 003-weekly-dinner-planner-ui

**Estimated Complexity**: M

### Unit 2: 002-weekly-planning

**Description**: Owns the weekly-plan domain — schema for a confirmed weekly plan (3 dinner selections + start date), enforcement of "exactly 3, immutable once confirmed," the selection-history data used for variety nudging, and an explicit eaten-history record for past weeks (FR-11).

**Stories**: TBD in story-create

**Deliverables**:

- Supabase migration: `weekly_plans`, `weekly_plan_selections` tables
- DB constraint/trigger enforcing exactly-3 selections and immutability post-confirmation
- RLS policies
- Query/view exposing "last chosen" per dinner for variety nudging
- `meal_history` schema: one row per dinner per locked week, written on plan lock, added via a follow-up bolt for FR-11

**Dependencies**:

- Depends on: 001-dinner-catalog (references dinners)
- Depended by: 003-weekly-dinner-planner-ui

**Estimated Complexity**: M

### Unit 3: 003-weekly-dinner-planner-ui

**Description**: The React PWA itself — catalog browsing/filtering (FR-1), the pick-3 selection flow (FR-2), client-side shopping list generation with ingredient merging/grouping and clipboard copy (FR-3), variety-nudging UI (FR-4), suppress/un-suppress dinner actions (FR-7), a cooking view (FR-8), expandable catalog-card details + tag management (FR-9/FR-10), past/future week navigation (FR-11), and the grocery store config page (FR-12, using domain logic from 004-grocery-store-config). Uses real routes (one page per concern) so future recipe-management pages (FR-6) are additive.

**Stories**: TBD in story-create

**Deliverables**:

- Dinner catalog page with filters (cuisine, cook time, tags) and sort (cook time, "least recently made")
- Pick-3 selection flow with validation and confirmation
- Shopping list view: merged, category-grouped (ordered per FR-12 config), with copy-to-clipboard
- Cooking view: the plan's 3 dinners, each with ordered step-by-step instructions
- Real routing (`react-router-dom`): separate pages for catalog, this week's plan, shopping list, cooking view, and (new) grocery store config
- PWA setup (installable, offline caching for the active shopping list)
- Supabase Auth login (shared household password)
- "Not interested" / suppress action + a "Suppressed" view to un-suppress
- Expandable "Details" section per catalog card: cooking steps, ingredients, tag list + "+" add-tag control (FR-9/FR-10)
- Week view with ◀ / ▶ navigation through past/current weeks, date-range header, eaten-vs-planned distinction (FR-11)
- Grocery store row config page: add/reorder named rows, assign categories to rows (FR-12)

**Dependencies**:

- Depends on: 001-dinner-catalog, 002-weekly-planning, 004-grocery-store-config
- Depended by: none

**Estimated Complexity**: L

### Unit 4: 004-grocery-store-config

**Description**: Owns the grocery-store-layout domain — an ordered, named list of "rows" (aisle sections) and the mapping from ingredient category to row, plus the logic that reorders the shopping list's category groups by that sequence instead of alphabetically (FR-12).

**Stories**: TBD in story-create

**Deliverables**:

- Supabase migration: `grocery_store_rows` (name, position) and a category→row assignment (`grocery_row_categories`, or a `row_id` column added to a category-registry concept)
- RLS policies (household-session read/write)
- Reorder function: given the existing shopping-list category groups (`buildShoppingList` output) and the current row config, return groups sorted by row position, with unassigned categories falling back to alphabetical order after all configured rows

**Dependencies**:

- Depends on: none (references ingredient `category` strings conceptually, not a hard FK — unit 001 is already complete)
- Depended by: 003-weekly-dinner-planner-ui

**Estimated Complexity**: S

## Unit Dependency Graph

```text
[001-dinner-catalog] ──> [002-weekly-planning] ──┐
        │                                         ├──> [003-weekly-dinner-planner-ui]
        └─────────────────────────────────────────┤
[004-grocery-store-config] ──────────────────────>┘
```

## Execution Order

Based on dependencies:

1. 001-dinner-catalog (foundation — schema + seed data; already complete, FR-9 adds a follow-up bolt)
2. 002-weekly-planning (builds on dinner-catalog; already complete, FR-11 adds a follow-up bolt)
3. 004-grocery-store-config (independent — no dependency on 001/002, can run any time)
4. 003-weekly-dinner-planner-ui (consumes all three backend units)

## Requirement-to-Unit Mapping

- **FR-1** (Browsable/Filterable Catalog) → `001-dinner-catalog` (schema/tags), `003-weekly-dinner-planner-ui` (filter/sort UI)
- **FR-2** (Pick Exactly 3) → `002-weekly-planning` (schema/constraint), `003-weekly-dinner-planner-ui` (selection flow)
- **FR-3** (Shopping List Generation) → `003-weekly-dinner-planner-ui` (client-side aggregation logic, uses ingredient data from `001-dinner-catalog`, reorder logic from `004-grocery-store-config`)
- **FR-4** (Selection History & Variety) → `002-weekly-planning` (history schema/query), `003-weekly-dinner-planner-ui` (variety UI)
- **FR-5** (Seed Data) → `001-dinner-catalog`
- **FR-6** (Recipe Management — Won't, this intent) → `001-dinner-catalog` (schema must not preclude it later)
- **FR-7** (Suppress a Dinner) → `001-dinner-catalog` (`is_active` flag), `003-weekly-dinner-planner-ui` (suppress/un-suppress UI)
- **FR-8** (Cooking View) → `001-dinner-catalog` (`dinner_steps` schema/content), `003-weekly-dinner-planner-ui` (cooking view page)
- **FR-9** (Generic Tag System) → `001-dinner-catalog` (tags schema), `003-weekly-dinner-planner-ui` (tag management UI)
- **FR-10** (Expandable Recipe Details) → `003-weekly-dinner-planner-ui` (catalog card details section)
- **FR-11** (Week Navigation & Eaten History) → `002-weekly-planning` (`meal_history` schema), `003-weekly-dinner-planner-ui` (week nav UI)
- **FR-12** (Grocery Store Row Config) → `004-grocery-store-config` (schema + reorder logic), `003-weekly-dinner-planner-ui` (config page)
