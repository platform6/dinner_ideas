---
stage: model
bolt: 009-dinner-catalog
created: 2026-08-27T02:00:00Z
---

## Static Model: dinner-catalog (follow-up: generic tags)

**Scope note**: this bolt extends the `dinner-catalog` domain established in `001-dinner-catalog` (schema/seed) and `007-dinner-catalog` (steps) with a generic tag system (FR-9), replacing the fixed `rosie_approved` boolean. `Dinner`, `DinnerIngredient`, and `DinnerStep` are unchanged and not repeated in full here except where the aggregate boundary is affected.

### Entities

- **Tag** (new): `id`, `name` (text, unique, lowercase-normalized) — Business rules: `name` is non-empty after trimming; `name` is always stored lowercase regardless of input casing, so "Kid-Friendly" and "kid-friendly" resolve to the same row; a `Tag` is not scoped to a single dinner — it's a shared vocabulary entity referenced by any number of dinners.
- **DinnerTag** (new): `dinner_id` (FK → Dinner), `tag_id` (FK → Tag) — Business rules: `(dinner_id, tag_id)` unique (a dinner can't have the same tag twice); pure association, no attributes of its own.
- **Dinner** (existing, modified) — **removes** `rosie_approved` (boolean). No other change to its own attributes.

### Value Objects

_No new value objects._ `GroceryCategory` and `IngredientQuantity` (from `001-dinner-catalog`) are unaffected. `Tag.name`'s lowercase-normalization rule is a constraint on the entity's attribute, not a standalone value object — it's simple enough (one string, one normalization rule) not to warrant its own type distinct from `Tag` itself.

### Aggregates

- **Dinner** (Aggregate Root) — **extended**: Members: `Dinner` + `DinnerIngredient[]` + `DinnerStep[]` + `DinnerTag[]` (resolving to `Tag[]` for display) — Invariants (new, in addition to prior bolts'): a dinner's tag list has no duplicates (enforced by `DinnerTag`'s unique pair).
- **Tag** (separate Aggregate Root, not owned by any one `Dinner`): Members: `Tag` alone — Invariant: `name` is unique and lowercase. Modeled as its own root (not a value object nested inside `Dinner`) specifically _because_ it's shared across dinners — deleting a `DinnerTag` association must never delete the `Tag` itself if other dinners still reference it (see Edge Cases in the story). This is the one aggregate-boundary decision in this bolt worth being explicit about.

### Domain Events

- **TagAddedToDinner**: Trigger: user adds a tag (new or existing) to a dinner via the "+" control — Payload: `dinner_id`, `tag_id`, `tag_name`.
- **TagRemovedFromDinner**: Trigger: user removes a tag from a dinner — Payload: `dinner_id`, `tag_id`. Does not imply the `Tag` row itself is deleted.

_Not modeled as an event_: `rosie_approved` removal is a one-time schema migration, not a recurring domain operation.

### Domain Services

- **CatalogQueryService** (extended from prior bolts): add operations `getDinnerTags(dinnerId): Tag[]`, `listDinnersByTags(tagNames): Dinner[]` (for the tag filter).
- **TagManagementService** (new): `addTag(dinnerId, tagName)` — find-or-create the `Tag` by lowercase name, then create the `DinnerTag` association if it doesn't already exist (idempotent — adding the same tag twice is a no-op, not an error); `removeTag(dinnerId, tagId)` — delete the association only, never the `Tag` row itself.

### Repository Interfaces

_Same no-custom-backend shape as prior bolts_ — this documents the query surface the schema + RLS must support, called directly by the UI unit (`003-weekly-dinner-planner-ui`, bolt `012`) via `@supabase/supabase-js`.

- **DinnerRepository** (conceptual, extended): add `getTags(dinnerId)`, `findByTags(tagNames)`.
- **TagRepository** (new, conceptual): `findOrCreateByName(name)`, `addToDinner(dinnerId, tagId)`, `removeFromDinner(dinnerId, tagId)`.

### Relevant Prior Decision

`ADR-1` (Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement) established that this app has no backend server, so any invariant that must hold "regardless of caller" needs DB-level enforcement, not just client-side validation. The lowercase-normalization rule here is the same shape of concern (a rule that must hold no matter what inserts the row) but far simpler than `002-weekly-planning`'s "exactly 3, immutable" state machine — a single `check` constraint (`name = lower(name)`) or a `before insert/update` trigger lowercasing the value is sufficient; no RPC function or multi-row transaction logic is warranted. Flagging this now so Stage 2 (Technical Design) picks the lightest mechanism that still satisfies ADR-1's underlying principle, rather than reaching for a heavier pattern than the rule needs.

### Ubiquitous Language

- **Tag**: A shared, lowercase-normalized label attachable to any number of dinners (e.g. `kid-friendly`, `spicy`, `freezer-friendly`) — replaces the old single-purpose "Rosie-approved" flag with an open vocabulary the user defines herself.
- **Tag Vocabulary**: The full set of distinct `Tag` rows in the system — shared across all dinners, not per-dinner free text.
