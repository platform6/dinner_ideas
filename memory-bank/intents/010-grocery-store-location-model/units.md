---
intent: 010-grocery-store-location-model
phase: inception
status: complete
updated: '2026-09-04T15:00:00Z'
---

# Grocery Store Location Model — Unit Decomposition

## Units Overview

Three units, split by layer — data model first (the hard, blocking piece), then the two
consumers (the page and the shopping-list sort), which proceed in parallel once the model
lands. No design-intent dependency this time — `storeconfig.md`'s own visual-direction
section is the complete spec for unit 2.

### Unit 1: 001-location-item-model

**Description**: The whole data layer. `stores`, `locations` (evolves `grocery_store_rows`),
the new **Items registry** (`items`) with its trigger-based sync, `item_placements`,
`category_placements` (evolves `category_row_assignments`), `suggestion_dismissals`, the
location-resolution query (explicit → inherited → unassigned), the generalized race-safe
`reorder_location` RPC, and the forward cutover migration (backfill Items, carry existing
rows/assignments across, retire the old tables). DDD-worthy: multiple new entities, a
trigger-enforced dedup invariant, composite-FK cross-store safety, and a one-time cutover with
a no-regression bar.

**Unit Type**: backend (Supabase schema + migration + RPC + trigger) — no app server
**Default Bolt Type**: ddd-construction-bolt

**Deliverables**:

- `supabase/migrations/<ts>_grocery_location_item_model.sql` — `stores`, `locations`,
  `items` (+ `name_key` generated column), `item_placements`, `category_placements`,
  `suggestion_dismissals`; composite FKs `(location_id, store_id) → locations(id, store_id)`;
  household-scoped RLS on every new table (mirroring `20260828232000`); the
  `dinner_ingredients` insert/update trigger doing the Items get-or-create;
  `reorder_location(location_id, new_position)`.
- `supabase/migrations/<ts>_grocery_location_cutover.sql` — seed one Store per household;
  `grocery_store_rows` → `locations` (`type` inferred from name); `category_row_assignments`
  → `category_placements`; backfill `items` from distinct existing `dinner_ingredients.name`
  per household (no `item_placements` created); drop the old tables once data is across.
- `supabase/tests/database/*.sql` — pgTAP: RLS isolation on every new table; the `name_key`
  dedup constraint (case/whitespace variants collapse to one row, from either a direct insert
  or the trigger); composite-FK cross-store rejection; `(store_id, position)` uniqueness
  through add/reorder/delete; deleting a Location cascades the right placement rows and
  leaves Items intact; the resolution query returns explicit → inherited → unassigned
  correctly, including the 0-match case; the cutover produces an equivalent path + equivalent
  resolved order for a seeded configured household.
- DDD artifacts (domain model, technical design, an ADR for "Item registry, trigger-based
  sync, dedup key" — Resolved Decisions #1–3 from `requirements.md`).

**Dependencies**: `001-weekly-dinner-planner` unit `004` (superseded); `004-account-model`
(household RLS pattern; `dinners.household_id`). Blocks units 2 and 3.

**Estimated Complexity**: **L** — five new tables, a trigger-enforced registry invariant that
didn't exist before, composite-FK cross-store safety, a generalized reorder RPC, and a
cutover with a no-regression bar and a real backfill.

---

### Unit 2: 002-store-config-page

**Description**: Rework `src/features/store-config/` into the "Walking path" page: the
unified ordered list (location rows, add/rename/reorder/remove, the destructive
delete-with-items confirm), the assign bottom sheet (resolution line, similarity suggestions,
picker, unlink), the "Not on the path yet" section, the first-run empty state, and the
desktop layout. Owns the client-side similarity-matching algorithm (FR-7).

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/store-config/{types.ts,api.ts,hooks.ts}` — reworked to Stores + Locations +
  Items + placements + similarity; a `similarity.ts` pure function (normalize, tokenize,
  score, cutoff) per FR-7.
- `src/features/store-config/components/StoreConfigPage.tsx` — the two-panel layout replaced
  by the unified walking-path list; location-row lifecycle (FR-11); the delete-with-items
  confirm (FR-16); the read-only Store chip (FR-15).
- `src/features/store-config/components/AssignSheet.tsx` (new) — the bottom sheet: resolution
  line, suggestions block, picker, "Take it off the path" (FR-12).
- `src/features/store-config/components/UnassignedSection.tsx` (new) — "Not on the path yet":
  count, subtitle, search-to-full-catalog, place action, two empty states (FR-13).
- First-run empty state (FR-14) and the desktop measure/layout adaptation (FR-15).
- `src/features/store-config/**/*.test.tsx` + `similarity.test.ts` — reworked/new.

**Dependencies**: Unit 1 (the model + resolution query). No design-intent dependency (see
Overview).

**Estimated Complexity**: **M** — a page rebuild against a new model; the interaction detail
(similarity-as-confirmation, per-Location item preview at scale, the three placement-state
pills) carries the weight, but every visual/interaction decision is already spec'd in
`storeconfig.md`.

---

### Unit 3: 003-shopping-list-ordering

**Description**: Switch the shopping-list group-order sort key from
`category → grocery_store_row.position` to each ingredient's resolved `Item → Location`
position (FR-6, FR-17); keep the "unlocated → after the path, alphabetically" fallback;
`buildShoppingList` aggregation untouched.

**Unit Type**: frontend (pure function + its wiring)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- The shopping-list group-ordering function rewired to the resolved Item→Location sort key
  (consumes unit 1's resolution query).
- Its tests updated to the new sort key; an equivalence check for already-configured
  households post-cutover.

**Dependencies**: Unit 1 (the model + resolution query). Independent of unit 2.

**Estimated Complexity**: **S** — one sort-key swap in a pure function; the risk is proving
equivalence for existing data post-cutover, same as the prior draft's estimate.

## Unit Dependency Graph

```text
[001-weekly-dinner-planner u004 (superseded)] ─┐
[004-account-model (complete)] ─────────────────┤
                                                ▼
                                    001-location-item-model
                                         │              │
                                         ▼              ▼
                           002-store-config-page   003-shopping-list-ordering   (parallel)
```

## Execution Order

1. `001-location-item-model` — schema + trigger + reorder RPC + cutover. Blocks the rest.
2. `002-store-config-page` and `003-shopping-list-ordering` — parallel once unit 1 lands.

## Requirement-to-Unit Mapping

- **FR-1** (`stores` entity) → `001-location-item-model`
- **FR-2** (`locations` entity) → `001-location-item-model`
- **FR-3** (Items registry + trigger sync) → `001-location-item-model`
- **FR-4** (`item_placements`) → `001-location-item-model`
- **FR-5** (`category_placements`) → `001-location-item-model`
- **FR-6** (location resolution + three states — data side) → `001-location-item-model`
  (unit 2 consumes it for display)
- **FR-7** (similarity-suggestion algorithm) → `002-store-config-page`
- **FR-8** (suggestion dismissals) → `001-location-item-model`
- **FR-9** (reorder RPC generalization) → `001-location-item-model`
- **FR-10** (schema + data cutover) → `001-location-item-model`
- **FR-11** (walking-path list UI) → `002-store-config-page`
- **FR-12** (assign flow) → `002-store-config-page`
- **FR-13** (unassigned section) → `002-store-config-page`
- **FR-14** (first-run empty state) → `002-store-config-page`
- **FR-15** (desktop layout) → `002-store-config-page`
- **FR-16** (delete-with-items confirm) → `002-store-config-page`
- **FR-17** (shopping-list group ordering) → `003-shopping-list-ordering`
- **FR-18** (standards & decision docs) → `001-location-item-model`
