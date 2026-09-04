---
unit: 001-week-start-setting
intent: 011-planning-week-rollover
phase: inception
status: complete
created: '2026-09-03T22:55:00Z'
updated: '2026-09-03T22:55:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Week-Start Setting

## Purpose

Make the planning-week start weekday a real, household-scoped, owner-editable setting: one
additive column on `households`, plus a "Planning week" card on `/settings`. Everything else
in intent `011` reads this value.

## Scope

### In Scope

- `households.week_start_day smallint not null default 0 check (between 0 and 6)` — additive
  migration, `database.types.ts` regen (FR-1)
- Read + owner-guarded update path (`fetchHouseholdSettings` / `updateWeekStartDay`, a
  `useHouseholdSettings` hook + mutation) using direct PostgREST against `households` under the
  **existing** owner RLS policy (FR-1, FR-2)
- `PlanningWeekCard` on `/settings`: 7-option weekday control bound to `week_start_day`,
  disabled + explanatory for non-owners, helper text, inline error on failure (FR-2)
- Correct behaviour at the `0` (Sunday) default before anyone configures it, and for
  non-owners (FR-8)
- This unit's own tests (owner change persists; non-owner disabled; failure retains value)

### Out of Scope

- Any use of the value (date math, week-aware current plan, rollover, window label) →
  Unit 2 `002-planning-week-rollover-ui`
- New RLS policies (the existing `households` owner-UPDATE / member-SELECT policies suffice)
- Timezone storage
- Any RPC (a plain PostgREST `update` is enough — no protected column here, unlike
  `household_ai_config`)

---

## Assigned Requirements

| FR   | Requirement                                                        | Priority |
| ---- | ------------------------------------------------------------------ | -------- |
| FR-1 | `week_start_day` column on `households` (+ migration, types regen) | Must     |
| FR-2 | Owner control on `/settings` ("Planning week" card)                | Must     |
| FR-8 | Works at the Sunday default / for non-owners; mid-week change note | Should   |

---

## Domain Concepts

### Key Entities

| Entity            | Description                                          | Attributes                                   |
| ----------------- | ---------------------------------------------------- | -------------------------------------------- |
| Household setting | The one household-scoped preference this intent adds | `week_start_day` (0 = Sunday … 6 = Saturday) |

### Key Operations

| Operation               | Description                                             | Inputs      | Outputs                  |
| ----------------------- | ------------------------------------------------------- | ----------- | ------------------------ |
| Read household settings | `select week_start_day from households` (member RLS)    | —           | `{ weekStartDay: 0..6 }` |
| Set week-start day      | `update households set week_start_day = $1` (owner RLS) | `day: 0..6` | 204; query invalidation  |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 2     |
| Must Have     | 1     |
| Should Have   | 1     |
| Could Have    | 0     |

### Stories

| Story ID                        | Title                                                                                | Priority | Status  |
| ------------------------------- | ------------------------------------------------------------------------------------ | -------- | ------- |
| 001-week-start-day-column       | Additive `week_start_day` column + migration + types regen                           | Must     | Planned |
| 002-settings-planning-week-card | Owner-editable "Planning week" card on `/settings` (+ non-owner / default behaviour) | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                                | Reason                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `004-account-model` (complete)      | `households` table + owner-UPDATE / member-SELECT RLS; `useAuth` role/householdId       |
| `007-claude-integration` (complete) | `/settings` route + card layout (`SettingsPage`, `ClaudeAiCard` as the sibling pattern) |

### Depended By

| Unit                            | Reason                                                |
| ------------------------------- | ----------------------------------------------------- |
| `002-planning-week-rollover-ui` | Reads `week_start_day` for all date math and rollover |

### External Dependencies

| System               | Purpose                                               | Risk |
| -------------------- | ----------------------------------------------------- | ---- |
| Supabase / PostgREST | One additive column + a member read + an owner update | Low  |

---

## Technical Context

### Suggested Technology

Supabase migration (SQL); PostgREST via `supabase-js`; TanStack Query; Chakra UI v2 card
modeled on `ClaudeAiCard`. No RPC, no new dependency (`standards/tech-stack.md`,
`standards/data-stack.md`).

### Integration Points

| Integration      | Type | Protocol                                   |
| ---------------- | ---- | ------------------------------------------ |
| `households` row | DB   | PostgREST select/update under existing RLS |
| `/settings` page | UI   | React component mount                      |

### Data Storage

| Data                        | Type                  | Volume          | Retention             |
| --------------------------- | --------------------- | --------------- | --------------------- |
| `households.week_start_day` | SQL column (smallint) | 1 per household | Lifetime of household |

---

## Constraints

- Additive migration only; append-only `supabase/migrations/`; no edits to prior files.
- No new RLS policy — reuse `"Household updatable by an owner"` / `"Household readable by its
members"`.
- Owner-only write, enforced by RLS (client also hides/disables the control for non-owners as
  UX, not as the security boundary).
- `default 0` = Sunday; every existing household reads as Sunday until changed.

---

## Success Criteria

### Functional

- [ ] Migration applies cleanly; `week_start_day` present, `not null default 0`, check 0–6
- [ ] `database.types.ts` includes the column
- [ ] An owner can pick a weekday on `/settings`; it persists across reload
- [ ] A non-owner sees the current value but the control is disabled
- [ ] A failed update shows an inline error and keeps the previously-selected value

### Non-Functional

- [ ] No new RLS policy; owner-only write verified (a non-owner update is rejected by RLS)
- [ ] `settings` test suite green

### Quality

- [ ] `tsc -b`, `eslint`, `vite build` clean
- [ ] Migration reviewed; code reviewed

---

## Bolt Suggestions

| Bolt                   | Type   | Stories                                                    | Objective                                                        |
| ---------------------- | ------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 045-week-start-setting | Simple | 001-week-start-day-column, 002-settings-planning-week-card | Land the column + `/settings` card so Unit 2 has a value to read |

Single bolt — the migration and the card are small and cohesive.

---

## Notes

Model `PlanningWeekCard` on `ClaudeAiCard` (same owner-gating shape) but simpler: no vault, no
RPC, no protected column — a direct `update` on `households` is fine.
