---
intent: 010-grocery-store-location-model
phase: inception
status: inception-complete
created: '2026-09-04T14:11:32Z'
updated: '2026-09-04T14:30:00Z'
---

# Requirements: Grocery Store Location Model ("Walking Path")

## Intent Overview

Replace the current two-panel "Rows" + "Category Assignments" store-config page with one
unified, ordered **walking path** of Locations, and let the user place **individual
ingredients** at those stops — with category-level placement surviving as an automatic
fallback so nothing already configured stops working. A similarity assist offers "place this
like that one" when placing an ingredient that resembles one already placed. Shopping lists
sort by each ingredient's resolved location.

**Source**: `storeconfig.md` (repo root) — a fully revised, settled spec (supersedes the
earlier `010` draft, removed 2026-09-04). Almost every prior open question now has a chosen
default in the source; this document exists to translate that spec into this codebase's real
conventions and close the few gaps the source doesn't (and can't) address on its own.

**Type**: brown-field. Supersedes `001-weekly-dinner-planner` unit `004-grocery-store-config`
(`grocery_store_rows` + `category_row_assignments`). Reworks `src/features/store-config/` and
the shopping-list group-ordering function. **Introduces a new entity this app doesn't have
yet** — an ingredient (`items`) registry — because `storeconfig.md`'s schema assumes one
already exists; here, ingredients are still per-dinner free text (`dinner_ingredients`).

## Cross-check against live source (2026-09-04)

- **Tenancy**: `storeconfig.md` keys everything on `user_id`. This app's real scoping boundary
  is `household_id` (shared-household model, intent `004`, `current_user_household_id()` +
  matching RLS on every table). Every `user_id` in the source translates to `household_id`
  here — not a design choice, a repo convention.
- **`grocery_store_rows` / `category_row_assignments`** are already household-scoped
  (`unique(household_id, position)`, `unique(household_id, category)`, household RLS,
  migrations `20260828231000`/`20260828232000`) — the cutover in FR-10 has no tenancy work to
  do, only a reshape.
- **No `items` catalog exists.** `dinner_ingredients` (`dinner_id`, `name`, `quantity`,
  `unit`, `category`) is free text with no dedup and no stable identity across dinners. FR-3
  builds that registry from scratch — this is genuinely new scope beyond what
  `storeconfig.md`'s schema section describes (it assumes `items` "(existing catalog row)").
- **`reorder_grocery_store_row`** is a proven, race-safe, already-household-scoped shift RPC.
  FR-9 generalizes it rather than adopting `storeconfig.md`'s spaced-integer (10, 20, 30…)
  scheme — same acceptance criteria, reuses a pattern already correct in this codebase.
- **`dinners.household_id`** exists (intent `004`); `dinner_ingredients` resolves its
  household via `dinner_id → dinners.household_id` — needed for FR-3's trigger.
- **No design-intent dependency this time** — `storeconfig.md`'s own "Visual direction"
  section is a complete prose spec (tokens, chip geometry, states, flows, motion, a11y). The
  referenced `Store Setup — Design Direction.dc.html` file isn't in the repo, but nothing
  needed to build is missing.
- **Future recipe-import** (URL / Claude-assisted, not yet an intent) will add new
  `dinner_ingredients`-writing code paths this intent cannot see yet. Resolved 2026-09-04
  (below, FR-3): the Items-registry sync is a **database trigger**, not application code, so
  that future intent needs no changes here.

## Resolved Decisions (this session, 2026-09-04)

| #   | Decision                                                                                                                                                                                                                                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Items registry is **backfilled once** from existing `dinner_ingredients` (distinct per household), **then kept in sync by a trigger** on every future `dinner_ingredients` insert/update — regardless of whether the row comes from manual entry or a future import feature. | Matches `storeconfig.md`'s own default ("unassigned scope: items used in ≥1 recipe") being true on day one; trigger-based sync means recipe-import (URL/Claude) needs no changes here later.                                                                                                                                                                                                                                        |
| 2   | Registry dedup key is **case-insensitive, trimmed exact match** (`lower(trim(name))`), not the similarity engine's fuzzy normalization.                                                                                                                                      | Cheap, deterministic, source-agnostic. The similarity engine's heavier normalization (FR-7) stays a _suggestion_ over already-distinct Item rows — it never merges registry rows. A noisier future import path (LLM-extracted ingredient text) creates at most an extra Item row, immediately fixable by one accepted suggestion — not a data-integrity problem.                                                                    |
| 3   | Deleting a Location **deletes** (not nulls) the `item_placements` / `category_placements` rows that pointed to it (`on delete cascade` on the location FK), rather than nulling a `location_id` column.                                                                      | `storeconfig.md` describes the _effect_ ("null the affected placements... items fall back to category, then unassigned") but a placement row's whole reason to exist is the location it names — modeling "no placement" as "row absent" (not "row present with a null location") keeps `item_placements` / `category_placements.location_id` `not null` and the resolution chain (FR-6) a simple existence check, not a null check. |
| 4   | Reorder reuses the existing **shift-based** `reorder_grocery_store_row` pattern, generalized to `(store_id, position)`, not `storeconfig.md`'s spaced-integer scheme.                                                                                                        | Already proven, already race-safe, already this codebase's convention. Acceptance criteria ("moves within the single sequence") don't require literally single-row-update reordering.                                                                                                                                                                                                                                               |
| 5   | The similarity algorithm (FR-7) runs **client-side in TypeScript**, not a SQL function or `pg_trgm`.                                                                                                                                                                         | Household-scale data (dozens of items); matches this app's existing pattern (`applyFilters`, `buildShoppingList` are TS, not SQL); no Edge Function, no new extension.                                                                                                                                                                                                                                                              |

---

## Business Goals

| Goal                                                          | Success Metric                                                                                                                                        | Priority |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| The page's structure matches the mental model                 | One ordered walking-path list, no side-by-side panels that read as duplicated data                                                                    | Must     |
| Placing an ingredient once benefits every recipe that uses it | An ingredient placed at a Location sorts correctly on every future shopping list containing it                                                        | Must     |
| Nothing already configured breaks                             | Category-level placement survives as an automatic fallback; existing Rows/Assignments migrate with an equivalent walking order and shopping-list sort | Must     |
| Placement is fast without ever guessing wrong silently        | A similarity suggestion is one tap to accept, never auto-applied; a dismissed suggestion doesn't recur                                                | Must     |
| Unassigned is a normal, calm state                            | No red/warning styling anywhere except the one destructive (location-delete) confirm                                                                  | Must     |
| The schema survives multi-store (v2) with no migration        | `stores` + household-scoped `store_id` FKs exist now; v1 UI hides the selector                                                                        | Must     |

---

## Functional Requirements

### FR-1: `stores` entity

- **Description**: A household-scoped Store — a fully independent configuration with its own
  ordered Locations. v1 ships with exactly one Store per household; the multi-store schema
  lands now so v2 is UI-only.
- **Acceptance Criteria**:
  - `stores(id, household_id, name, is_active, created_at)`.
  - At most one **active** store per household: partial unique index
    `unique (household_id) where is_active`.
  - Household-scoped RLS mirroring `20260828232000`.
  - One Store auto-seeded per existing household during cutover (FR-10); new households seed
    one Store the same way `seed_default_household_catalog()` seeds the dinner catalog.
  - No store selector in v1 UI (FR-15's "read-only chip" covers the visible surface); adding
    the selector in v2 requires no schema change.
- **Priority**: Must

### FR-2: `locations` entity (evolves `grocery_store_rows`)

- **Description**: A stop on the walking path — `section` or `aisle`, peers in one ordered
  sequence per Store.
- **Acceptance Criteria**:
  - `locations(id, household_id, store_id, name, type, position)`, `type in ('section',
'aisle')`, `unique (store_id, position)`, `unique (id, store_id)` (enables the composite
    FKs in FR-4/FR-5), FK `store_id → stores(id) on delete cascade`.
  - `name` is free text; `type` drives display only (no separate numeric field) — a name with
    no parseable number still renders correctly (as a section) per FR-11.
  - Household-scoped RLS mirroring `20260828232000`.
  - Ordering is a single `ORDER BY position` per store — no per-type sub-ordering.
- **Priority**: Must

### FR-3: Items registry (new) + trigger-based sync

- **Description**: A deduped, household-scoped ingredient-name registry. Does not exist in
  this app today — `dinner_ingredients` is free text with no stable identity. Built here from
  scratch, kept in sync automatically regardless of which code path writes an ingredient.
- **Acceptance Criteria**:
  - `items(id, household_id, name, name_key generated always as (lower(trim(name))) stored,
created_at)`, `unique (household_id, name_key)`.
  - A trigger on `dinner_ingredients` (insert, and update of `name`) resolves the household via
    `dinner_id → dinners.household_id` and does
    `insert into items (household_id, name) values (...) on conflict (household_id, name_key)
do nothing` — an Item is created the first time its normalized name is seen for that
    household, silently reused after.
  - **One-time backfill** (part of FR-10's migration): `insert ... select distinct` one Item
    per existing household + `dinner_ingredients.name` combination.
  - The trigger is the **only** place this sync happens — no application code path (today's
    manual dinner entry, or any future import feature) needs to call anything for an Item to
    exist.
  - Dedup key is exact (case-insensitive, trimmed) — **not** the fuzzy similarity match (FR-7).
- **Priority**: Must

### FR-4: `item_placements` — explicit placement

- **Description**: An Item's explicit placement at a Location, scoped to one Store.
- **Acceptance Criteria**:
  - `item_placements(id, household_id, store_id, item_id, location_id)`,
    `unique (item_id, store_id)` — one explicit placement per item per store.
  - Composite FK `(location_id, store_id) → locations(id, store_id)` — enforced in the schema
    (not application code) so an item can never be placed in another store's location.
  - `location_id → locations(id) on delete cascade` — deleting a Location deletes the
    placement rows that pointed to it (Resolved Decision #3); the affected Items fall back to
    category (FR-6), never orphaned, never hard-deleted themselves.
  - Household-scoped RLS.
- **Priority**: Must

### FR-5: `category_placements` — inherited fallback

- **Description**: A category's default Location, migrated 1:1 from `category_row_assignments`.
  Lets every item inherit a sensible sort position with zero per-item work.
- **Acceptance Criteria**:
  - `category_placements(id, household_id, store_id, category, location_id)`,
    `unique (store_id, category)`.
  - Composite FK `(location_id, store_id) → locations(id, store_id)`,
    `location_id → locations(id) on delete cascade` (Resolved Decision #3).
  - Category values are the same free-text set already used by `dinner_ingredients.category`.
- **Priority**: Must

### FR-6: Location resolution & the three placement states

- **Description**: For each Item, resolve in order: explicit `item_placements` row → else the
  Item's category's `category_placements` row (**inherited**) → else **unassigned**. The UI
  must always be able to tell which of the three applies.
- **Acceptance Criteria**:
  - Resolution order is exactly: (1) `item_placements` for `(item_id, store_id)`; (2)
    `category_placements` for `(item's dinner_ingredients.category, store_id)`; (3) unassigned.
  - **Placed** (explicit `item_placements` row): shown as a decision the user made.
  - **Inherited** (falls back to category): visibly softer, names the category ("via
    Bakery") so the fallback is legible.
  - **Unassigned** (neither): neutral — never red, never warning-styled; this is a normal
    state, not an error, everywhere it appears.
  - No item, in any state, produces a validation error.
- **Priority**: Must

### FR-7: Similarity-suggestion algorithm

- **Description**: When placing an Item with no explicit placement, surface Items that look
  similar and already have an explicit placement, so "same spot as X" is one action.
- **Acceptance Criteria**:
  - Trigger: only inside the assign flow for an item with no explicit placement — never a
    proactive interruption.
  - Normalize the item name (lowercase, strip punctuation, crude singularization, drop a
    small editable stopword list — `organic`, `fresh`, `low fat`, `canned`, etc.).
  - Compare only against Items with an **explicit** `item_placements` row in the active
    store — inherited placements are not evidence.
  - Score by shared-token overlap, weighting rarer tokens higher; same category adds a small
    bonus, never enough to carry a match alone.
  - Suppress any pairing present in `suggestion_dismissals` (FR-8).
  - Return up to 3 candidates above a confidence cutoff; below cutoff, return none (the UI
    falls back to a plain picker — FR-12).
  - Multiple similar items in different locations are all shown, unranked — never auto-pick a
    winner.
  - Runs client-side in TypeScript (Resolved Decision #5); no new backend surface.
- **Priority**: Must

### FR-8: Suggestion dismissals

- **Description**: A rejected suggestion pairing doesn't reappear.
- **Acceptance Criteria**:
  - `suggestion_dismissals(id, household_id, store_id, item_id, suggested_item_id)`,
    `unique (store_id, item_id, suggested_item_id)`.
  - FR-7's candidate list excludes any pairing present here.
  - Household-scoped RLS.
- **Priority**: Must

### FR-9: Reorder RPC generalization

- **Description**: Generalize the existing `reorder_grocery_store_row` to Locations scoped by
  Store.
- **Acceptance Criteria**:
  - `reorder_location(p_location_id uuid, p_new_position integer)` — same race-safe
    shift-and-renumber algorithm as today's RPC (`FOR UPDATE`, shift the intermediate range,
    move the target), scoped to the target's `store_id` (only that store's rows shift).
  - `(store_id, position)` stays unique through every add / reorder / delete.
  - Works across `type` — a single sequence, sections and aisles interleaved, no per-type
    sub-ordering (matches FR-2).
- **Priority**: Must

### FR-10: Schema + data cutover (migration from the current page)

- **Description**: One forward, append-only migration set that introduces the new tables and
  carries existing configuration across with no regression.
- **Acceptance Criteria**:
  - One Store auto-seeded per existing household (FR-1).
  - Every `grocery_store_rows` row → a `locations` row under that household's seeded store:
    `name` preserved, `position` preserved, `type` inferred (`Aisle \d+` pattern → `aisle`,
    else `section`; ambiguous defaults to `section` and stays user-editable).
  - Every `category_row_assignments` row → a `category_placements` row for the same store
    (direct `category`/`location_id` carry-across).
  - `items` backfilled per FR-3 (one row per distinct existing `dinner_ingredients.name` per
    household) — **no `item_placements` are created on cutover**; every item inherits its
    category's placement on day one, so sorting works immediately and nothing configured is
    thrown away.
  - `grocery_store_rows` / `category_row_assignments` retired only after their data is
    carried across (same migration or a documented follow-up) — forward-only, no edits to
    prior migration files.
  - After cutover, a household that had configured rows + assignments gets an equivalent
    walking path and an equivalent shopping-list order (FR-17) — no regression.
- **Priority**: Must

### FR-11: Walking-path list (location rows, add / rename / reorder / remove)

- **Description**: One ordered list — sections and aisles as visual peers — replacing the
  current two-panel layout.
- **Acceptance Criteria**:
  - One list, not two panels. Each row: a type-chip (aisle number parsed from `name`, or a
    section glyph — same size/position/weight either way), the name, an item-count, up/down
    arrows (disabled at the ends of the list, ≥32px targets, each with an aria-label naming
    the stop + direction), expand/collapse (collapsed by default; a one-line preview of the
    first few placed/inherited item names, "+N more"; a location with nothing reads "Nothing
    here yet").
  - **Add a stop**: an inline dashed-border affordance at the end of the list (not a modal),
    appends at the end; arrows then move it.
  - **Rename**: in place — the name becomes a text field with the existing global focus
    ring, Save/Cancel, a quiet "Remove" at the trailing edge. The type chip stays visible and
    unedited during rename.
  - **Remove an empty stop**: no confirm.
  - **Remove a stop with items** (FR-16): the one destructive confirm on the page.
  - Reordering announces politely ("Bakery moved to position 2"); arrows stop event
    propagation so pressing one doesn't also toggle the row open.
- **Priority**: Must

### FR-12: Assign flow

- **Description**: A bottom sheet, opened from any placement pill or a "Place" action in the
  unassigned section, for placing/re-placing/un-placing one Item.
- **Acceptance Criteria**:
  - Header: the item name, one line naming the current resolution in plain words (not a
    badge) — e.g. "not placed", "placed in Aisle 1", "following Bakery to Bakery".
  - When FR-7 clears the cutoff: a suggestions block above the picker, each candidate showing
    the matched item + its location + a "Same spot" accept action + a dismiss (×) that
    records a `suggestion_dismissals` row. Nothing pre-selected, nothing auto-applied.
    Multiple candidates render with equal weight, no ranking language.
  - When nothing clears the cutoff: the suggestions block is simply absent — no empty-state
    copy.
  - The picker: the full path in order, each row carrying the same type-chip as the main
    list; the current explicit location (if any) is marked.
  - An Item with an explicit placement gets a "Take it off the path" action — deletes its
    `item_placements` row (FR-4), falling back to category/unassigned (FR-6).
  - Traps focus, closes on `Escape`, returns focus to the pill/button that opened it.
- **Priority**: Must

### FR-13: Unassigned ("Not on the path yet")

- **Description**: A calm, findable home for Items with no explicit or inherited placement.
- **Acceptance Criteria**:
  - Collapsed by default, in the same column below the path; header shows a count + a
    subtitle stating the consequence ("4 groceries sort to the end"), not the condition.
  - Default scope: Items used in at least one recipe (their `dinner_ingredients` still
    referenced by an active dinner) — not the full 400-item historical registry.
  - Expanded: a search field reaching the full Items catalog beyond the default scope; each
    result shows the item name, its category, and a "Place" action opening FR-12.
  - Two empty states, both plain: no search term → "Everything has a spot on the path."; a
    term matching nothing → the term quoted back. Neutral styling throughout — never
    red/warning.
- **Priority**: Must

### FR-14: First-run empty state

- **Description**: No Locations configured is a normal state, not an onboarding error.
- **Acceptance Criteria**:
  - A single panel: heading, body copy suggesting a starting point ("Add the first place you
    walk into... order can change any time"), one primary "Add the first stop" action, and a
    closing line stating the interim behavior — lists stay in alphabetical order until then.
  - No red/warning styling; this is a first-run state, not a missing-data error.
- **Priority**: Should

### FR-15: Desktop layout

- **Description**: The same single-column sequence at wider viewports — no second panel.
- **Acceptance Criteria**:
  - Single column at a 600–720px measure inside the existing persistent left rail (per
    `005-desktop-layout`).
  - Extra width goes to: the item preview moving onto the same line as the location name; a
    wider expanded-item inset.
  - The Store (read-only in v1) renders as a small chip beside the page title — sized/
    positioned as a future control, so v2's selector is a behavioral change only, not
    structural.
- **Priority**: Should

### FR-16: Deleting a Location with items

- **Description**: The one destructive confirmation on the page.
- **Acceptance Criteria**:
  - Warns with the affected count before deleting: "N groceries point here. They'll fall
    back to their category, or to the end of the list if the category has no spot. Nothing
    is deleted." (Items themselves are never deleted — only the placement rows, per Resolved
    Decision #3.)
  - Two actions: "Keep it" / "Remove" (the app's only other filled `heart.500` button besides
    intent `009`'s "Clear all" — styled at the call site, no theme `danger` variant).
  - Removing an empty Location needs no confirm (FR-11).
- **Priority**: Must

### FR-17: Shopping-list group ordering rework

- **Description**: Shopping-list ingredient groups sort by the resolved Location of each
  ingredient's Item, not `category → grocery_store_row.position`.
- **Acceptance Criteria**:
  - Sort key becomes each ingredient's resolved position (FR-6: explicit, else inherited,
    else unassigned) in the active store.
  - Unassigned ingredients still sort after the path, alphabetically (today's fallback,
    preserved).
  - `buildShoppingList`'s aggregation/merge logic is unchanged — only the sort key feeding it
    changes.
  - Existing shopping-list tests updated to the new sort key; output for an already-configured
    household is equivalent to today's after the cutover (FR-10).
- **Priority**: Must

### FR-18: Standards & decision docs

- **Description**: Record the model change.
- **Acceptance Criteria**:
  - `standards/system-architecture.md` / `data-stack.md` — replace the category→row
    description with the Store/Location/Item model; note the new Items registry and its
    trigger-based sync.
  - `standards/decision-index.md` — an entry for "grocery store config moves from
    broad-category→row mapping to individual-ingredient→Location with category fallback, a
    multi-store-ready schema, and a similarity-suggestion assist."
  - `001-weekly-dinner-planner` unit `004-grocery-store-config`'s brief gets a "superseded by
    `010`" note.
- **Priority**: Should

---

## Non-Functional Requirements

### Security / Tenancy

| Requirement         | Notes                                                                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Household isolation | Every new table (`stores`, `locations`, `items`, `item_placements`, `category_placements`, `suggestion_dismissals`) is RLS-scoped by `household_id`, matching `20260828232000`'s pattern.                            |
| Cross-store safety  | Composite FKs `(location_id, store_id) → locations(id, store_id)` on `item_placements` and `category_placements` prevent placing an item in another store's location — enforced in the schema, not application code. |
| No new backend      | Same Supabase-direct model; no Edge Function; the reorder RPC is `security invoker` (or matches the existing RPC's security model) like today's.                                                                     |

### Data Integrity

| Requirement                | Target                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Unassigned is not an error | No constraint rejects the absence of an `item_placements` row; the UI never treats it as an error.       |
| Ordering stays valid       | `(store_id, position)` unique through every add/reorder/delete.                                          |
| Registry dedup             | `unique (household_id, name_key)` prevents duplicate Items regardless of insertion source.               |
| Cutover has no regression  | Existing configured households get an equivalent walking path + shopping-list order after the migration. |
| Migrations                 | Append-only; no edits to prior migration files.                                                          |

### Extensibility

| Requirement                               | Target                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Multi-store (v2)                          | `stores` + `store_id` on every dependent table exist now; v2 adds only a selector UI — no migration.           |
| Drag-and-drop                             | `position` is already a sortable integer written by a single RPC; a future drag handler is a pure UI change.   |
| Inline item creation                      | Deferred to the Catalog page in v1; the registry (FR-3) already gives items stable identity for that later.    |
| Recipe import (future, not yet an intent) | The Items-registry sync (FR-3) is trigger-based specifically so a future import feature needs no changes here. |
| Similarity engine                         | v1's token-overlap match (FR-7) is swappable behind the same query interface.                                  |

### Regression

| Requirement    | Target                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Shopping list  | Group ordering for already-assigned data is equivalent to today's after cutover; `buildShoppingList` merge logic unchanged.     |
| Other features | Catalog, weekly plan, cooking view untouched — the Item/Location model is additive to `dinner_ingredients`, not a change to it. |

---

## Constraints

### Technical Constraints

- Supersedes `001` unit `004`'s model; reworks `src/features/store-config/` + the
  shopping-list sort.
- Append-only `supabase/migrations/`; no edits to prior files.
- Reordering ships as up/down arrows (existing RPC pattern, generalized); no drag-and-drop in
  v1.
- No inline Item/category editing on this page in v1 — stays on the Catalog page.
- Similarity is suggestion-only — never assigns a Location without an explicit user action.
- Supabase-direct, no backend server, no Edge Function.
- Every color/radius/type value in the UI is an existing token in `src/shared/theme/index.ts`
  — no new tokens, no new theme variant (the one filled `heart.500` "Remove" button is styled
  at the call site, same rule as intent `009`'s "Clear all").
- Motion: none — no transition on expand, no animation on reorder, no slide beyond platform
  default (matches the theme having no motion vocabulary).

### Business Constraints

- Household project — same single-family scope as `001`–`012`.
- The requester for the _product/UX_ decisions already baked into `storeconfig.md` is
  Chandler; those decisions are treated as settled inputs to this document, not reopened.

---

## Assumptions

| Assumption                                                                                                  | Risk if Invalid                                                                                      | Mitigation                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `dinners.household_id` exists and every `dinner_ingredients` row resolves a household via its `dinner_id`   | FR-3's trigger can't resolve `household_id`                                                          | **Verified** — `dinners.household_id` added by intent `004` (`20260828231000`)                              |
| `grocery_store_rows` / `category_row_assignments` are already household-scoped                              | FR-10's cutover would need to add tenancy                                                            | **Verified** — `20260828231000`/`20260828232000`                                                            |
| `reorder_grocery_store_row`'s shift algorithm generalizes cleanly to a `store_id`-scoped set                | FR-9 needs a new algorithm                                                                           | Same shape, one more scoping predicate — low risk, confirm at construction start                            |
| Household-scale Items count (dozens, not thousands) makes a client-side similarity pass fast enough         | FR-7 needs a DB-side `pg_trgm` query instead                                                         | Revisit only if real-world use shows it's slow; the interface is swappable either way                       |
| A dinner's `dinner_ingredients.category` is a reliable proxy for an Item's "category" in FR-6's inheritance | Two dinners could name the same ingredient with different categories, creating ambiguous inheritance | Use the most recent/first-seen category per Item at read time; document as a known edge case, not a blocker |

---

## Priority Definitions

| Priority | Meaning                                                               |
| -------- | --------------------------------------------------------------------- |
| Must     | Required; the model/page is incomplete or regresses without it        |
| Should   | Important (standards docs, first-run/desktop polish) but not blocking |
| Could    | Not used in this intent                                               |
| Won't    | See Out of Scope                                                      |

## Out of Scope (Won't — this intent)

- Multi-store **UI** (store list, add/edit/delete, selector) — v2; schema lands now (FR-1).
- Drag-and-drop reordering — v2; `position` already supports it with no migration.
- Inline creation/renaming of Items or categories on this page — stays on the Catalog page.
- Recipe import (URL / Claude-assisted) — a future, not-yet-created intent; FR-3 is designed
  so it needs no changes here when that ships.
- A better similarity engine than substring/token-overlap (embeddings, curated synonyms) — the
  v1 interface is swappable.
- Any change to `dinner_ingredients`, the catalog, the weekly plan, or the cooking view beyond
  consuming the new sort key in the shopping list (FR-17).
