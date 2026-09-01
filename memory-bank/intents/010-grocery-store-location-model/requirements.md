---
intent: 010-grocery-store-location-model
phase: inception
status: draft
created: '2026-09-01T02:05:00Z'
updated: '2026-09-01T02:05:00Z'
---

# Requirements: Grocery Store Location Model

## Intent Overview

Rework the "Grocery store setup" page and its data model so the structure matches the real
goal: connecting **individual recipe ingredients** to the **specific place the user
personally finds them** in their store, and reusing that knowledge (map "pinto beans" to
Aisle 2 → "black beans" is one tap to the same place). **Unassigned is a valid, expected
state — never an error.**

**Source**: `storeconfig.md` (repo root) — a shared-context brief plus a _Design Prompt_ and a
_Functionality Prompt_. This intent covers the **functional/data-model** half; the visual
redesign called for in the Design Prompt is a **separate design intent** (its highlights are
recorded below because they shape the model, not because they are built here).

### What's wrong today

`StoreConfigPage` shows two side-by-side panels — an ordered **"Rows"** list and a separate
**"Category Assignments"** list mapping the five broad categories (Dairy, Grains, Pantry,
Produce, Protein) to rows. Because both panels list nearly the same names, it reads as
**duplicated data** rather than two distinct concepts, and category-level mapping is too
coarse: the user thinks "black beans are in Aisle 2", not "the Pantry category is in Aisle 2".

### The model this intent builds

- **Location** — a stop in the user's walking path. Has a **name**, a **type** (`section`,
  e.g. "Dairy" / "Bakery", **or** `aisle`, e.g. "Aisle 1" / "Aisle 2"), and **one shared
  ordered `position`** so sections and aisles interleave in a **single** sequence — there is
  no separate list per type. Household-scoped. (Evolves today's `grocery_store_rows`.)
- **Item** — an individual ingredient (e.g. "black beans", "eggs"). Optionally links to
  **one** Location; **null is valid and expected** and must never raise a validation error.
  Items are already tied to recipes elsewhere (via `dinner_ingredients`); the Location link
  is **additive metadata**, not a replacement for the recipe–ingredient relationship. **Many
  Items → one Location is the common case** (cupcakes, bread, cookies all → "Bakery").
- **Similarity suggestion** — when the user is assigning a Location to an Item that has none,
  the system surfaces previously-located Items that look similar (substring / fuzzy match on
  the item name; existing category grouping as an _optional secondary_ signal) and shows
  where those were placed, so "same place as pinto beans" is one action, not a form to fill.
  **Suggestion only — never auto-assign without confirmation.**

### Relationship to prior work

This **supersedes** the model of `001-weekly-dinner-planner` unit `004-grocery-store-config`
(the `grocery_store_rows` + `category_row_assignments` category-level mapping) and reworks the
`src/features/store-config/` feature and the shopping-list group-ordering logic that consumes
it. `grocery_store_rows` / `category_row_assignments` are **already household-scoped** (columns

- RLS added by `004-account-model`, migrations `20260828231000` / `20260828232000`) — the new
  model must keep that.

---

## Business Goals

| Goal                                                                          | Success Metric                                                                                                                                       | Priority |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| The page's structure makes the model self-evident (one path + item placement) | One ordered walking-path list (sections + aisles interleaved); a separate item-level "put this ingredient here" action; no duplicated-looking panels | Must     |
| Ingredient-level placement, reused intelligently                              | The user can place an individual ingredient at a Location; placing a similar new ingredient offers a one-tap "same place as X" suggestion            | Must     |
| Unassigned is calm and normal                                                 | An Item with no Location renders after the ordered list, alphabetically, with no error styling; still easy to find and assign                        | Must     |
| The shopping list still reads in walking order                                | Shopping-list ingredient groups are ordered by each ingredient's Location `position`; unlocated ingredients fall after the path, alphabetically      | Must     |
| Household isolation preserved                                                 | Every new table is household-scoped by RLS; one household never sees another's Locations or placements                                               | Must     |
| Nothing is locked in that blocks the deferred features                        | Adding inline Item editing (OQ-A) or drag-and-drop reorder (OQ-B) later needs **no schema change**                                                   | Must     |

---

## Functional Requirements

> Several FRs depend on the open questions (OQ-A / OQ-B / OQ-C / OQ-D / OQ-E). Where a
> requirement's exact shape is gated, it is marked **[gated by OQ-x]** and states the
> assumption this draft runs on.

### FR-1: `Location` entity (evolves `grocery_store_rows`)

- **Description**: A household-scoped table for stops in the walking path:
  - `id`, `household_id` (FK, RLS predicate)
  - `name text not null`
  - `type text not null check (type in ('section','aisle'))`
  - `position integer not null` — **one** ordered sequence per household, sections and aisles
    together; unique `(household_id, position)` (as `grocery_store_rows` is today)
- **Acceptance Criteria**:
  - Table created (or `grocery_store_rows` altered — see OQ-D) with RLS: members read/write
    their own household's rows only; policy shape matches `20260828232000`.
  - `type` is constrained to `section` / `aisle`.
  - Ordering is a single `ORDER BY position` across both types — no per-type sub-ordering.
  - The existing race-safe reorder RPC (`reorder_grocery_store_row` / an equivalently-named
    `reorder_location`) still applies to the unified list.
- **Priority**: Must

### FR-2: Item → Location link **[gated by OQ-C]**

- **Description**: An Item (individual ingredient) optionally references **one** Location.
  Null is valid and expected. Many Items may reference the same Location.
- **Assumption this draft runs on (OQ-C)**: a household-scoped **`items`** registry keyed by
  a normalised ingredient name, with `location_id uuid null references locations(id) on
delete set null`. The alternative — an `ingredient_locations (household_id, ingredient_name,
location_id)` table keyed on the free-text name with no registry — is the other candidate.
- **Acceptance Criteria**:
  - An Item with `location_id = null` is a normal, non-error state; no `not null` constraint,
    no check that rejects it.
  - Deleting a Location nulls its Items' `location_id` (`on delete set null`) — Items are not
    deleted with the Location.
  - Many Items can point at one Location with no uniqueness conflict.
  - The link is **additive** — it does not touch `dinner_ingredients` or the
    recipe→ingredient relationship.
  - Household-scoped RLS; a household never reads another household's placements.
- **Priority**: Must

### FR-3: Unified ordered walking-path list

- **Description**: The page presents **one** ordered list of Locations — `section` stops
  (named) and `aisle` stops (numbered) interleaved in `position` order. Aisles are a peer
  type of stop, **not** a lesser sub-category of a list.
- **Acceptance Criteria**:
  - Add a Location with a `type` and a name; it takes the next `position`.
  - Reorder a Location up/down through the **single** sequence (past stops of either type)
    via the existing arrow-reorder RPC; `position` stays unique per household after every
    move.
  - `section` vs `aisle` is a data attribute available to the UI to render them distinctly
    (the visual treatment is the design intent's concern).
- **Priority**: Must

### FR-4: Similarity-suggestion query

- **Description**: When the user is about to place an Item that has no Location, the system
  queries the household's previously-located Items for likely matches and returns the top
  match(es) with their Location, for a one-action accept.
- **Acceptance Criteria**:
  - Matching starts **simple**: case-insensitive substring / token overlap on the item name
    (e.g. "beans" shared by "pinto beans" and "black beans"). A trigram / `pg_trgm`
    similarity or a `LIKE '%token%'` scan is acceptable for this scale.
  - Existing category / grouping metadata, **if it still exists** (OQ-E), is an **optional
    secondary** signal — a tiebreaker, never the sole basis for a suggestion.
  - Returns 0..N ranked matches, each with `{ item_name, location_id, location_name,
location_type }`; 0 matches is a normal result (the user assigns manually).
  - Accepting a suggestion sets the new Item's `location_id` to the matched Location in one
    write. The system **never** assigns a Location without an explicit user action.
  - Scoped to the caller's household.
- **Priority**: Must

### FR-5: Unassigned items — calm, findable, assignable

- **Description**: Any Item with `location_id = null` is shown **after** the ordered path,
  **alphabetically** — the same behaviour as today's unassigned categories — with no
  error/warning styling. The user can still find and assign them.
- **Acceptance Criteria**:
  - Unassigned Items list alphabetically after the last Location.
  - No red / warning / "needs attention" treatment (visual detail is the design intent's;
    the requirement is: not an error state).
  - Assigning an unassigned Item (directly or via a suggestion) moves it out of the
    unassigned list into its Location on the next render.
- **Priority**: Must

### FR-6: Shopping-list group ordering rework

- **Description**: The shopping list currently orders its category groups by
  `category → row` position (a pure function; unassigned categories last, alphabetically —
  `001` unit 004). Rework it to order by each **ingredient's** `Item → Location` position.
- **Acceptance Criteria**:
  - Shopping-list ingredient groups are ordered by the Location `position` of the ingredients
    they contain.
  - An ingredient whose Item has **no** Location falls **after** all Located groups,
    **alphabetically** — today's fallback behaviour is preserved.
  - The grouping/aggregation itself (`buildShoppingList` merge logic) is unchanged — this FR
    only changes the **sort key** feeding it.
  - Existing shopping-list tests are updated to the Item→Location ordering; output for
    already-assigned data is equivalent to today's after the cutover (OQ-D).
- **Priority**: Must

### FR-7: Schema + data cutover **[gated by OQ-D]**

- **Description**: The new model arrives in **new, append-only** migration file(s) under
  `supabase/migrations/`. Existing per-household `grocery_store_rows` +
  `category_row_assignments` data is carried across.
- **Assumption this draft runs on (OQ-D)**: each existing `grocery_store_rows` row becomes a
  Location with `type = 'section'` (name preserved, position preserved); each
  `category_row_assignments (category → row)` row is expanded so every distinct ingredient in
  that category (from `dinner_ingredients`) becomes an Item placed at that row's Location.
  The alternative is to migrate only the Locations and let all Items start unassigned.
- **Acceptance Criteria**:
  - Forward-only, idempotent-for-dev migration; no edits to prior migration files.
  - After cutover, a household that had configured rows + assignments sees an equivalent
    walking path and equivalent shopping-list ordering (no regression for existing data).
  - `category_row_assignments` (and `grocery_store_rows`, if replaced rather than altered) is
    dropped **only after** its data is carried across, in the same migration or a documented
    follow-up.
- **Priority**: Must

### FR-8: `StoreConfigPage` rework (functional contract)

- **Description**: Replace the two-panel "Rows" + "Category Assignments" layout with (a) the
  single unified walking-path list (FR-3) and (b) an item-level "place this ingredient" flow
  that uses the similarity suggestion (FR-4) as a lightweight confirmation rather than a
  blank form field. Per-Location, show the multiple Items that live there in a way that
  scales (not a wall of text).
- **Acceptance Criteria**:
  - No "Category Assignments" panel remains.
  - The page can: list/add/reorder Locations (FR-3); place an Item at a Location, with the
    suggestion offered when one exists (FR-4); show a Location's Items; show the unassigned
    list (FR-5).
  - `src/features/store-config/{api.ts,hooks.ts,types.ts,components/StoreConfigPage.tsx}` and
    their tests are reworked to the new model.
  - Visual / interaction design (the unified-list treatment, the suggestion affordance, the
    "many items per location" display, the unassigned treatment) is delegated to a **design
    intent** — this FR is the behavioural contract it must satisfy.
- **Priority**: Must

### FR-9: v1 non-goals with clean extension points **[gated by OQ-A, OQ-B]**

- **Description**: Deliberately **not** in v1: inline creation / renaming of Items and their
  category grouping on this page (OQ-A); drag-and-drop reordering of Locations (OQ-B).
- **Acceptance Criteria**:
  - Reordering ships as the **current up/down arrow** interaction (the existing RPC),
    unchanged.
  - Item creation / renaming / category-grouping stays where it is today (the Catalog page) —
    this page only assigns Locations.
  - The schema and the component API leave clean seams so **either** deferred feature can be
    added later **without a schema change** (e.g. `position` is already an ordered int that a
    DnD handler can write; the Item registry, if adopted, already has a name column an inline
    rename would target).
- **Priority**: Must

### FR-10: Standards & decision docs

- **Description**: Record the model change.
- **Acceptance Criteria**:
  - `memory-bank/standards/system-architecture.md` / `data-stack.md` — replace the
    category→row description with the Location + Item model.
  - `memory-bank/standards/decision-index.md` — an entry for "grocery store config moves from
    broad-category→row mapping to individual-ingredient→Location, with a unified
    section/aisle walking path and a similarity-suggestion assist".
  - `001-weekly-dinner-planner` unit `004-grocery-store-config`'s brief gets a
    "superseded by `010`" note.
- **Priority**: Should

---

## Non-Functional Requirements

### Security / Tenancy

| Requirement         | Notes                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Household isolation | Every new table (`locations`, `items` / `ingredient_locations`) is RLS-scoped by `household_id`, matching `20260828232000`'s pattern; `household_id` resolved server-side, never trusted from a request. |
| No new backend      | Same Supabase-direct model — no Edge Function; enforcement is RLS + (if needed) a `security definer` reorder RPC, as today.                                                                              |

### Data integrity

| Requirement                | Target                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Unassigned is not an error | No `not null` / check constraint rejects `location_id = null`; the UI shows no error state for it.                                              |
| Ordering stays valid       | `(household_id, position)` unique after every add / reorder / delete (the existing reorder RPC's move-out/shift/move-in property carries over). |
| Cutover has no regression  | Existing configured households get an equivalent walking path + shopping-list order after the migration (OQ-D).                                 |
| Migrations                 | Append-only; no edits to prior migration files.                                                                                                 |

### Extensibility

| Requirement       | Target                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Deferred features | Inline Item editing (OQ-A) and drag-and-drop reorder (OQ-B) can each be added later with **no schema change**.                          |
| Similarity engine | The v1 substring/fuzzy match can be swapped for something better (embeddings, a curated synonym table) behind the same query interface. |

### Regression

| Requirement    | Target                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Shopping list  | Group ordering for already-assigned data is equivalent to today's after cutover; `buildShoppingList` merge logic unchanged. |
| Other features | Catalog, weekly plan, cooking view untouched — the Location link is additive to `dinner_ingredients`, not a change to it.   |

---

## Constraints

### Technical Constraints

- **Supersedes** the `001` unit `004` model (`grocery_store_rows` + `category_row_assignments`
  category→row mapping) and reworks `src/features/store-config/` + the shopping-list sort.
- `supabase/migrations/` is append-only. `grocery_store_rows` / `category_row_assignments` are
  already household-scoped (`20260828231000` / `20260828232000`) — the new model keeps that;
  it does **not** re-solve tenancy.
- Reordering ships as the **existing up/down arrow** RPC interaction; **no** drag-and-drop in
  v1 (OQ-B).
- **No** inline Item / category-grouping editing on this page in v1 (OQ-A); that stays on the
  Catalog page.
- The similarity feature is a **suggestion only** — it never assigns a Location without an
  explicit user action.
- `category` grouping metadata, if kept at all, is only a **loose secondary signal** for
  similarity (OQ-E) — not a first-class part of the new model.
- Supabase-direct, no backend server; `pg_trgm` may be enabled for FR-4 if it helps (it is a
  standard Supabase extension).

### Business Constraints

- Household project — same single-family scope as `001`–`009`. The requester is **Chandler**
  (the primary shopper); the open questions below are **for Chandler to answer directly** —
  the handoff is explicit: "do not silently assume".

---

## Assumptions

| Assumption                                                                                       | Risk if Invalid                                       | Mitigation                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `grocery_store_rows` / `category_row_assignments` are household-scoped with RLS since intent 004 | The new model would have to add tenancy               | **Verified** — `20260828231000` adds `household_id` + `(household_id, position)` unique; `20260828232000` adds the direct RLS policies |
| An "Item" is best modelled as a deduped, household-scoped ingredient registry (OQ-C assumption)  | The schema is materially different (name-keyed table) | OQ-C is explicit and blocking; the units decomposition firms up once it's answered                                                     |
| Existing `category_row_assignments` should expand to per-ingredient placements on cutover (OQ-D) | Cutover leaves everything unassigned instead          | OQ-D is explicit; either path is a one-time forward migration                                                                          |
| `pg_trgm` (or a simple `LIKE`/token scan) is sufficient for FR-4 at single-household scale       | Suggestions are poor / slow                           | The engine is swappable behind the query interface; revisit only if quality is bad in use                                              |
| The shopping-list group-ordering is a pure function fed a sort config (as in `001` unit 004)     | The rework touches more of `buildShoppingList`        | Confirm at construction start; FR-6 scopes the change to the sort key only                                                             |

---

## Open Questions

| #    | Question                                                                                                                                                                                                           | Owner                    | Resolution                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-A | Does this page allow **inline creation / renaming of Items and their category grouping**, or does that stay confined to the existing **Catalog** page, with this page only handling location assignment?           | Requester (Chandler)     | **Pending — must ask directly.** Draft assumption: Catalog-only; this page assigns Locations only. Layout should leave room for inline editing later without a schema change. |
| OQ-B | Is **drag-and-drop reordering** of Locations required, or are **up/down arrow buttons** (current behaviour) acceptable for v1?                                                                                     | Requester (Chandler)     | **Pending — must ask directly.** Draft assumption: arrows for v1 (the existing RPC); DnD is a clean later add (`position` is already an ordered int).                         |
| OQ-C | Model "Item" as a **deduped household-scoped ingredient registry table** (name + optional `location_id`), or as an **`ingredient_locations` mapping** keyed on the free-text ingredient name with **no** registry? | Requester + Construction | **Pending — schema-determining.** Draft assumption: registry table. This decides FR-2, FR-4, FR-7 and the units breakdown.                                                    |
| OQ-D | On cutover, do existing `category_row_assignments` **expand** to per-ingredient placements at that category's row's Location, or do we **migrate Locations only** and start all Items unassigned?                  | Requester (Chandler)     | **Pending.** Draft assumption: expand (no regression for configured households). Either way it is a one-time forward migration.                                               |
| OQ-E | Does the broad **`category`** grouping (Dairy / Grains / …) **survive** as a loose secondary similarity signal, or is it removed from this model entirely?                                                         | Requester (Chandler)     | **Pending.** Draft assumption: it survives only as an optional tiebreaker for FR-4; it is no longer a first-class mapping.                                                    |
| OQ-F | Route / entry: keep the current "Grocery store setup" page + route, or fold it into `/settings` alongside the AI card and (future) `dinners_per_week`?                                                             | Product owner            | **Assumed:** keep the existing dedicated page for v1; a `/settings` consolidation is a separate call.                                                                         |

---

## Priority Definitions

| Priority | Meaning                                                                   |
| -------- | ------------------------------------------------------------------------- |
| Must     | Required; the reworked model / page is incomplete or regresses without it |
| Should   | Important (the standards-doc updates) but not blocking the feature        |
| Could    | Not used in this intent                                                   |
| Won't    | See Out of Scope                                                          |

## Out of Scope (Won't — this intent)

- The **visual redesign** itself (unified-list treatment, suggestion affordance styling,
  "many items per location" display, unassigned treatment) → a separate **design intent**;
  this intent is the functional/data contract.
- **Inline Item creation / renaming / category-grouping** on this page (OQ-A default: no).
- **Drag-and-drop** reordering of Locations (OQ-B default: no).
- Auto-assigning Locations from the similarity engine without user confirmation.
- A better similarity engine than substring/fuzzy (embeddings, curated synonyms) — the v1
  interface is swappable.
- Folding the page into `/settings` (OQ-F default: keep the dedicated page).
- Any change to `dinner_ingredients`, the catalog, the weekly plan, or the cooking view
  beyond consuming the new sort key in the shopping list.
