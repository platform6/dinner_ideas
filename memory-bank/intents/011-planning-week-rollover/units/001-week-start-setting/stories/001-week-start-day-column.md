---
id: 001-week-start-day-column
unit: 001-week-start-setting
intent: 011-planning-week-rollover
status: draft
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 045-week-start-setting
implemented: false
---

# Story: 001-week-start-day-column

## User Story

**As a** developer building the planning-week feature
**I want** a household-scoped `week_start_day` column with a safe default
**So that** every part of the feature can derive "the current planning week" from one value

## Acceptance Criteria

- [ ] **Given** a new append-only migration under `supabase/migrations/`, **When** it is
      applied, **Then** `public.households` has
      `week_start_day smallint not null default 0` with
      `check (week_start_day between 0 and 6)` and a `comment on column` explaining 0 = Sunday.
- [ ] **Given** existing household rows, **When** the migration runs, **Then** they all read
      `week_start_day = 0` (implicit backfill via the default) with no data migration step.
- [ ] **Given** the existing RLS policies on `households`, **When** the column is added,
      **Then** **no** new policy is created — `"Household updatable by an owner"` (UPDATE) and
      `"Household readable by its members"` (SELECT) already govern the row.
- [ ] **Given** the migration is applied, **When** `database.types.ts` is regenerated, **Then**
      `households` Row/Insert/Update types include `week_start_day: number`.
- [ ] **Given** a non-owner session, **When** it attempts `update households set week_start_day
    = 3`, **Then** RLS rejects it (0 rows affected / error) — verified by a DB test or a
      documented manual check.

## Technical Notes

- Timestamped filename after the latest existing migration (`20260831130000_*` /
  `20260901120000_*` — pick the next).
- `smallint` + `check` mirrors how `grocery_store_rows.position` constraints are done in this
  codebase.
- Regeneration: the project's existing `supabase gen types` path (see prior "regen
  database.types.ts" commits).

## Dependencies

### Requires

- None (first story of the unit)

### Enables

- 002-settings-planning-week-card
- (Unit 2) 001-planning-week-date-helpers

## Edge Cases

| Scenario                       | Expected Behavior                                                    |
| ------------------------------ | -------------------------------------------------------------------- |
| Value 7 or -1 written directly | `check` constraint rejects                                           |
| Migration re-run in dev        | Idempotent-safe (`add column if not exists` or documented dev reset) |

## Out of Scope

- Any UI (story 002)
- Any consumer of the value (Unit 2)
