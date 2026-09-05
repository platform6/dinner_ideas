---
id: 002-review-write-path
unit: 001-placement-review-state
intent: 013-placement-edit-control
status: planned
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 055-placement-review-state
implemented: false
---

# Story: 002-review-write-path

## User Story

**As a** household member
**I want** confirming or moving a grocery to record that I looked at it
**So that** it drops off the review list and does not ask me twice

## Acceptance Criteria

- [ ] **Given** an authenticated member of the household, **When** they mark one of their items
      reviewed, **Then** `reviewed_at` is set and the write succeeds.
- [ ] **Given** the same member, **When** they attempt to write `items.name`, **Then** it is
      **rejected**. ADR-7's invariant — the sync trigger is the only thing that creates or names
      items rows — survives this story intact.
- [ ] **Given** a member of a different household, **When** they attempt to mark the item
      reviewed, **Then** it is rejected by RLS.
- [ ] **Given** an already-reviewed item, **When** it is marked again, **Then** the call
      succeeds and is harmless — idempotent, so every caller can fire it without checking first.
- [ ] **Given** pgTAP, **When** the suite runs, **Then** it proves both the allowed write and
      the refused one, not merely the happy path.

## Technical Notes

- `items` today has a **SELECT policy only**, deliberately. Two mechanisms satisfy the
  invariant:
  - a household-scoped `UPDATE` policy paired with `grant update (reviewed_at) on public.items`
    — column privileges, not RLS, are what confine it to the one column; or
  - a `security definer` RPC, in the style of `010`'s `reorder_location`.
    Precedent exists for both in this schema. **Pick one in technical design and record why** —
    this is exactly the kind of choice ADR-7 was written to protect.
- Whichever path is chosen, the marking call must be safe to invoke from several UI entry
  points (accept, move, place) without coordination.

## Dependencies

### Requires

- 001-reviewed-at-column-and-backfill

### Enables

- Unit 002's queue actions
- Unit 003's shopping-list move

## Edge Cases

| Scenario                                    | Expected Behavior                       |
| ------------------------------------------- | --------------------------------------- |
| Two members mark the same item concurrently | Last write wins; no error, no duplicate |
| The item was deleted between read and mark  | No-op, not an error                     |

## Out of Scope

- Deciding _when_ to mark reviewed — that is each consuming story's business
