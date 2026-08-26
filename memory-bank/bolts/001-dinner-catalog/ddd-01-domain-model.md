---
stage: model
bolt: 001-dinner-catalog
created: 2026-08-26T17:42:59Z
---

## Static Model: dinner-catalog

### Entities

- **Dinner**: `id`, `name` (unique), `cuisine_type`, `cook_time_minutes`, `rosie_approved` (bool), `instructions` (text), `is_active` (bool, default `true`) — Business rules: `cook_time_minutes` must be > 0; `name` unique so the seed migration can be idempotent (upsert on name); newly created dinners default `is_active = true`.
- **DinnerIngredient**: `id`, `dinner_id` (FK → Dinner), `name`, `quantity` (numeric), `unit`, `category` — Business rules: `quantity` must be > 0; `category` must be one of the fixed Grocery Category set; belongs to exactly one Dinner.

### Value Objects

- **GroceryCategory**: One of `Produce`, `Protein`, `Dairy`, `Grains`, `Pantry` — immutable, equality by value. Fixed set for this intent (drives FR-3 shopping-list grouping downstream in the UI unit).
- **IngredientQuantity**: `(quantity, unit)` pair — immutable, equality by value. Two ingredients are "the same line item" for merge purposes (FR-3, owned by the UI unit) only when name *and* unit match.

### Aggregates

- **Dinner** (Aggregate Root): Members: `Dinner` + its `DinnerIngredient[]` — Invariants: every `DinnerIngredient` under a `Dinner` has `quantity > 0` and a valid `category`; a `Dinner`'s ingredients are always read/written together with their parent for catalog display purposes.

### Domain Events

- **DinnerSuppressed**: Trigger: `is_active` set `false` (FR-7) — Payload: `dinner_id`, `suppressed_at`.
- **DinnerUnsuppressed**: Trigger: `is_active` set `true` after having been suppressed — Payload: `dinner_id`, `unsuppressed_at`.

_Note: since there's no backend server or event bus (per `system-architecture.md`), these events are conceptual/ubiquitous-language markers for this bolt — they materialize simply as an `is_active` column update, not an event-sourced or audit-logged mechanism. Flagging here in case a future intent wants a real suppress/unsuppress history._

### Domain Services

- **CatalogQueryService**: Operations: `listActiveDinners(filter: {cuisineType?, maxCookTimeMinutes?, rosieApproved?})`, `listSuppressedDinners()`, `setDinnerActive(dinnerId, isActive)` — Dependencies: `DinnerRepository`.

### Repository Interfaces

_Given the no-custom-backend architecture (client-heavy SPA over Supabase, per `system-architecture.md`), there is no hand-written repository class — this section instead documents the query surface the Supabase schema + RLS must support, which the UI unit (`003-weekly-dinner-planner-ui`) will call directly via `@supabase/supabase-js`._

- **DinnerRepository** (conceptual): Entity: `Dinner` (+ nested `DinnerIngredient[]`) — Methods: `getActiveDinners(filter)`, `getSuppressedDinners()`, `getById(id)`, `setActive(id, isActive)`.

### Ubiquitous Language

- **Dinner**: A single recipe/meal option in the catalog.
- **Ingredient**: One line item within a dinner's ingredient list, already scaled to 3 servings (2 adults + 1 small child).
- **Grocery Category**: The shopping-list grouping bucket an ingredient belongs to (Produce, Protein, Dairy, Grains, Pantry).
- **Rosie-approved**: Tag indicating the dinner is kid-tested/kid-friendly for the household's small child.
- **Active / Suppressed**: Whether a dinner currently appears in the browsable catalog; suppression (FR-7) is reversible, not a delete.
- **Seed Dinner**: One of the 50 curated dinners populated at launch (see `seed-data-draft.md`).
