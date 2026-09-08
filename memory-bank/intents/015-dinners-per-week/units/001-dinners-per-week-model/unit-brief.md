---
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
phase: inception
status: complete
created: '2026-09-07T04:00:00Z'
updated: '2026-09-07T04:00:00Z'
---

# Unit Brief: Dinners Per Week Model

## Purpose

Turn the hard-coded three-dinner rule into a household setting, in the place the rule actually
lives: Postgres.

## Scope

### In Scope

- `households.dinners_per_week smallint not null default 3 check (between 1 and 7)`
- The selection-cap trigger, comparing against the setting
- The lock trigger, comparing against the setting, **and renamed**
- Correcting `fn_weekly_plans_record_meal_history`'s comment (its logic is already N-agnostic)
- Updating the three pgTAP files that assert the rule
- The owner-editable control on `/settings`

### Out of Scope

- Any client site that only _reads_ the number (unit 002)
- Any new RLS policy — the existing `households` policies cover a new column
- Changing what locking means (intent 012 owns that)

---

## Assigned Requirements

| FR   | Title                                 | Priority |
| ---- | ------------------------------------- | -------- |
| FR-1 | `households.dinners_per_week`         | Must     |
| FR-2 | The selection cap honours the setting | Must     |
| FR-3 | Locking honours the setting           | Must     |
| FR-4 | A setting control on `/settings`      | Must     |
| FR-5 | Mid-week change adopts the new number | Must     |

## Key Constraints

- **The concurrency guarantee must survive.** `20260827002830` exists because two writers could
  race past a `< 3` check and land a plan at four. The `for update` serialisation on the plan row
  stays, and a pgTAP case must prove the race still cannot win with a variable bound.
- **`fn_weekly_plans_require_three_on_lock` must be renamed.** Leaving a function named after the
  constant this intent removes is how the next reader is misled.
- **Default 3, so the deploy is a no-op.** No existing household changes behaviour.
- **Follow `week_start_day`** (intent 011, bolt 045) for the column, the comment, the settings
  control and the RLS reasoning.

## Interfaces Consumed

| Interface                 | From       | Notes                                   |
| ------------------------- | ---------- | --------------------------------------- |
| `households` RLS policies | intent 004 | Member-SELECT, owner-UPDATE — unchanged |
| `/settings` page          | intent 007 | Gains one control                       |
| `week_start_day` control  | intent 011 | The pattern to copy                     |

## Interfaces Produced

| Interface                     | For                  | Notes                       |
| ----------------------------- | -------------------- | --------------------------- |
| `households.dinners_per_week` | unit 002, intent 016 | The number everything reads |

## Dependencies

**Requires**: none

**Enables**: `002-plan-flow-variable-n`, and intent `016-feeling-lucky`

## Definition of Done

- The column exists, defaults to 3, and is constrained to 1–7
- Selection number N+1 is rejected with a message stating the real limit
- A plan locks at exactly N and is rejected otherwise, with an accurate message
- The lock function no longer has "three" in its name, and the old name is explicitly dropped
- Two racing inserts still cannot exceed N — proven by pgTAP
- An owner can change the setting on `/settings`; a member cannot
- All three pgTAP files assert the rule against the setting rather than a literal
- `tsc -b`, `eslint`, `vitest`, pgTAP all green
