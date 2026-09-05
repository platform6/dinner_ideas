-- Item review state — "has anyone looked at where this sits?"
-- (intent 013-placement-edit-control, unit 001-placement-review-state, bolt 055)
-- Stories: 001-reviewed-at-column-and-backfill, 002-review-write-path
-- See memory-bank/bolts/055-placement-review-state/ddd-02-technical-design.md
--     and adr-010-narrow-write-to-a-trigger-owned-table.md.
--
-- WHY THIS EXISTS: intent 010 shipped placement but no way to tell an item whose stop is
-- genuinely right from one that merely inherited a stop and was never checked. Every item
-- resolves as `inherited` (dinner_ingredients.category is NOT NULL over five values and the
-- cutover placed all five), so `unassigned` is reachable only for registry orphans and cannot
-- serve as "needs attention". `reviewed_at` is the state that can.
--
-- ROLLBACK:
--   drop function if exists public.mark_item_reviewed(uuid);
--   alter table public.items drop column if exists reviewed_at;
--   -- then re-run 20260904180000's `create or replace view public.item_location_resolution`
--   -- to drop the projected column (a view cannot lose a column via CREATE OR REPLACE).

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 1. The column
-- ═══════════════════════════════════════════════════════════════════════════════
-- Nullable with NO default, deliberately: a row inserted by trg_dinner_ingredients_sync_item
-- must arrive with reviewed_at null so it lands in the review queue. A default would defeat the
-- feature, and giving the trigger the job of setting it would put a second responsibility in
-- the function ADR-7 keeps single-purpose.
alter table public.items add column if not exists reviewed_at timestamptz;

comment on column public.items.reviewed_at is
  'When a household member last confirmed or corrected where this item sits. NULL = unreviewed, '
  'i.e. nobody has looked yet — it does NOT mean unplaced, and it is not an error state. New '
  'items arrive NULL from trg_dinner_ingredients_sync_item because this column has no default. '
  'Set only via mark_item_reviewed() (ADR-10); items carries no application write grant.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 2. Backfill everything that already exists
-- ═══════════════════════════════════════════════════════════════════════════════
-- Nobody has had the means to review anything, so "reviewed" here means "predates the feature".
-- The alternative — every existing item in the queue on day one — teaches the user to ignore
-- the queue before it has ever been useful.
--
-- ON THE CONCURRENCY: this statement sees only rows committed before its own snapshot. An item
-- registered by the sync trigger in a transaction that commits AFTER it is invisible here and
-- stays NULL, which is the desired outcome and comes from READ COMMITTED, not from any
-- bookkeeping on our part. An item committed BEFORE it is indistinguishable from a genuinely
-- pre-existing row by any means the database has, so no "snapshot the ids first" bound would
-- classify it better — such a bound only moves the same window earlier. Residual, accepted: an
-- ingredient saved during the seconds this migration applies may be marked reviewed and skip
-- the queue once. Cost: one grocery never asked about.
--
-- The predicate earns its place for a different reason — idempotency. `supabase db reset` and
-- any re-application become no-ops instead of re-stamping every row with a fresh timestamp.
update public.items set reviewed_at = now() where reviewed_at is null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 3. The one door onto the column (ADR-10)
-- ═══════════════════════════════════════════════════════════════════════════════
-- items has NO application INSERT/UPDATE/DELETE grant — 20260904180000 line 469 revokes them,
-- so that the sync trigger is the sole writer and grocery identity has one spelling rule
-- (ADR-7). A column-scoped `grant update (reviewed_at)` would work today but would rest the
-- invariant on a privilege being ABSENT, which a later `grant all on all tables in schema
-- public` would silently undo with nothing failing. A function is a thing that exists.
--
-- security definer, therefore: with no UPDATE privilege there is nothing for an RLS policy to
-- filter, so a security-invoker function could not write at all. Because it bypasses RLS, the
-- household check below is this function's own responsibility — forgetting it would be a
-- cross-household write, not a refused one. That is what mark_item_reviewed's pgTAP case tests.
create or replace function public.mark_item_reviewed(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
begin
  if v_household is null then
    raise exception 'no household for caller' using errcode = '42501';
  end if;

  -- Scoped by household, so an id belonging to someone else simply matches nothing.
  -- No row count check and no raise on zero rows: a missing or foreign id returns normally,
  -- so the caller learns nothing about whether that id exists in another household. Callers
  -- do not need to distinguish "marked" from "not yours".
  --
  -- No `and reviewed_at is null` guard either. Re-marking is defined as legal (INV-3) so every
  -- entry point — accept, move, place — can call this unconditionally without branching.
  update public.items
     set reviewed_at = now()
   where id = p_item_id
     and household_id = v_household;
end;
$$;

comment on function public.mark_item_reviewed(uuid) is
  'Marks one item reviewed for the caller''s household — "I have looked at where this sits". '
  'The ONLY application write path to public.items, which otherwise carries no write grant '
  '(ADR-7, ADR-10). Idempotent; a foreign or missing id affects zero rows and returns normally. '
  'Resolves the household server-side; the client passes no household id.';

revoke execute on function public.mark_item_reviewed(uuid) from public, anon;
grant  execute on function public.mark_item_reviewed(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 4. Project reviewed_at through the resolution view
-- ═══════════════════════════════════════════════════════════════════════════════
-- Unit 002's review queue and its all-groceries list read the same rows this view already
-- serves; a second query keyed by item id would only have to be joined back client-side.
--
-- CREATE OR REPLACE can APPEND a column but cannot reorder or drop one, so the body below is
-- 20260904180000's verbatim with `i.reviewed_at` added last. Resolution logic is untouched —
-- if this diverges from the original in any other respect, that is a bug, not an improvement.
create or replace view public.item_location_resolution
with (security_invoker = true) as
with item_category as (
  -- An Item has no category of its own — it is derived from the dinner_ingredients rows that
  -- produced it, which can disagree across dinners. Resolved (bolt 050, stage 2): the MODAL
  -- category, ties broken alphabetically.
  select
    i.id        as item_id,
    di.category as category,
    row_number() over (
      partition by i.id
      order by count(*) desc, di.category asc
    ) as rn
  from public.items i
  join public.dinners d
    on d.household_id = i.household_id
  join public.dinner_ingredients di
    on di.dinner_id = d.id
   and lower(btrim(di.name)) = i.name_key
  group by i.id, di.category
)
select
  i.household_id,
  s.id        as store_id,
  i.id        as item_id,
  i.name      as item_name,
  i.name_key,
  ic.category as item_category,
  coalesce(ip.location_id, cp.location_id) as location_id,
  case
    when ip.location_id is not null then 'placed'
    when cp.location_id is not null then 'inherited'
    else 'unassigned'
  end as state,
  case
    when ip.location_id is null and cp.location_id is not null then cp.category
  end as via_category,
  l.name     as location_name,
  l.type     as location_type,
  l.position as location_position,
  i.reviewed_at
from public.items i
join public.stores s
  on s.household_id = i.household_id
left join item_category ic
  on ic.item_id = i.id and ic.rn = 1
left join public.item_placements ip
  on ip.item_id = i.id and ip.store_id = s.id
left join public.category_placements cp
  on cp.store_id = s.id and cp.category = ic.category
left join public.locations l
  on l.id = coalesce(ip.location_id, cp.location_id);
