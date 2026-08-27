---
stage: design
bolt: 010-weekly-planning
created: 2026-08-27T05:25:00Z
---

## Technical Design: weekly-planning (follow-up: meal history)

### Architecture Pattern

Same BaaS-direct pattern as `002-weekly-planning`: Postgres schema + RLS + a trigger for the state-transition write. **Revised during Stage 3 (ADR Analysis)** — see `adr-002-history-writes-belong-in-triggers.md`: the `meal_history` write moved from inside `lock_weekly_plan`'s function body to an `AFTER UPDATE` trigger on `weekly_plans`, so it fires on the `locked_at` transition regardless of which path causes it (the RPC, or a hypothetical direct client `PATCH` — RLS permits authenticated updates to `weekly_plans` directly, not just through the RPC).

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Reads meal_history via PostgREST; lock_weekly_plan unchanged from caller's view
├─────────────────────────────┤
│  PostgREST auto-API + RPC   │  meal_history table exposed; lock_weekly_plan() unchanged
├─────────────────────────────┤
│   Trigger (new)             │  Writes meal_history on the locked_at transition, any caller
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies (same shape as sibling tables)
├─────────────────────────────┤
│   Postgres schema           │  meal_history (new)
└─────────────────────────────┘
```

### API Design

No hand-written API — PostgREST auto-exposes the new table, and no client-facing call changes at all:

- **Get a specific week's history**: `GET /rest/v1/meal_history?week_start_date=eq.{date}&select=*,dinners(*)` — Response: 3 rows (or 0, if that week was never locked), each with its dinner embedded.
- **Get history ordered for week-by-week navigation**: `GET /rest/v1/meal_history?select=week_start_date&order=week_start_date.desc` (distinct weeks, driven client-side) — used by `013-week-navigation-view`'s "get week by offset" query, built on top of `weekly_plans` (for the plan itself) plus this table (for eaten-status/history).
- **Lock a plan (fully unchanged)**: `POST /rpc/lock_weekly_plan` body `{p_plan_id: uuid}` — identical call, identical function body, to the version in `002-weekly-planning`/`20260827002830_weekly_planning_concurrency_fixes.sql`. `meal_history` is now written by a trigger on the same `UPDATE` this RPC already performs, not by the RPC itself.

### Data Model

- **`meal_history`** (new): `id` (uuid, pk, default `gen_random_uuid()`), `weekly_plan_id` (uuid, not null, `REFERENCES weekly_plans(id) ON DELETE CASCADE`), `dinner_id` (uuid, not null, `REFERENCES dinners(id)`), `week_start_date` (date, not null) — `UNIQUE (weekly_plan_id, dinner_id)` (mirrors `weekly_plan_selections`'s own uniqueness, and makes the insert idempotent — see below).

**Indexes**:

- `idx_meal_history_week_start_date` on `meal_history(week_start_date)` — supports the "get week by offset" query's ordering/filtering.
- `idx_meal_history_dinner_id` on `meal_history(dinner_id)` — future-proofing if FR-4's variety query migrates to reading this table instead of `weekly_plan_selections` directly (not required by this bolt).

### `meal_history` write trigger (SQL) — supersedes the RPC-embedded approach from Stage 2

**`lock_weekly_plan` itself is untouched** — no `CREATE OR REPLACE` needed for it in this bolt. Instead:

```sql
create or replace function public.fn_weekly_plans_record_meal_history()
returns trigger
language plpgsql
as $$
begin
  insert into public.meal_history (weekly_plan_id, dinner_id, week_start_date)
  select new.id, wps.dinner_id, new.start_date
  from public.weekly_plan_selections wps
  where wps.weekly_plan_id = new.id
  on conflict (weekly_plan_id, dinner_id) do nothing;

  return new;
end;
$$;

create trigger trg_weekly_plans_record_meal_history
  after update on public.weekly_plans
  for each row
  when (old.locked_at is null and new.locked_at is not null)
  execute function public.fn_weekly_plans_record_meal_history();
```

- **`AFTER UPDATE ... WHEN (OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL)`** — the exact same transition guard as the existing `trg_weekly_plans_require_three_on_lock`, so this fires on _any_ path that locks a plan, not just calls through `lock_weekly_plan`.
- **Ordering**: Postgres fires `BEFORE` triggers before the row change, `AFTER` triggers after — `trg_weekly_plans_require_three_on_lock` (`BEFORE UPDATE`) still runs first and guarantees exactly 3 rows exist in `weekly_plan_selections` before this `AFTER UPDATE` trigger reads them.
- **Same transaction**: this trigger fires within the same transaction as the triggering `UPDATE` (whether that update came from `lock_weekly_plan`'s `FOR UPDATE`-guarded statement, or — hypothetically — a direct client `PATCH`), so a plan can never end up locked without its history also being written; if the insert failed, the whole transaction (including the lock itself) would roll back.
- **`ON CONFLICT DO NOTHING`**: kept as defensive idempotency even though the transition guard (`OLD.locked_at IS NULL`) already prevents this trigger from re-firing on an already-locked plan.

### Security Design

- **RLS**: Enabled on `meal_history`, same shape as sibling tables — authenticated-household-only.
- **`lock_weekly_plan`**: unchanged security posture (`SECURITY INVOKER`, the default) — writing to `meal_history` from inside the function is subject to the same RLS policies as any other write the caller could make directly.

### NFR Implementation

- **Performance**: Trivial volume (3 rows per locked week) — indexes are future-proofing, not a functional requirement at this scale.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults; the insert failing would roll back the whole `lock_weekly_plan` transaction (a plan can never end up locked with zero history rows).

### Integrations

- **Migration**: A new, additive SQL migration — creates `meal_history` and the new trigger/trigger-function. Does not edit or replace anything in `20260826192038_weekly_planning_schema.sql` or `20260827002830_weekly_planning_concurrency_fixes.sql` — `lock_weekly_plan` is untouched.
- **Migration applied**: same pattern as prior bolts — `supabase db push` against the linked "dinner ideas" project.
