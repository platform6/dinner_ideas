-- Plan uniqueness scoped to the planning week
-- (intent 017-plan-rollover-remediation, unit 001-plan-uniqueness-scope, bolt 067)
-- Story: 001-scope-index-to-week. See adr-011-scope-a-stale-invariant-rather-than-remove-it.md.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
-- Production outage 2026-09-08: picking a dinner failed with
--   23505: duplicate key value violates unique constraint "idx_weekly_plans_one_unlocked"
--
-- The index enforced "at most one draft plan per household, across all time". That was written
-- (bolt 027) when a plan had no week identity — "the current plan" meant the most recently
-- created one, so "one draft per household" and "one draft per household per week" described the
-- same states. Intent 011 gave plans a real planning week (`start_date`) and began looking them
-- up by it; from then the two readings diverged and the stored rule kept enforcing the older one.
-- Intent 012 made locking deliberate, so drafts began outliving their weeks. The first rollover
-- with an unfinished draft hit the divergence.
--
-- This RESCOPES the rule. It does not remove it: bolt 027 added the index because two concurrent
-- createPlan calls could each see "no plan yet" and both succeed, orphaning one user's picks.
-- Scoped to the week, that collision still happens exactly where it is wanted.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SAFETY
-- ─────────────────────────────────────────────────────────────────────────────
-- Widening only. Adding a column to a unique key can only permit MORE combinations, never fewer,
-- so every existing row satisfies the new index by construction. No data audit, no rehearsal and
-- no staging environment are required for this to apply.
--
-- `nulls not distinct` is preserved deliberately: intent 004's null-household window (bolts
-- 027→030) relies on it. `start_date` is NOT NULL, so the clause continues to affect only
-- `household_id`, exactly as before.
--
-- `drop` + `create` rather than `create ... if not exists`: the index already exists under this
-- name with a DIFFERENT definition, so a conditional create would silently no-op and leave the
-- bug in place while reporting success. Not `concurrently` — that cannot run inside a transaction
-- and this table holds single-digit rows, so the lock is momentary.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK — NOT the inverse of the forward path. Read before rolling back.
-- ─────────────────────────────────────────────────────────────────────────────
--   drop index if exists public.idx_weekly_plans_one_unlocked;
--   create unique index idx_weekly_plans_one_unlocked
--     on public.weekly_plans (household_id) nulls not distinct
--     where locked_at is null;
--
-- That is a NARROWING change and WILL FAIL if any household holds drafts for two different weeks
-- — which is precisely the state this migration exists to permit. Before rolling back, find and
-- resolve them:
--
--   select household_id, count(*), array_agg(start_date order by start_date)
--   from public.weekly_plans where locked_at is null
--   group by household_id having count(*) > 1;
--
-- Resolve each by locking the intended plan (`select lock_weekly_plan(id)`) or deleting the
-- abandoned one, then recreate the single-column index.

drop index if exists public.idx_weekly_plans_one_unlocked;

create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id, start_date) nulls not distinct
  where locked_at is null;

comment on index public.idx_weekly_plans_one_unlocked is
  'At most one unlocked (draft) weekly plan per household PER PLANNING WEEK. Locked plans are '
  'historical and exempt, so a week that already has a locked plan may still be re-planned. '
  'Scoped to (household_id, start_date) by intent 017 after the household-wide version blocked '
  'creating a new week''s plan while an earlier draft was still unlocked (ADR-11). '
  '`nulls not distinct` retained for intent 004''s null-household window.';
