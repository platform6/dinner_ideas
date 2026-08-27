---
bolt: 010-weekly-planning
created: 2026-08-27T05:35:00Z
status: accepted
superseded_by: null
---

# ADR-002: Derived/History Writes on a State Transition Belong in a Trigger, Not the "Normal" RPC

## Context

Story `004-meal-history-schema` (FR-11) needs a `meal_history` row written for each of a plan's 3 dinners at the exact moment it locks. The obvious first design (Stage 2 of this bolt) was to add that insert directly inside `lock_weekly_plan`, the existing RPC every client call to lock a plan already goes through.

But `weekly_plans` has an RLS policy allowing direct authenticated `UPDATE`s (`"Authenticated household can update weekly_plans"`, from `20260826192038_weekly_planning_schema.sql`) — a client could, in principle, `PATCH /rest/v1/weekly_plans` to set `locked_at` directly, without ever calling `lock_weekly_plan`. The existing `trg_weekly_plans_require_three_on_lock` trigger already guards that path (it fires on the `locked_at` transition regardless of caller) — but code embedded inside `lock_weekly_plan`'s function body would not. A plan could end up locked, with no `meal_history` rows, via a path this app's own client code doesn't currently use but RLS doesn't prevent.

This is the same shape of problem `ADR-1` already solved for validation (max-3, exactly-3-to-lock, immutability): a rule that must hold "regardless of caller" can't live inside one particular RPC, because RLS — not RPC usage — is this architecture's only real access boundary.

## Decision

Write `meal_history` from an `AFTER UPDATE ON weekly_plans` trigger, keyed on the same `locked_at` transition (`OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL`) that `trg_weekly_plans_require_three_on_lock` already uses — not from inside `lock_weekly_plan`. `lock_weekly_plan` itself is left completely unchanged.

## Rationale

`ADR-1` already established the principle for _validation_ triggers; this extends the same principle to _derived writes_. Any logic that must happen whenever a plan locks — validating it, or recording a consequence of it — belongs on the transition itself (a trigger), not inside whichever function happens to be today's "normal" way to cause that transition. The RPC is a convenience/atomicity wrapper for the client, not the actual enforcement boundary.

### Alternatives Considered

| Alternative                                                                                 | Pros                                                                                                | Cons                                                                                                                                                                 | Why Rejected                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Insert `meal_history` inside `lock_weekly_plan`'s function body (Stage 2's original design) | Simple, one function to read, no new trigger                                                        | Silently skipped if `locked_at` is ever set through any other path (RLS permits direct `UPDATE`)                                                                     | Doesn't hold "regardless of caller," the exact standard `ADR-1` set for this domain |
| Write `meal_history` from the client, right after a successful `lockPlan()` call            | No new SQL at all                                                                                   | Two round-trips instead of one transaction; a crash/error between them leaves a locked plan with no history; also bypassable the same way as the RPC-embedded option | Not atomic, and same caller-bypass problem as the option above                      |
| A trigger on `weekly_plans` (chosen)                                                        | Fires regardless of caller path, same transaction, same guarantee as the existing exactly-3 trigger | One more trigger function to maintain                                                                                                                                | None significant — this is the option adopted                                       |

## Consequences

### Positive

- `meal_history` is guaranteed to exist for every locked plan, via any path that could ever set `locked_at` — not just the one path this app's client currently uses.
- `lock_weekly_plan` stays exactly as it was (from `002-weekly-planning`/its concurrency-fix migration) — no risk of regressing its existing, already-hardened concurrency behavior.
- Reinforces a reusable rule for this codebase: **state-transition side effects (validation or derived writes) go in a trigger on the transition, not inside a specific RPC** — the next unit that needs something similar has two working precedents (`ADR-1`, this one) instead of having to re-derive the reasoning.

### Negative

- One more trigger function in `supabase/migrations/`, slightly increasing the number of places PL/pgSQL logic lives (same trade-off `ADR-1` already accepted).

### Risks

- None significant — this is strictly more defensive than the Stage 2 design it replaces, at no added complexity cost (a trigger is not meaningfully harder to write or reason about than the equivalent inline code would have been).

## Related

- **Stories**: `004-meal-history-schema` (unit `002-weekly-planning`)
- **Standards**: Extends the same principle `ADR-1` established for `standards/system-architecture.md`'s "no backend server" decision — this time for derived/history writes, not just validation.
- **Previous ADRs**: Directly builds on `ADR-1` (Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement).
