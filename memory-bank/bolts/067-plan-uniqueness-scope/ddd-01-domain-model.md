---
stage: model
bolt: 067-plan-uniqueness-scope
created: '2026-09-08T16:10:00Z'
---

## Static Model: 001-plan-uniqueness-scope

This bolt does not introduce a domain concept. It corrects one whose **scope drifted** as the
model around it changed. The modelling work is therefore to state the invariant precisely enough
that its correct scope is obvious, and to name what changed underneath it.

---

### Entities

- **WeeklyPlan** — `id`, `household_id`, `start_date`, `locked_at`, `created_at`
  - `start_date` is the first day of the **planning week** it belongs to, computed from the
    household's `week_start_day`. It is not "the day it was created".
  - `locked_at` null ⇒ **draft**. Non-null ⇒ **locked**, and immutable thereafter.
  - A plan belongs to exactly one household and exactly one planning week.

- **WeeklyPlanSelection** — `id`, `weekly_plan_id`, `dinner_id`
  - Exists only as part of a plan; has no identity outside it.
  - Bounded in number by the plan's household rule (currently three; becomes a setting in intent
    015).

- **MealHistory** — `weekly_plan_id`, `dinner_id`, `week_start_date`, `household_id`
  - A record that a dinner _was eaten_ in a week. Written only on the lock transition.
  - Keyed by plan **and** dinner, not by week and dinner — which is why two plans for one week
    can both contribute history for that week.

---

### Value Objects

- **PlanningWeek** — the pair (`household_id`, `start_date`)
  - Not a stored type; it is the identity this bolt is about. Derived client-side from
    `week_start_day` (intent 011) and materialised as `weekly_plans.start_date`.
  - Equality is by value: two plans with the same household and start date are for _the same
    planning week_, whatever else differs.
  - **This value object is the missing piece.** The uniqueness rule was written against
    `household_id` alone, before PlanningWeek existed as a concept.

- **PlanState** — `draft` | `locked`, derived from `locked_at`
  - `draft` is editable and at most one may exist per… (see the invariant below — this is the
    sentence whose ending changed).

---

### Aggregates

- **WeeklyPlan** (aggregate root)
  - **Members**: its `WeeklyPlanSelection` rows.
  - **Invariants**:
    1. A locked plan is immutable — no selection may be added or removed.
    2. A plan may be locked only with exactly the household's required number of selections.
    3. **At most one draft plan may exist per household per planning week.**

  Invariant 3 is the one this bolt changes. It previously read _"per household"_, full stop.

  **Why the old wording was ever right**: when it was written (intent 001, bolt 027) a plan had no
  meaningful week identity — the app's notion of "the current plan" was _the most recently created
  one_. With no PlanningWeek concept, "one draft per household" and "one draft per household per
  week" were indistinguishable, and the shorter phrasing was chosen.

  **What made it wrong**: intent 011 gave plans a real week identity and began looking them up by
  it. From that moment the two readings diverged, and the stored rule kept enforcing the one the
  application had stopped meaning.

  **What made it visible**: intent 012 made locking a deliberate act. Drafts began outliving their
  weeks, and the first week that rolled over with an unfinished draft hit the divergence.

---

### Domain Events

- **PlanLocked** — Trigger: `locked_at` transitions null → non-null.
  - Payload: the plan, its selections, its `start_date`.
  - Consequence: one `MealHistory` row per selection.
  - **Not idempotent across plans.** The write is `on conflict (weekly_plan_id, dinner_id) do
nothing` — deduplication is per _plan_, not per _week_. Two plans for one week therefore
    contribute two sets of history for that week. Observed in production on 2026-09-08: the week
    of 2026-08-30 now carries six rows from two plans.

- **PlanDrafted** — Trigger: a plan is created for a planning week.
  - Guarded by invariant 3. The guard is what failed.

---

### Domain Services

None introduced. The relevant behaviour already lives in Postgres and stays there:

- **`lock_weekly_plan(plan_id)`** — performs the lock transition; the triggers enforce invariants
  1 and 2 and raise PlanLocked.
- **The selection-cap trigger** — enforces the household's selection count under concurrency, via
  `for update` on the plan row.

---

### Repository Interfaces

Unchanged. Recorded because the mismatch between two of them _is_ the defect:

- **`createPlan(startDate)`** — inserts a draft for a PlanningWeek. Asks the database for a plan
  scoped to a week.
- **`fetchPlanByStartDate(startDate)`** — reads a plan for a PlanningWeek. Also scoped to a week,
  and notably documented as tolerating duplicates: _"If more than one plan somehow shares a
  start_date, the most recently created one wins."_
- **The uniqueness constraint** — enforced a rule scoped to a **household**.

Two of the three speak PlanningWeek; the third speaks Household. That is the whole bug, stated in
one line.

---

### The invariant, restated

> **At most one draft plan per household per planning week.**

What this permits, deliberately:

- A draft for this week while an **older draft** still exists — the production scenario, and the
  case that was blocked.
- A draft for a week that already has a **locked** plan — re-planning a past week. Production
  already contains such a pair, and `fetchPlanByStartDate` already resolves it. This bolt must not
  forbid it.

What it still forbids, deliberately:

- **Two drafts for the same planning week.** This is the protection bolt 027 was written for: two
  concurrent creates that each observe "no plan yet" and both succeed, orphaning one. Narrowing
  the scope must not become removing the rule.

---

### Ubiquitous Language

- **Planning week** — the week a plan belongs to, starting on the household's `week_start_day`.
  Distinct from "this week" in the calendar sense and from the plan's creation date.
- **Draft** — a plan with `locked_at` null. Editable; at most one per household per planning week.
- **Locked** — a plan with `locked_at` set. Immutable, historical, and exempt from the draft rule.
- **Stale draft** — a draft whose planning week has passed. A normal state, not an error: the
  household simply did not lock that week. The defect was treating it as one.
- **Rollover** — the planning week advancing past a plan's `start_date` (intent 011).

---

### What this bolt is _not_ modelling

- Any behaviour on rollover for an unfinished draft — carrying it forward, prompting to lock it,
  or discarding it. That is a product decision, recorded as this intent's open question.
- Deduplicating `MealHistory` per week. The six-row week is a consequence of two locked plans, and
  whether that is wrong is a separate question from this bolt's invariant.

Both are noted here so that a later reader can see they were considered and deliberately excluded,
rather than missed.
