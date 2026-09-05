---
id: 001-reviewed-at-column-and-backfill
unit: 001-placement-review-state
intent: 013-placement-edit-control
status: complete
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 055-placement-review-state
implemented: true
---

# Story: 001-reviewed-at-column-and-backfill

## User Story

**As a** household member who just added recipes
**I want** the app to know which groceries nobody has looked at yet
**So that** the few that landed in the wrong spot can surface instead of blending in

## Acceptance Criteria

- [ ] **Given** the migration, **When** it applies, **Then** `public.items` has a nullable
      `reviewed_at timestamptz`, commented to say null means unreviewed.
- [ ] **Given** items existing before the migration, **When** it applies, **Then** every one of
      them has a non-null `reviewed_at` — nobody has had the means to review anything, so a
      day-one queue of 121 items would teach the user to ignore the list.
- [ ] **Given** an item inserted by `trg_dinner_ingredients_sync_item` **during** the migration
      window, **When** the backfill runs, **Then** that item is **not** marked reviewed — the
      backfill is bounded to rows that existed when it started, not a blanket update.
- [ ] **Given** a new ingredient saved after the migration, **When** the trigger creates its
      Item, **Then** `reviewed_at` is null with no trigger change required.
- [ ] **Given** `supabase db reset` from a clean slate, **When** the full chain applies,
      **Then** it succeeds and pgTAP is green.

## Technical Notes

- One additive migration. No destructive DDL; `grocery_store_rows` and
  `category_row_assignments` stay untouched (ADR-9 retirement is still gated on `010`'s
  Checkpoint 4).
- The bounded backfill is the subtle part. `update items set reviewed_at = now()` with no
  predicate races the trigger. Bound it by a snapshot of ids, or by `id in (select ...)`
  evaluated before any concurrent insert can land — the technical design decides how.
- No change to `trg_dinner_ingredients_sync_item`: a null default is exactly what is wanted.

## Dependencies

### Requires

- None

### Enables

- 002-review-write-path
- Unit 002's review queue

## Edge Cases

| Scenario                                       | Expected Behavior                                  |
| ---------------------------------------------- | -------------------------------------------------- |
| A household with zero items                    | Migration succeeds; nothing to backfill            |
| The migration is re-run (`db reset`)           | Idempotent — matches how `010`'s migrations behave |
| An item is deleted between snapshot and update | Update affects fewer rows; not an error            |

## Out of Scope

- The write path (story 002)
- Any UI
