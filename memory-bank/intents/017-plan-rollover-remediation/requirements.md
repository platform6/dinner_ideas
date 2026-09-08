---
intent: 017-plan-rollover-remediation
phase: inception
status: complete
created: '2026-09-08T00:00:00Z'
updated: '2026-09-08T00:00:00Z'
---

# Requirements: Plan rollover remediation — one unlocked plan _per week_, not per household

## Intent Overview

Picking a dinner fails in production with a Postgres unique violation:

```json
{
  "code": "23505",
  "message": "duplicate key value violates unique constraint \"idx_weekly_plans_one_unlocked\""
}
```

Confirmed against the live project on 2026-09-08. The household has exactly one unlocked plan,
`bf0206d0…`, for the week of **2026-08-30**, carrying 3 picks and never locked. The current
planning week began 2026-09-06. Picking a dinner tries to create this week's plan; the index
permits only one unlocked plan **per household, across all time**; the insert is rejected.

The result is a **hard block on the app's primary action**. Nothing can be picked, so nothing
downstream — shopping list, cooking view — can be reached either.

### This is a collision between three intents, none of which is wrong alone

| Piece                                           | From                 | Says                                                               |
| ----------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `idx_weekly_plans_one_unlocked`                 | intent 001, bolt 027 | One unlocked plan per household, **globally** — no notion of weeks |
| `fetchCurrentPlan` / `createPlan` by start date | intent 011           | Plans are keyed **per week**; a new week needs a new plan          |
| Locking is a deliberate act                     | intent 012           | Drafts routinely go un-locked, and now persist                     |

The index predates the week-keyed model. When it was written, "the current plan" meant "the most
recently created plan" and there was only ever one draft in flight. Intent 011 made plans
week-scoped without revisiting it, and intent 012 removed the incidental locking that used to keep
old drafts from lingering. The bug is the seam between them.

### It was seen before and not recognised

`weekly_planning_meal_history_test.sql` carries this comment:

> Safe against a fresh local/CI database (no pre-existing unlocked plan to collide with
> `idx_weekly_plans_one_unlocked`, **unlike the live project**)

and bolt 010's test report records dropping the index inside a transaction "to avoid colliding
with that real unlocked plan". The divergence between production and CI was known as a testing
inconvenience and worked around, rather than read as a latent defect. Worth recording, because the
signal was there a whole release cycle before the failure.

### Production already held two plans for one week

Discovered 2026-09-08 while clearing the block. The week of 2026-08-30 had **two** plans:
`06485677…`, locked 2026-09-04, and `bf0206d0…`, created that same day and left unlocked. The
index only covers `locked_at is null`, so once the first was locked nothing prevented a second for
the same week.

`fetchPlanByStartDate` already anticipates this — _"If more than one plan somehow shares a
start_date, the most recently created one wins"_ — and resolves it by picking the newest. So
duplicate plans per week are a **tolerated existing state**, not a new possibility this intent
introduces, and FR-1 must not accidentally forbid them: a locked week that someone re-plans is a
legitimate case, and the index's `where locked_at is null` predicate already permits it.

Consequence of the remediation: locking `bf0206d0…` wrote 3 more `meal_history` rows for that
week, which now shows 6 dinners. Accepted by the product owner — the project is in active
development and does not yet need durable history.

### Not caused by v0.11.1

Bolt 058 touched `ShoppingListPage.tsx` and `reorder.ts` only; neither creates a plan. The trigger
was the week rolling over on 2026-09-06 with the previous week's draft still unlocked.

---

## Business Goals

| Goal                                                      | Success Metric                                                 | Priority |
| --------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| Picking a dinner works again                              | A new week's plan is created while an older draft still exists | Must     |
| The original concurrency protection is not lost           | Two concurrent creates for the **same** week still collide     | Must     |
| A failure that cannot be retried does not say "try again" | The message reflects whether retrying can help                 | Should   |

---

## Functional Requirements

### FR-1: Scope the uniqueness to the week

- **Description**: `idx_weekly_plans_one_unlocked` becomes unique per household **and start date**
  rather than per household alone.
- **Acceptance Criteria**:
  - The index becomes `unique (household_id, start_date) where locked_at is null`, preserving
    `nulls not distinct` so the null-household window behaves as before
  - A household may hold an unlocked draft for an earlier week **and** create this week's plan
  - Two concurrent inserts for the **same** `(household_id, start_date)` still collide — the
    protection bolt 027 added is preserved, not traded away
  - The migration is **widening**, so no existing row can violate the new index and no data
    remediation is required for it to apply
  - The index comment is rewritten; the current one states the old rule and would otherwise
    describe behaviour that no longer exists
- **Priority**: Must

### FR-2: The tests assert the new rule

- **Description**: A pgTAP case currently encodes the bug as intended behaviour and must be
  updated, not deleted.
- **Acceptance Criteria**:
  - `weekly_planning_test.sql`'s `'a second unlocked weekly plan is rejected while one already
exists'` is rewritten to assert rejection **for the same week**, and acceptance for a
    different week
  - A case covers the exact production scenario: an unlocked plan for an earlier week, then a
    successful create for the current week
  - The comments in `weekly_planning_meal_history_test.sql` about working around the live
    project's unlocked plan are corrected — after this change the workaround is unnecessary, and a
    comment describing a vanished constraint is worse than none
  - Nothing in the suite still asserts one-unlocked-plan-per-household-globally
- **Priority**: Must

### FR-3: A permanent failure does not advise retrying

- **Description**: The catalog currently reports any pick failure as _"Couldn't save that change,
  try again."_ For a unique violation that advice is wrong — retrying cannot succeed.
- **Acceptance Criteria**:
  - A pick that fails because a plan cannot be created is distinguished from a transient failure
  - The message tells the user something true and actionable rather than "try again"
  - Raw error objects still never reach the UI (coding standards, unchanged)
  - The distinction is made on the error's identity, not by string-matching a message that
    Postgres is free to reword
- **Priority**: Should

### FR-4: The stale production draft is resolved

- **Description**: The existing `bf0206d0…` draft for 2026-08-30 blocks the app until it is
  locked or removed. This is an operational act on production data, recorded here so the fix and
  its data remediation are not separated.
- **Acceptance Criteria**:
  - The product owner decides between locking it (writes 3 `meal_history` rows for 2026-08-30;
    correct only if those dinners were actually eaten) and deleting it (cascades its 3 selections;
    no false history, but the plan record is lost)
  - The decision and its reasoning are recorded in the operations log
  - **Note**: FR-1 alone unblocks new picks without touching this row. The row only matters for
    whether that week's history is retained
- **Priority**: Must

---

## Non-Functional Requirements

### Reliability

- **Metric**: The concurrency guarantee from `20260827002830` still holds for a single week —
  proven by a pgTAP case, not by inspection
- **Metric**: The migration applies to production without data remediation, because it only
  widens an existing constraint

### Security

- **Metric**: No RLS change. `weekly_plans` policies are untouched; this is an index definition only

---

## Constraints

- **Widening only.** Every existing row satisfies the new index by construction, so the migration
  cannot fail on production data — unlike a narrowing change, which would need a rehearsal.
- **`nulls not distinct` must be preserved.** Intent 004's null-household window relies on it.
- **The client must not enforce this.** ADR-1: an invariant that must hold regardless of caller
  belongs in Postgres. FR-3 improves the message, it does not add a client-side check.

## Resolved Decisions

| Question                                     | Decision                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Widen the index, or auto-clean stale drafts? | **Widen.** Auto-cleaning destroys a user's data to satisfy a constraint that was simply out of date |
| Keep one-draft-per-week?                     | **Yes.** It is the original protection, correctly scoped — not a restriction to remove entirely     |

## Open Questions

| #   | Question                                                                                                                                                                                                          | Owner         | Needed by       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------- |
| 1   | Should the app do anything on rollover about a previous week's unfinished draft — offer to carry it forward, or prompt to lock it? Out of scope here; this intent restores correctness rather than adding a flow. | Product owner | A future intent |

## Priority Definitions

- **Must**: The intent is not deliverable without it.
- **Should**: Valuable, and cuttable without invalidating the rest.
