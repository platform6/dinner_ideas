---
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:26:14Z'
updated: '2026-08-27T01:00:00Z'
---

# Unit Brief: Weekly Planning

## Purpose

Owns the weekly-plan domain: persisting each week's dinner selections in real time as they're picked, keeping them freely editable (max 3 at a time) until the shopping list is copied/sent, locking the plan at that point, exposing locked-plan history so the catalog can nudge toward variety, and recording an explicit eaten-history record per locked week (FR-11).

## Scope

### In Scope

- `weekly_plans` / `weekly_plan_selections` schema
- Trigger enforcing a max of 3 selections per plan at any time (reject a 4th until one is removed)
- Trigger enforcing exactly 3 selections at the moment a plan locks
- Immutability after locking (no updates to a locked plan or its selections) — locking happens when the shopping list is copied (FR-3), not at initial selection
- Query/view for "last chosen date" per dinner, based on _locked_ plans only (feeds FR-4 variety nudging)
- `meal_history` schema (FR-11): one row per dinner per locked week, written at the moment a plan locks; queries to list weeks (past/current) for week navigation

### Out of Scope

- Dinner/ingredient schema → `001-dinner-catalog`
- Shopping list aggregation logic (client-side) → `003-weekly-dinner-planner-ui`
- Any UI (incl. week navigation controls) → `003-weekly-dinner-planner-ui`

---

## Assigned Requirements

| FR    | Requirement                                                        | Priority |
| ----- | ------------------------------------------------------------------ | -------- |
| FR-2  | Weekly dinner selection (pick exactly 3, editable until sent)      | Must     |
| FR-4  | Selection history & variety nudging (data side, locked plans only) | Should   |
| FR-11 | Week navigation & eaten history (`meal_history` schema side)       | Should   |

---

## Domain Concepts

### Key Entities

| Entity              | Description                                        | Attributes                                 |
| ------------------- | -------------------------------------------------- | ------------------------------------------ |
| WeeklyPlan          | One week's plan — editable until locked            | id, start_date, locked_at                  |
| WeeklyPlanSelection | One of up to 3 dinners currently chosen for a plan | weekly_plan_id, dinner_id                  |
| MealHistory         | One dinner-was-eaten record for a locked week      | weekly_plan_id, dinner_id, week_start_date |

### Key Operations

| Operation             | Description                                                                                                                                 | Inputs                       | Outputs                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| Add/remove selection  | Add or remove a dinner from the current (unlocked) plan                                                                                     | plan_id, dinner_id           | WeeklyPlanSelection              |
| Lock weekly plan      | Lock the plan at the moment its shopping list is copied — requires exactly 3 selections; also writes `meal_history` rows for its selections | plan_id                      | WeeklyPlan                       |
| Get last-chosen dates | Return most recent _locked-plan_ selection date per dinner                                                                                  | (none / all dinners)         | dinner_id → last_chosen_date map |
| Get week by offset    | Return the weekly plan N weeks before/after a reference week, for ◀ / ▶ navigation                                                          | reference start_date, offset | WeeklyPlan or null               |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 4     |
| Must Have     | 2     |
| Should Have   | 2     |
| Could Have    | 0     |

### Stories

| Story ID                            | Title                            | Priority | Status   |
| ----------------------------------- | -------------------------------- | -------- | -------- |
| 001-weekly-plan-schema              | Weekly plan schema               | Must     | Complete |
| 002-enforce-exactly-three-immutable | Enforce exactly-3 & immutability | Must     | Complete |
| 003-last-chosen-query               | Last-chosen query                | Should   | Complete |
| 004-meal-history-schema             | Meal history schema              | Should   | Planned  |

---

## Dependencies

### Depends On

| Unit               | Reason                                       |
| ------------------ | -------------------------------------------- |
| 001-dinner-catalog | `weekly_plan_selections` reference `dinners` |

### Depended By

| Unit                         | Reason                                       |
| ---------------------------- | -------------------------------------------- |
| 003-weekly-dinner-planner-ui | Confirms plans, reads history for variety UI |

### External Dependencies

| System              | Purpose                             | Risk |
| ------------------- | ----------------------------------- | ---- |
| Supabase (Postgres) | Schema, RLS, constraint enforcement | Low  |

---

## Technical Context

### Suggested Technology

Supabase migration (SQL) with a DB-level check (trigger or constraint) enforcing exactly-3 and immutability, per `standards/data-stack.md`.

### Integration Points

| Integration                  | Type | Protocol                    |
| ---------------------------- | ---- | --------------------------- |
| 003-weekly-dinner-planner-ui | DB   | Supabase client (PostgREST) |

### Data Storage

| Data                      | Type           | Volume                    | Retention                           |
| ------------------------- | -------------- | ------------------------- | ----------------------------------- |
| Weekly plans + selections | Postgres (SQL) | ~1 row/week + 3 rows/week | Indefinite (drives variety history) |

---

## Constraints

- Max-3-selections and immutable-once-locked should be enforced at the DB layer (triggers), not just client-side validation, since RLS/DB is the only real enforcement boundary in this architecture (no server).
- Locking happens when the shopping list is copied (a UI-unit action), not at initial selection — the plan must stay freely editable (swap any pick, any time) until that moment.

---

## Success Criteria

### Functional

- [ ] A plan never holds more than 3 selections at once (4th insert rejected until one is removed)
- [ ] A plan cannot be locked with != 3 selections
- [ ] A locked plan's selections cannot be modified
- [ ] Last-chosen date per dinner is queryable for the catalog view, reflecting only locked plans

### Non-Functional

- [ ] RLS restricts read/write to authenticated household session only

### Quality

- [ ] All acceptance criteria met
- [ ] Constraint/trigger logic covered by tests

---

## Bolt Suggestions

| Bolt                   | Type | Stories                     | Objective                                                                            |
| ---------------------- | ---- | --------------------------- | ------------------------------------------------------------------------------------ |
| bolt-weekly-planning-1 | DDD  | Schema + constraint stories | `weekly_plans`/`weekly_plan_selections` schema, exactly-3 + immutability enforcement |
| bolt-weekly-planning-2 | DDD  | History query story         | "Last chosen" query/view for variety nudging                                         |
| 010-weekly-planning    | DDD  | 004-meal-history-schema     | `meal_history` schema, written on plan lock, for FR-11's past-weeks view             |

---

## Notes

Because there's no backend server, the max-3/exactly-3-to-lock/immutability rules need Postgres triggers rather than application code — flagging this for Construction's domain modeling stage.

**Revised 2026-08-26 during Construction**: originally scoped as "confirm immediately locks the plan." Changed to "freely editable until the shopping list is copied, which locks it" per user feedback — see `inception-log.md` Scope Changes.

**Revised 2026-08-27 post-deployment**: added FR-11 (Week Navigation & Eaten History). This unit gains `meal_history` (new follow-up bolt `010-weekly-planning`); week navigation UI itself lives in `003-weekly-dinner-planner-ui`. Open question carried forward: confirm plan-lock is the right trigger moment for writing `meal_history` rows (see `requirements.md` Open Questions). See `inception-log.md` Scope Changes.
