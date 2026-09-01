---
intent: 010-grocery-store-location-model
phase: inception
status: draft
updated: '2026-09-01T02:05:00Z'
---

# Grocery Store Location Model — Unit Decomposition

## Units Overview

**Provisional** — the exact split of unit 1 (and whether unit 2 needs a design intent to
land first) firms up once **OQ-C** (Item registry vs. name-keyed mapping), **OQ-D** (cutover
mapping) and **OQ-A / OQ-B** (deferred features) are answered by Chandler. The three-unit
shape below is the working plan under this draft's assumptions (registry table; expand
existing assignments on cutover; arrows + no inline editing for v1).

Three units, split by layer — data model first, then the two consumers (the page and the
shopping-list sort) which can proceed in parallel once the model is in.

### Unit 1: 001-location-item-model

**Description**: The whole data layer. New household-scoped `locations` table (evolves
`grocery_store_rows`; adds `type` ∈ {`section`,`aisle`}; single ordered `position`), the
Item→Location link (**OQ-C** — a deduped `items` registry under the draft assumption), RLS
policies mirroring `20260828232000`, the generalised race-safe reorder RPC, the
similarity-suggestion query (**FR-4** — `ILIKE`/token or `pg_trgm`), and the **forward data
migration** carrying existing `grocery_store_rows` + `category_row_assignments` across
(**OQ-D**) then retiring the old shape.

**Unit Type**: backend (Supabase schema + migration + RPC/query) — no app server
**Default Bolt Type**: ddd-construction-bolt (real domain modelling: two entities, a link
with a valid-null state, an ordering invariant, a cutover)

**Deliverables**:

- `supabase/migrations/<ts>_location_item_model.sql` — `locations` (+ `type`, `(household_id,
position)` unique, RLS), the Item link (registry table or mapping per OQ-C, `on delete set
null`, RLS), `reorder_location(...)` (generalises `reorder_grocery_store_row`)
- `supabase/migrations/<ts>_grocery_config_cutover.sql` — carry `grocery_store_rows` →
  `locations (type='section')`; `category_row_assignments` → per-ingredient placements
  (OQ-D); drop the old tables once data is across (same file or a documented follow-up)
- similarity query — a `security invoker` SQL function or a documented PostgREST query the
  client calls; `pg_trgm` enabled if used
- `supabase/tests/database/*.sql` — pgTAP: RLS isolation on every new table; `type` check;
  `(household_id, position)` unique through add/reorder/delete; `location_id = null` accepted;
  many Items → one Location; `on delete set null`; similarity returns household-scoped ranked
  matches incl. the 0-match case; the cutover produces an equivalent path for a seeded
  configured household
- DDD artifacts (domain model, technical design, an ADR for the Item-model decision once
  OQ-C lands)

**Dependencies**: `001-weekly-dinner-planner` unit `004` (the model being superseded);
`004-account-model` (household RLS pattern). Blocks units 2 and 3.

**Estimated Complexity**: **M–L** — new entities, a valid-null link, an ordering invariant, a
similarity query, and a one-time cutover with a no-regression bar; the cutover shape is
gated on OQ-D.

---

### Unit 2: 002-store-config-page

**Description**: Rework `src/features/store-config/` to the new model — one unified
walking-path list (add / rename / arrow-reorder Locations, sections + aisles interleaved),
the item-level "place this ingredient" flow using the similarity suggestion as a lightweight
confirmation, a per-Location "items that live here" display that scales, and the calm
unassigned list. **FR-8 / FR-3 / FR-5 / FR-9.**

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/store-config/{types.ts,api.ts,hooks.ts}` — reworked to Locations + Items +
  similarity
- `src/features/store-config/components/StoreConfigPage.tsx` — the two-panel layout replaced
  by the unified list + placement flow; "Category Assignments" panel gone
- `src/features/store-config/**/*.test.tsx` — reworked
- Consumes the visual spec from the **design intent** (below) — if that intent is not yet
  done, this unit ships a functional-but-plain treatment and the design intent refines it

**Dependencies**: unit 1 (the model). Soft dependency on a **design intent** for the unified
list / suggestion affordance / "many items" display / unassigned treatment — the Design
Prompt in `storeconfig.md` is that intent's brief.

**Estimated Complexity**: **M** — a page rebuild against a new model; the interaction detail
(suggestion-as-confirmation, scalable per-Location item display) carries the weight.

---

### Unit 3: 003-shopping-list-ordering

**Description**: Switch the shopping-list group-order sort key from
`category → grocery_store_row.position` to `ingredient → Item → Location.position`; keep the
"unlocated → after the path, alphabetically" fallback; leave `buildShoppingList` aggregation
untouched. **FR-6.**

**Unit Type**: frontend (pure function + its wiring)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- the shopping-list group-ordering function (today in `weekly-dinner-planner-ui` per `001`
  unit 004) rewired to the Item→Location sort config
- its tests updated to the new sort key; equivalence check for already-assigned data

**Dependencies**: unit 1 (the model). Independent of unit 2.

**Estimated Complexity**: **S** — one sort key swap in a pure function; the risk is proving
equivalence for existing data post-cutover.

## Unit Dependency Graph

```text
[001-weekly-dinner-planner u004 (superseded)] ─┐
[004-account-model (complete)] ────────────────┤
                                               ▼
                                   [001-location-item-model]
                                        │            │
                                        ▼            ▼
                          [002-store-config-page]  [003-shopping-list-ordering]   (parallel)
                                        ▲
                          (design intent — storeconfig.md Design Prompt — informs unit 2)
```

## Execution Order

1. `001-location-item-model` — schema + cutover + similarity query + RPC. Blocks the rest.
2. `002-store-config-page` and `003-shopping-list-ordering` — parallel once unit 1 lands.
   Unit 2 is best paired with (or preceded by) the design intent.

## Requirement-to-Unit Mapping

- **FR-1** (`Location` entity) → `001-location-item-model`
- **FR-2** (Item → Location link) → `001-location-item-model`
- **FR-3** (unified ordered path) → `001-location-item-model` (data) + `002-store-config-page` (UI)
- **FR-4** (similarity-suggestion query) → `001-location-item-model` (query) + `002-store-config-page` (accept flow)
- **FR-5** (unassigned items) → `002-store-config-page`
- **FR-6** (shopping-list ordering rework) → `003-shopping-list-ordering`
- **FR-7** (schema + cutover) → `001-location-item-model`
- **FR-8** (`StoreConfigPage` rework) → `002-store-config-page`
- **FR-9** (v1 non-goals + extension points) → `001-location-item-model` (schema seams) + `002-store-config-page` (arrows only, no inline edit)
- **FR-10** (standards & decision docs) → `001-location-item-model` (lands with the migration)

## Blocking before decomposition is final

- **OQ-C** decides unit 1's schema (registry table vs. name-keyed mapping) and its ADR.
- **OQ-D** decides the cutover migration's content and unit 3's equivalence test.
- **OQ-A / OQ-B** confirm unit 2 stays "arrows, no inline edit"; if either flips, unit 2
  grows (and OQ-B might pull a small `position`-write addition into unit 1).
- Whether the **design intent** is created and sequenced before unit 2, or unit 2 ships plain
  and the design intent refines it.
