---
stage: model
bolt: 007-dinner-catalog
created: 2026-08-26T22:36:48Z
---

## Static Model: dinner-catalog (follow-up: cooking steps)

**Scope note**: this bolt extends the `dinner-catalog` domain established in `001-dinner-catalog` (see that bolt's `ddd-01-domain-model.md`) with one new entity, `DinnerStep`, for FR-8 (Cooking View). `Dinner` and `DinnerIngredient` are unchanged and not repeated in full here except where the aggregate boundary is affected.

### Entities

- **DinnerStep** (new): `id`, `dinner_id` (FK → Dinner), `step_number` (integer), `instruction` (text) — Business rules: `step_number` must be > 0; `(dinner_id, step_number)` unique, so a dinner's steps always have a well-defined, gap-tolerant order (no requirement that numbers be contiguous, only unique and orderable); belongs to exactly one Dinner; `instruction` is a single discrete, imperative action (not a compound run-on sentence) — this is a content-authoring rule for the seed migration, not something the schema itself can check.

### Value Objects

_No new value objects._ `GroceryCategory` and `IngredientQuantity` (from `001-dinner-catalog`) are unaffected.

### Aggregates

- **Dinner** (Aggregate Root) — **extended**: Members: `Dinner` + `DinnerIngredient[]` + `DinnerStep[]` — Invariants (new, in addition to `001-dinner-catalog`'s): every `DinnerStep` under a `Dinner` has `step_number > 0` and a unique `step_number` within that dinner; a dinner's steps are always read together with their parent for the cooking view, same as ingredients.
- **"At least 2 steps per dinner"** (from story `003-dinner-step-by-step-instructions`) is a **content-completeness rule checked at seed-authoring/migration time**, not a live schema/trigger invariant — unlike `002-weekly-planning`'s "exactly 3 selections" (see `ADR-1` in the decision index), nothing in this intent ever inserts a `DinnerStep` at runtime through the app; all step content is static, seeded once. A trigger enforcing "≥2 rows per dinner" would need to fire on every row insert within a multi-row seed transaction and would reject legitimate in-progress inserts (row 1 of 3 briefly violates "≥2"), so it doesn't fit this shape of rule the way `ADR-1`'s did. This is flagged for the ADR Analysis stage to confirm no ADR is warranted here.

### Domain Events

_None new._ Steps are static seed content in this intent — no create/update/suppress lifecycle worth modeling as an event (unlike `DinnerSuppressed`/`DinnerUnsuppressed` from `001-dinner-catalog`, which reflect a real runtime toggle).

### Domain Services

- **CatalogQueryService** (extended from `001-dinner-catalog`): add operation `getDinnerSteps(dinnerId): DinnerStep[]` (ordered by `step_number`) — Dependencies: unchanged (`DinnerRepository`).

### Repository Interfaces

_Same no-custom-backend shape as `001-dinner-catalog`_ — this documents the query surface the schema + RLS must support, called directly by the UI unit (`003-weekly-dinner-planner-ui`, bolt `008`) via `@supabase/supabase-js`.

- **DinnerRepository** (conceptual, extended): add method `getSteps(dinnerId)`.

### Ubiquitous Language

- **Cooking Step**: One ordered, discrete instruction within a dinner's preparation — distinct from the existing one-line `dinners.instructions` summary, which stays as-is for other display contexts.
- **Step Number**: The 1-based (or otherwise increasing) ordering key for a dinner's steps; unique per dinner, not required to be contiguous.
