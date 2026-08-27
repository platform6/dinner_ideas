---
stage: model
bolt: 011-grocery-store-config
created: 2026-08-27T06:15:00Z
---

## Static Model: grocery-store-config

**New unit** — no prior bolts to extend. Owns FR-12: user-defined store layout (ordered rows) and the ingredient-category → row mapping, plus the logic that reorders the shopping list by it.

### Entities

- **GroceryStoreRow**: `id`, `name` (text), `position` (integer, 1-based) — Business rules: `position` is unique across all rows and forms a contiguous sequence (1..N, no gaps); `name` is non-empty. Reordering one row shifts every row between its old and new position by ±1 — never leaves a gap or a duplicate position.
- **CategoryRowAssignment**: `category` (text, the same free-text string already used on `dinner_ingredients.category`), `row_id` (FK → GroceryStoreRow) — Business rules: a category maps to at most one row at a time (assigning it again just moves it — last write wins, no history kept); a category with no assignment is simply absent from this table (not an error state).

### Value Objects

None — same rationale as `001-dinner-catalog`/`002-weekly-planning`: too small a domain to benefit from a separate value-object layer.

### Aggregates

- **GroceryStoreRow** (Aggregate Root): Members: `GroceryStoreRow` alone (its `CategoryRowAssignment[]` are better modeled as pointing _at_ rows than _contained by_ them — see below) — Invariant: no two rows share a `position`; positions have no gaps.
- **CategoryRowAssignment**: treated as its own small aggregate (keyed by `category`, not owned by a specific row instance) rather than a child collection of `GroceryStoreRow`, because reassigning a category to a different row is a change to the assignment, not a structural change to either row — mirrors the `Tag`/`DinnerTag` split from `001-dinner-catalog`'s bolt `009` (a shared reference, not a parent-owned child).

### Domain Events

- **RowReordered**: Trigger: a row's `position` changes (via the reorder operation) — Payload: `row_id`, `old_position`, `new_position`. Ubiquitous-language marker only, same rationale as other bolts' events in this project — not event-sourced.
- **CategoryAssigned**: Trigger: a category is mapped (or remapped) to a row — Payload: `category`, `row_id`.

### Domain Services

- **RowManagementService**: `addRow(name)` (appends at the next position), `reorderRow(rowId, newPosition)` (shifts every row between old and new position), `deleteRow(rowId)` (renumbers remaining rows to stay contiguous; un-assigns any categories pointing at it, per FK behavior — flagged for Stage 2).
- **CategoryAssignmentService**: `assignCategory(category, rowId)` (upsert — moves the category if already assigned elsewhere).
- **ShoppingListReorderService** (new, client-side pure logic — not a DB service): `reorderGroups(groups, rowConfig)` — takes `aggregate.ts#buildShoppingList`'s output and the current row/category config, returns groups sorted by row position; unassigned categories fall back to appearing after all configured rows, alphabetically (today's existing behavior, unchanged).

### Repository Interfaces

_Conceptual query surface, same shape as other units' backend-facing interfaces._

- **GroceryStoreRowRepository**: `listOrdered()`, `addRow(name)`, `reorderRow(rowId, newPosition)`, `deleteRow(rowId)`.
- **CategoryRowAssignmentRepository**: `listAll()`, `assignCategory(category, rowId)`.

### Relevant Prior Decision

`ADR-1` is directly relevant to `reorderRow`: shifting every row between an old and new position must happen as one atomic, race-safe operation — the same shape of concern that led to `lock_weekly_plan` existing as a single-purpose RPC rather than trusting the client to issue several sequential `UPDATE`s (which could transiently collide on the `position` unique constraint, or leave a partial reorder if interrupted between statements). Flagging this now for Stage 2 to design `reorderRow` as a Postgres function, not client-side sequential updates — the same pattern, applied to a new kind of "must be atomic" operation (renumbering) rather than a state-machine transition.

### Ubiquitous Language

- **Row**: One named section of the user's store, in shopping order (e.g. "Dairy", position 1).
- **Category Assignment**: The mapping from an ingredient's grocery category to a row — determines where that category's items appear on the shopping list.
- **Unassigned Category**: A category with no row mapping — falls back to alphabetical order after all configured rows, so an unconfigured or partially-configured store never breaks the shopping list.
