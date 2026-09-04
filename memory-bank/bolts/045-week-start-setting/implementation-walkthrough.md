---
stage: implement
bolt: 045-week-start-setting
created: '2026-09-04T02:08:00Z'
---

## Implementation Walkthrough: 001-week-start-setting (bolt 045)

### Summary

Added `households.week_start_day` (one additive migration, no new RLS) and a "Planning week"
card on `/settings` where an owner picks the weekday their dinner plan starts on. A small
`settings/hooks.ts` exposes the read + owner write; the write invalidates `['weekly-plan']`
so unit 2's surfaces re-derive the window after a mid-week change.

### Structure Overview

The setting rides existing `households` RLS (member-SELECT, owner-UPDATE) — no RPC, unlike
the AI config. `PlanningWeekCard` mirrors `ClaudeAiCard`'s shape (react-query inline,
`useAuth().role` UI gate) but the `Select` is driven purely by query data, so a failed write
never desyncs what the user sees.

### Completed Work

- [x] `supabase/migrations/20260904020000_households_week_start_day.sql` — `add column if not
    exists week_start_day smallint not null default 0 check (between 0 and 6)` + a column
      comment. No policy changes.
- [x] `src/shared/lib/database.types.ts` — `week_start_day: number` on `households` Row;
      `week_start_day?: number` on Insert/Update. Manual additive edit; a full
      `supabase gen types` regen-from-prod at deploy produces the same shape (project
      convention).
- [x] `src/features/settings/api.ts` — `fetchWeekStartDay()` (`select week_start_day` /
      `maybeSingle`, `?? 0`), `updateWeekStartDay(householdId, weekStartDay)` (plain
      `update().eq('id', …)`, owner RLS is the gate).
- [x] `src/features/settings/hooks.ts` — new. `useWeekStartDay()`; `useUpdateWeekStartDay
    (householdId)` invalidating `['household','week-start-day']` and `['weekly-plan']`.
- [x] `src/features/settings/PlanningWeekCard.tsx` — new. Weekday `Select` (Sunday…Saturday,
      index = stored value), disabled for non-owners / while loading / while saving; helper
      text "Your dinner plan starts fresh each {weekday}. Changing this affects the current
      week immediately."; inline load error and save error; "Ask a household owner to change
      this." for members.
- [x] `src/features/settings/SettingsPage.tsx` — mounts `<PlanningWeekCard />` after
      `<ClaudeAiCard />`.
- [x] `src/features/settings/PlanningWeekCard.test.tsx` — new (4 tests): owner sees the loaded
      weekday and a change calls `updateWeekStartDay('hh-1', n)`; non-owner control disabled +
      "ask an owner" line; a rejected save shows the inline error and the `Select` keeps the
      loaded value; a failed load query shows the load error.

### Key Decisions

- **Plain PostgREST update, no RPC** — `week_start_day` is not a protected column (contrast
  `household_ai_config.key_secret_id`), so the existing owner-UPDATE policy is sufficient.
- **`Select` bound to query data, not local state** — a failed mutation is a visual no-op; no
  optimistic rollback logic needed.
- **Hook lives in `settings/`** — it is a household setting; unit 2's `weekly-plan` code will
  import `useWeekStartDay` from here (weekly-plan is already a non-leaf feature).
- **`database.types.ts` hand-edited** — no local `supabase` CLI; the migration ships as a
  file and the authoritative regen happens at deploy, matching prior intents.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- The migration is forward-only and `add column if not exists`-guarded for dev re-runs.
- `useUpdateWeekStartDay` takes `householdId` as an argument (from `useAuth`) rather than
  resolving it itself, keeping the hook pure and easy to test.
- Unit 2 (bolt 046) will gate `useCurrentPlan` on `useWeekStartDay().data` being loaded.
