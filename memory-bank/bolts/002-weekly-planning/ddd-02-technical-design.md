---
stage: design
bolt: 002-weekly-planning
created: 2026-08-26T18:15:07Z
updated: 2026-08-26T18:22:19Z
---

## Technical Design: weekly-planning

**Revised 2026-08-26** — see `inception-log.md` Scope Changes. Renamed `confirmed_at` → `locked_at` throughout; locking now happens at shopping-list-copy time (a UI-unit action) instead of at initial selection, and a plan is capped at 3 selections at all times rather than only checked at confirm time.

### Architecture Pattern

Same BaaS-direct pattern as `001-dinner-catalog`: Postgres schema + triggers + RLS is the entire deliverable, plus one Postgres RPC function (`lock_weekly_plan`) for the atomic, race-safe lock action.

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Calls PostgREST + one RPC function
├─────────────────────────────┤
│  PostgREST auto-API + RPC   │  Tables exposed directly; lock_weekly_plan() as RPC
├─────────────────────────────┤
│   Triggers (invariants)     │  Max-3, exactly-3-to-lock, immutability enforcement
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies
├─────────────────────────────┤
│   Postgres schema           │  weekly_plans, weekly_plan_selections, dinner_last_chosen view
└─────────────────────────────┘
```

### API Design

- **Get/create the current draft**: `GET /rest/v1/weekly_plans?locked_at=is.null&order=created_at.desc&limit=1` / `POST /rest/v1/weekly_plans` — Response: `WeeklyPlan`
- **Add a selection**: `POST /rest/v1/weekly_plan_selections` body `{weekly_plan_id, dinner_id}` — rejected by trigger if the plan already has 3 selections or is locked
- **Remove a selection**: `DELETE /rest/v1/weekly_plan_selections?id=eq.{id}` — rejected by trigger if the plan is locked
- **Lock a plan**: `POST /rpc/lock_weekly_plan` body `{p_plan_id: uuid}` — Postgres function; atomically sets `locked_at = now()`, relying on the trigger below to enforce exactly-3. Raises a clear error if the plan doesn't exist or doesn't have exactly 3 selections; treats "already locked" as a no-op success (idempotent from the caller's perspective, per story `006-copy-shopping-list-to-clipboard`).
- **Get last-chosen dates**: `GET /rest/v1/dinner_last_chosen` — Response: `{dinner_id, last_chosen_date}[]` (view, not a table)

### Data Model

- **`weekly_plans`**: `id` (uuid, pk, default `gen_random_uuid()`), `start_date` (date, not null), `locked_at` (timestamptz, nullable), `created_at` (timestamptz, not null, default `now()`)
- **`weekly_plan_selections`**: `id` (uuid, pk, default `gen_random_uuid()`), `weekly_plan_id` (uuid, not null, `REFERENCES weekly_plans(id) ON DELETE CASCADE`), `dinner_id` (uuid, not null, `REFERENCES dinners(id)`) — `UNIQUE (weekly_plan_id, dinner_id)`: prevents picking the same dinner twice within one plan.
- **`dinner_last_chosen`** (view, `WITH (security_invoker = true)`): `dinner_id`, `last_chosen_date` — left join from `dinners` through `weekly_plan_selections`/`weekly_plans` where `locked_at IS NOT NULL`, grouped by dinner (null date = never chosen).

**Trigger functions**:

1. `fn_weekly_plan_selections_guard()` — `BEFORE INSERT OR UPDATE OR DELETE ON weekly_plan_selections FOR EACH ROW`:
   - Looks up the relevant plan's `locked_at` (via `NEW.weekly_plan_id` for INSERT/UPDATE, `OLD.weekly_plan_id` for DELETE). If locked, raise an exception regardless of operation.
   - On INSERT specifically: if the plan already has 3 selections, raise an exception ("remove one before adding another").
2. `fn_weekly_plans_block_edit_after_lock()` — `BEFORE UPDATE ON weekly_plans FOR EACH ROW WHEN (OLD.locked_at IS NOT NULL)` → raises an exception unconditionally. Blocks any further change to a locked plan, including re-locking.
3. `fn_weekly_plans_require_three_on_lock()` — `BEFORE UPDATE ON weekly_plans FOR EACH ROW WHEN (OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL)` → counts rows in `weekly_plan_selections` for `NEW.id`; raises an exception if the count isn't exactly 3.

Together these implement every acceptance criterion in the revised story `002-enforce-exactly-three-immutable`, including the race-condition edge case: Postgres's row-level lock during a `weekly_plans` `UPDATE` serializes concurrent lock attempts, so a second concurrent lock sees `locked_at` already set and is rejected by trigger 2 — which `lock_weekly_plan` (below) treats as "already locked, fine."

**`lock_weekly_plan(p_plan_id uuid)` function** (SQL, `SECURITY INVOKER` — the default):
```sql
create or replace function public.lock_weekly_plan(p_plan_id uuid)
returns public.weekly_plans
language plpgsql
as $$
declare
  v_plan public.weekly_plans;
begin
  select * into v_plan from public.weekly_plans where id = p_plan_id;

  if v_plan is null then
    raise exception 'weekly plan % not found', p_plan_id;
  end if;

  if v_plan.locked_at is not null then
    return v_plan; -- already locked: treat as a no-op success, not an error
  end if;

  update public.weekly_plans
  set locked_at = now()
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;
```

### Security Design

- **RLS**: Enabled on `weekly_plans` and `weekly_plan_selections`, same shape as `001-dinner-catalog` — authenticated-household-only, no per-user rows.
- **`lock_weekly_plan`**: runs `SECURITY INVOKER` — subject to the caller's RLS grants, no privilege escalation.
- **View security**: `dinner_last_chosen` is `WITH (security_invoker = true)`.

### NFR Implementation

- **Performance**: Trivial data volume — no indexing beyond the FKs/unique constraint needed at this scale.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults.

### Integrations

- **Depends on `001-dinner-catalog`**: `weekly_plan_selections.dinner_id` references `dinners.id`, already live in the "dinner ideas" Supabase project.
- **Migration will be applied** the same way as bolt 001 — via `supabase db push` against the linked project.
