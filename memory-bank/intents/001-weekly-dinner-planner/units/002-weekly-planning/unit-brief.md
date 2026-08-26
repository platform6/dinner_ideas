---
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:26:14Z'
updated: '2026-08-26T17:26:14Z'
---

# Unit Brief: Weekly Planning

## Purpose

Owns the weekly-plan domain: persisting each week's dinner selections in real time as they're picked, keeping them freely editable (max 3 at a time) until the shopping list is copied/sent, locking the plan at that point, and exposing locked-plan history so the catalog can nudge toward variety.

## Scope

### In Scope
- `weekly_plans` / `weekly_plan_selections` schema
- Trigger enforcing a max of 3 selections per plan at any time (reject a 4th until one is removed)
- Trigger enforcing exactly 3 selections at the moment a plan locks
- Immutability after locking (no updates to a locked plan or its selections) — locking happens when the shopping list is copied (FR-3), not at initial selection
- Query/view for "last chosen date" per dinner, based on *locked* plans only (feeds FR-4 variety nudging)

### Out of Scope
- Dinner/ingredient schema → `001-dinner-catalog`
- Shopping list aggregation logic (client-side) → `003-weekly-dinner-planner-ui`
- Any UI → `003-weekly-dinner-planner-ui`

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-2 | Weekly dinner selection (pick exactly 3, editable until sent) | Must |
| FR-4 | Selection history & variety nudging (data side, locked plans only) | Should |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| WeeklyPlan | One week's plan — editable until locked | id, start_date, locked_at |
| WeeklyPlanSelection | One of up to 3 dinners currently chosen for a plan | weekly_plan_id, dinner_id |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| Add/remove selection | Add or remove a dinner from the current (unlocked) plan | plan_id, dinner_id | WeeklyPlanSelection |
| Lock weekly plan | Lock the plan at the moment its shopping list is copied — requires exactly 3 selections | plan_id | WeeklyPlan |
| Get last-chosen dates | Return most recent *locked-plan* selection date per dinner | (none / all dinners) | dinner_id → last_chosen_date map |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 3 |
| Must Have | 2 |
| Should Have | 1 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-weekly-plan-schema | Weekly plan schema | Must | Planned |
| 002-enforce-exactly-three-immutable | Enforce exactly-3 & immutability | Must | Planned |
| 003-last-chosen-query | Last-chosen query | Should | Planned |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-dinner-catalog | `weekly_plan_selections` reference `dinners` |

### Depended By
| Unit | Reason |
|------|--------|
| 003-weekly-dinner-planner-ui | Confirms plans, reads history for variety UI |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| Supabase (Postgres) | Schema, RLS, constraint enforcement | Low |

---

## Technical Context

### Suggested Technology
Supabase migration (SQL) with a DB-level check (trigger or constraint) enforcing exactly-3 and immutability, per `standards/data-stack.md`.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| 003-weekly-dinner-planner-ui | DB | Supabase client (PostgREST) |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
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

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| bolt-weekly-planning-1 | DDD | Schema + constraint stories | `weekly_plans`/`weekly_plan_selections` schema, exactly-3 + immutability enforcement |
| bolt-weekly-planning-2 | DDD | History query story | "Last chosen" query/view for variety nudging |

---

## Notes

Because there's no backend server, the max-3/exactly-3-to-lock/immutability rules need Postgres triggers rather than application code — flagging this for Construction's domain modeling stage.

**Revised 2026-08-26 during Construction**: originally scoped as "confirm immediately locks the plan." Changed to "freely editable until the shopping list is copied, which locks it" per user feedback — see `inception-log.md` Scope Changes.
