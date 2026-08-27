---
stage: model
bolt: 010-weekly-planning
created: 2026-08-27T05:15:00Z
---

## Static Model: weekly-planning (follow-up: meal history)

**Scope note**: this bolt extends the `weekly-planning` domain established in `002-weekly-planning` with one new entity, `MealHistoryEntry`, for FR-11 (Week Navigation & Eaten History). `WeeklyPlan` and `WeeklyPlanSelection` are unchanged and not repeated in full here except where the aggregate boundary is affected.

### Entities

- **MealHistoryEntry** (new): `id`, `weekly_plan_id` (FK → WeeklyPlan), `dinner_id` (FK → Dinner), `week_start_date` (date, denormalized copy of the plan's `start_date` at lock time) — Business rules: one row per dinner per locked week (so exactly 3 rows per locked plan); immutable once written (a plan's selections can't change after lock anyway, so there's nothing to reconcile); written exactly once, at the moment `WeeklyPlan.locked_at` transitions from null to a timestamp — never written for a plan that's never locked.

### Value Objects

None beyond the entity above — same rationale as `002-weekly-planning`.

### Aggregates

- **WeeklyPlan** (Aggregate Root, extended): Members: `WeeklyPlan` + `WeeklyPlanSelection[]` + `MealHistoryEntry[]` — Invariant (new): a plan's `MealHistoryEntry[]` is empty while unlocked, and has exactly 3 entries (mirroring its 3 selections) immediately after locking — written as part of the same atomic transition as invariant 2 from `002-weekly-planning`'s model ("may only transition unlocked → locked when it has exactly 3 selections"), not as a separate step that could partially fail.

### Domain Events

- **MealHistoryRecorded**: Trigger: same moment as `WeeklyPlanLocked` (from `002-weekly-planning`'s model) — Payload: `weekly_plan_id`, `week_start_date`, the 3 `dinner_id`s. Not a separate event in practice — it's the same lock transition, recorded here because FR-11 explicitly wants a queryable history distinct from re-deriving "eaten" from `locked_at` + date each time.

### Domain Services

- **WeeklyPlanningService** (extended from `002-weekly-planning`): `lockPlan(planId)` now also writes the plan's 3 `MealHistoryEntry` rows, atomically, as part of the same operation — not a new public method, an extension of the existing one.
- **WeekHistoryQueryService** (new): `getWeekByOffset(referenceDate, offset)` — returns the `WeeklyPlan` (with its selections) N weeks before/after a reference week, for the ◀ / ▶ navigation UI (`013-week-navigation-view`); `isWeekEaten(weeklyPlanId)` — true iff `MealHistoryEntry` rows exist for that plan (equivalent to "is locked," but expressed as the query FR-11's UI actually needs).

### Repository Interfaces

_Same no-custom-backend shape as `002-weekly-planning`._

- **WeeklyPlanRepository** (extended, conceptual): `lockPlan(planId)`'s existing contract gains "also writes meal_history" as an implementation detail of the same RPC — no new method signature.
- **MealHistoryRepository** (new, conceptual): `getByWeek(startDate)`, `getByOffsetFromLatest(offset)`.

### Relevant Prior Decision

`ADR-1` (Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement) is directly applicable here, more so than in bolt `009`: `lock_weekly_plan(p_plan_id)` already exists as the single atomic RPC that transitions a plan to locked (see `20260826192038_weekly_planning_schema.sql`, hardened for concurrency in `20260827002830_weekly_planning_concurrency_fixes.sql`). Extending that **same function** to also insert the 3 `meal_history` rows — inside the same transaction, under the same `FOR UPDATE` lock it already takes — is the natural fit: it guarantees a plan can never end up locked with zero or partial history rows, and never needs a second client round-trip that could fail independently. This resolves the open question from `requirements.md` ("trigger for writing `meal_history` rows") — **lock time, via the existing RPC, not a new trigger or a client-side second call.**

### Ubiquitous Language

- **Meal History**: The durable record of which dinners were eaten in a given (locked) week — distinct from just reading `weekly_plans`/`weekly_plan_selections` directly, so FR-11's past-weeks view and FR-4's variety nudging both read from one explicit, purpose-built source going forward.
- **Eaten**: A week is "eaten" once its plan is locked and its `meal_history` rows exist — equivalent to "locked" today, but modeled as its own concept since a future change (e.g. an explicit "mark as cooked" step) could decouple the two without changing what FR-11's UI queries.
