---
stage: plan
bolt: 045-week-start-setting
created: '2026-09-04T02:03:05Z'
---

## Implementation Plan: 001-week-start-setting (bolt 045)

### Objective

Land the household-scoped `week_start_day` setting so intent 011's rollover logic (unit 2)
has one value to derive the current planning week from. One additive column + a `/settings`
card. No new RLS, no RPC.

Stories: **001-week-start-day-column** (FR-1), **002-settings-planning-week-card** (FR-2, FR-8).

### Deliverables

1. **`supabase/migrations/20260904020000_households_week_start_day.sql`** — additive:
   `alter table public.households add column if not exists week_start_day smallint not null
default 0 check (week_start_day between 0 and 6);` + a `comment on column`. No policy
   changes (households already has member-SELECT + owner-UPDATE from `20260828230000`).

2. **`src/shared/lib/database.types.ts`** — add `week_start_day: number` to `households.Row`
   and `week_start_day?: number` to `Insert` / `Update`. Marked as a manual additive edit; a
   full `supabase gen types` regen-from-prod happens at deploy (project convention — cf. the
   "regen database.types.ts from prod" commits), and will produce the same shape.

3. **`src/features/settings/api.ts`** — `+ fetchWeekStartDay(): Promise<number>` (`select
week_start_day` from `households`, `.maybeSingle()`, RLS scopes to the caller's household;
   `?? 0` fallback) and `+ updateWeekStartDay(householdId: string, weekStartDay: number):
Promise<void>` (`update({ week_start_day }).eq('id', householdId)`; owner RLS is the real
   gate).

4. **`src/features/settings/hooks.ts`** — new. `useWeekStartDay()` = `useQuery({ queryKey:
['household','week-start-day'], queryFn: fetchWeekStartDay })`. `useUpdateWeekStartDay()` =
   `useMutation` calling `updateWeekStartDay(householdId, day)`, `onSuccess` invalidates
   `['household','week-start-day']` **and** `['weekly-plan']` (so unit 2's plan queries
   re-derive the window after a mid-week change).

5. **`src/features/settings/PlanningWeekCard.tsx`** — new, modelled on `ClaudeAiCard`:
   - `useAuth().role === 'owner'` → `isOwner`; `useWeekStartDay()` for the value.
   - A `Select` (Sunday…Saturday, index === stored value) bound to the loaded value.
   - Owner: `onChange` → `useUpdateWeekStartDay().mutate(n)`; a mutation error shows an inline
     message and the `Select` falls back to the last-loaded value (controlled by the query
     data, not local state, so a failed write simply doesn't change it).
   - Non-owner: `Select` `isDisabled`, plus a line "Ask a household owner to change this."
   - Helper text: "Your dinner plan starts fresh each {weekday}." and "Changing this affects
     the current week immediately."
   - `config.isError` → "Couldn't load the planning-week setting."

6. **`src/features/settings/SettingsPage.tsx`** — mount `<PlanningWeekCard />` after
   `<ClaudeAiCard />`.

7. **`src/features/settings/PlanningWeekCard.test.tsx`** — new: owner sees the select set to
   the loaded weekday and changing it calls the update with the new index; non-owner sees a
   disabled select + the "ask an owner" line; a failed update surfaces the inline error and
   the select keeps the prior value.

### Dependencies

- `004-account-model` (complete) — `households` table + `"Household readable by its members"`
  / `"Household updatable by an owner"` policies; `useAuth` `role` + `householdId`.
- `007-claude-integration` (complete) — `/settings` route + `SettingsPage` + `ClaudeAiCard`
  as the card pattern.
- No CLI available locally (`supabase` not in PATH); the migration ships as a file and is
  applied at deploy.

### Technical Approach

Mirror `ClaudeAiCard`'s react-query-inline + `useAuth` owner-gate shape, but simpler: a plain
PostgREST `update` on `households` (no vault, no `security definer` RPC — there's no protected
column here). The `Select` is driven by query data so a failed mutation is a no-op visually.

### Acceptance Criteria

- [ ] Migration adds `week_start_day smallint not null default 0 check (0..6)` + a column
      comment; no policy change; existing rows read `0`
- [ ] `database.types.ts` types the column on Row/Insert/Update
- [ ] `fetchWeekStartDay` returns the household's value (0 fallback); `updateWeekStartDay`
      filters by `id`
- [ ] `useUpdateWeekStartDay` invalidates the settings key and `['weekly-plan']`
- [ ] Owner can pick a weekday on `/settings`; it persists (mutation called with the index);
      helper text present
- [ ] Non-owner: `Select` disabled + "ask an owner" line
- [ ] Failed update → inline error, `Select` keeps the loaded value
- [ ] `tsc -b`, `eslint`, `vite build` clean; `settings` suite green
