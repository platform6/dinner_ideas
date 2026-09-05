---
unit: 001-placement-review-state
intent: 013-placement-edit-control
phase: inception
status: ready
created: '2026-09-05T17:30:00Z'
updated: '2026-09-05T17:30:00Z'
---

# Unit Brief: Placement Review State

## Purpose

Give an Item a notion of "has anyone looked at where this sits?", and correct the two places in
intent `010`'s record that describe a state the data model cannot produce.

This is the only unit in intent `013` that touches the database, and the only one carrying
deploy risk. Everything the store-page unit builds reads what this unit writes.

## Scope

### In Scope

- A nullable `items.reviewed_at timestamptz`
- A backfill marking every Item existing at migration time as reviewed
- A write path for `reviewed_at` that does **not** open `items.name` to application writes
- Exposing review state to the client (via the resolution view or a sibling read)
- Amending `010`'s FR-6 and marking `010`'s FR-13 superseded
- pgTAP coverage for the column, the backfill bound, and the write path's access limits

### Out of Scope

- Any UI. The queue that consumes this is unit `002`
- Any change to `item_location_resolution`'s resolution **logic** — a projection change to carry
  `reviewed_at` is in scope, changing how placement resolves is not
- Any change to `trg_dinner_ingredients_sync_item`. New rows arriving with `reviewed_at` null is
  the desired behaviour and needs no trigger edit
- Registry orphan cleanup

---

## Assigned Requirements

| FR             | Title                                                  | Priority |
| -------------- | ------------------------------------------------------ | -------- |
| FR-6           | Review state                                           | Must     |
| FR-8           | Correct `010`'s FR-6 — `unassigned` is the orphan case | Should   |
| FR-5 (partial) | The record half only: mark `010`'s FR-13 superseded    | Must     |

## Key Constraints

- **ADR-7's invariant is load-bearing.** `items` currently has a SELECT policy only, because the
  sync trigger is the sole creator of rows. Whatever mechanism this unit picks — a column-scoped
  `grant update (reviewed_at)` paired with a household UPDATE policy, or a `security definer`
  RPC in the style of `reorder_location` — `items.name` must remain unwritable by application
  code. **The invariant is the requirement; the mechanism is this unit's to choose.**
- **The backfill must be bounded** to rows existing at migration time. A blanket
  `update items set reviewed_at = now()` would silently mark an item inserted concurrently by
  the trigger, skipping it past the queue it was meant to enter.
- One migration, additive. No destructive DDL. `grocery_store_rows` /
  `category_row_assignments` remain untouched — ADR-9 retirement is still gated on `010`'s
  Checkpoint 4.

## Interfaces Provided

| Interface             | Consumer           | Notes                                                                                        |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `items.reviewed_at`   | units `002`, `003` | Null = unreviewed                                                                            |
| A mark-reviewed write | units `002`, `003` | Idempotent; safe to call on an already-reviewed item                                         |
| Review state on read  | unit `002`'s queue | Either projected through `item_location_resolution` or read alongside it — this unit decides |

## Dependencies

**Requires**: none — this unit goes first

**Enables**: `002-store-placement-control`, `003-shopping-list-move`

## Definition of Done

- Migration applies cleanly from a clean-slate `supabase db reset`
- Backfill marks exactly the pre-existing rows, proven by a test that inserts during the window
- pgTAP proves `items.name` cannot be written by an application role, and `reviewed_at` can
- `010`'s requirements.md carries both corrections, each pointing here
- `tsc -b`, `eslint`, `vitest` and `supabase test db` all green
