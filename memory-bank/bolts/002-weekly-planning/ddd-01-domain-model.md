---
stage: model
bolt: 002-weekly-planning
created: 2026-08-26T18:13:05Z
updated: 2026-08-26T18:22:19Z
---

## Static Model: weekly-planning

**Revised 2026-08-26** — see `inception-log.md` Scope Changes. Original version locked a plan the moment it had 3 selections; this version keeps it freely editable until the shopping list is copied.

### Entities

- **WeeklyPlan**: `id`, `start_date`, `locked_at` (nullable) — Business rules: a plan is "unlocked" (editable) while `locked_at IS NULL`; it becomes "locked" the instant `locked_at` is set, at the moment the shopping list is copied. Once locked, the row itself is immutable — no field may change again, including `locked_at`.
- **WeeklyPlanSelection**: `id`, `weekly_plan_id` (FK → WeeklyPlan), `dinner_id` (FK → `dinners` from `001-dinner-catalog`) — Business rules: belongs to exactly one WeeklyPlan; a plan may never hold more than 3 at once; freely addable/removable (in any order — a "swap" is just a remove + add) while the parent plan is unlocked; immutable once the parent plan is locked.

_Note: "locked" is derived from `locked_at IS NOT NULL` rather than a separate status column — one less place for state to drift out of sync. There is deliberately no "confirmed" state distinct from "has 3 selections" — the shopping list simply becomes viewable once a plan reaches 3 selections, regardless of lock state._

### Value Objects

None beyond the entities above — same rationale as `001-dinner-catalog`: this domain is too small to benefit from a separate value-object layer.

### Aggregates

- **WeeklyPlan** (Aggregate Root): Members: `WeeklyPlan` + its `WeeklyPlanSelection[]` — Invariants:
  1. A plan never holds more than 3 selections at once, locked or not.
  2. A plan may only transition unlocked → locked when it has **exactly 3** selections.
  3. Once locked, **no** change is permitted to the plan row or any of its selections — enforced at the DB layer since there is no application server to enforce it (per `standards/system-architecture.md`).
  4. Before locking, selections may be freely added and removed, any number of times, in any order.

### Domain Events

- **WeeklyPlanLocked**: Trigger: `locked_at` transitions from `null` to a timestamp (fired by the shopping-list-copy action in the UI unit) — Payload: `weekly_plan_id`, `start_date`, the 3 `dinner_id`s, `locked_at`.

_As with `001-dinner-catalog`'s events, this is a ubiquitous-language marker, not an event-sourced mechanism._

### Domain Services

- **WeeklyPlanningService**: Operations: `getOrCreateCurrentDraftPlan(startDate)`, `addSelection(planId, dinnerId)` (rejects if already at 3, or if plan is locked), `removeSelection(planId, dinnerId)` (rejects if plan is locked), `lockPlan(planId)` (enforces exactly-3 + immutability, invariants 2/3 above) — Dependencies: `WeeklyPlanRepository`.
- **VarietyQueryService**: Operations: `getLastChosenDates()` — returns, for every dinner, the `start_date` of its most recent **locked** plan (or nothing, if never chosen) — Dependencies: `DinnerLastChosenView`.

### Repository Interfaces

_Conceptual query surface (no hand-written repository class), same rationale as `001-dinner-catalog`._

- **WeeklyPlanRepository**: `getCurrentDraftPlan()`, `getById(id)`, `createDraftPlan(startDate)`, `addSelection(planId, dinnerId)`, `removeSelection(planId, dinnerId)`, `lockPlan(planId)`.
- **DinnerLastChosenView**: A read-only Postgres view joining `dinners` to their most recent *locked* `weekly_plan_selections`, exposing `dinner_id → last_chosen_date` (or null).

### Ubiquitous Language

- **Weekly Plan**: One week's dinner selection — editable while unlocked, permanently fixed once locked.
- **Unlocked**: A weekly plan with `locked_at IS NULL` — freely editable, any number of times.
- **Locked**: A weekly plan with `locked_at` set — permanently immutable from that point on. Triggered by copying the shopping list, not by reaching 3 selections.
- **Selection**: One of the (at most 3) dinners currently attached to a weekly plan.
- **Last Chosen**: The most recent *locked* plan's `start_date` for a given dinner — the signal that drives FR-4's variety nudging. An unlocked plan's picks don't count, even if it momentarily has 3 selections.
