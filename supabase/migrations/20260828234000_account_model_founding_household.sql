-- Account Model: founding-household cutover + set NOT NULL + category PK promotion
-- (intent 004-account-model, unit 001-household-data-model)
-- Story: 008-founding-household-migration
-- Bolt: 030-household-data-model
-- See memory-bank/bolts/030-household-data-model/ddd-02-technical-design.md and
-- adr-003-one-founding-household-model-cutover.md.
--
-- RUNS AGAINST REAL PRODUCTION DATA. One-shot forward migration. Folds every existing pre-intent
-- row into a single founding household owned by garrett.peter.conn@gmail.com, then flips every
-- direct household_id column to NOT NULL and promotes category_row_assignments to a composite PK.
--
-- Founding-owner resolution (ADR-3):
--   * the designated email exists in auth.users            -> use it (the production path)
--   * other auth.users rows exist but not that email        -> RAISE and abort (never guess an owner)
--   * auth.users is completely empty (fresh local dev / CI) -> bootstrap a synthetic founding user
--     so `supabase db reset` / `supabase test db` can run. Production never takes this branch.
--
-- Idempotent for dev/CI: the `do` block skips if the founding household (fixed UUID) already
-- exists; the ALTERs are naturally idempotent. Must ship in the same push as bolts 026-029.
--
-- ROLLBACK (emergency only — DATA IS RETAINED, only the household linkage is removed):
--   alter table public.dinners                  alter column household_id drop not null;
--   alter table public.tags                     alter column household_id drop not null;
--   alter table public.grocery_store_rows       alter column household_id drop not null;
--   alter table public.category_row_assignments alter column household_id drop not null;
--   alter table public.weekly_plans             alter column household_id drop not null;
--   alter table public.meal_history             alter column household_id drop not null;
--   alter table public.category_row_assignments drop constraint category_row_assignments_pkey;
--   alter table public.category_row_assignments
--     add constraint category_row_assignments_household_id_category_key
--     unique nulls not distinct (household_id, category);
--   update public.dinners set household_id = null where household_id = '00000000-0000-4000-8000-000000000001';
--   ... (repeat for tags / grocery_store_rows / category_row_assignments / weekly_plans / meal_history) ...
--   delete from public.household_members where household_id = '00000000-0000-4000-8000-000000000001';
--   delete from public.households        where id           = '00000000-0000-4000-8000-000000000001';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Create the founding household + owner, backfill household_id everywhere
-- ═══════════════════════════════════════════════════════════════════════════════
do $founding$
declare
  v_household_id constant uuid := '00000000-0000-4000-8000-000000000001';
  v_synthetic_user constant uuid := '00000000-0000-4000-8000-0000000000f0';
  v_user_id uuid;
begin
  if exists (select 1 from public.households where id = v_household_id) then
    raise notice 'founding household % already present — skipping cutover', v_household_id;
    return;
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = 'garrett.peter.conn@gmail.com'
  order by created_at asc
  limit 1;

  if v_user_id is null then
    if exists (select 1 from auth.users) then
      raise exception
        'founding user garrett.peter.conn@gmail.com not found in auth.users (% other user(s) present) — aborting; create that user and re-run',
        (select count(*) from auth.users);
    end if;

    -- Fresh environment only: no auth users at all. Bootstrap one so the migration + tests run.
    -- app.provisioning_disabled tells handle_new_user() (migration 20260828233000) to no-op for
    -- this insert, so the synthetic user is provisioned by the founding logic below (fixed-UUID
    -- household + backfill), not by the trigger's fresh-household + seed path. `set local` is
    -- transaction-scoped and needs no special privilege (unlike ALTER TABLE ... DISABLE TRIGGER,
    -- which requires ownership of auth.users).
    set local app.provisioning_disabled = 'on';
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_synthetic_user, 'authenticated',
            'authenticated', 'garrett.peter.conn@gmail.com',
            -- not a real hash; this user never authenticates by password (tests set JWT claims).
            'local-dev-placeholder-not-a-real-credential',
            now(), now(), now());
    set local app.provisioning_disabled = 'off';
    v_user_id := v_synthetic_user;
    raise notice 'auth.users empty — bootstrapped synthetic founding user % (local/CI only)', v_user_id;
  end if;

  insert into public.households (id, name)
  values (v_household_id, 'Conn household');

  insert into public.profiles (id, display_name)
  values (v_user_id, null)
  on conflict (id) do nothing;

  insert into public.household_members (household_id, profile_id, role)
  values (v_household_id, v_user_id, 'owner')
  on conflict (profile_id) do nothing;

  update public.dinners                  set household_id = v_household_id where household_id is null;
  update public.tags                     set household_id = v_household_id where household_id is null;
  update public.grocery_store_rows       set household_id = v_household_id where household_id is null;
  update public.category_row_assignments set household_id = v_household_id where household_id is null;
  update public.weekly_plans             set household_id = v_household_id where household_id is null;
  update public.meal_history             set household_id = v_household_id where household_id is null;

  raise notice 'founding household % created, owner %, data backfilled', v_household_id, v_user_id;
end;
$founding$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Every direct household_id column is now populated → make it NOT NULL
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.dinners                  alter column household_id set not null;
alter table public.tags                     alter column household_id set not null;
alter table public.grocery_store_rows       alter column household_id set not null;
alter table public.category_row_assignments alter column household_id set not null;
alter table public.weekly_plans             alter column household_id set not null;
alter table public.meal_history             alter column household_id set not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Promote category_row_assignments' interim unique (bolt 027) to the real PK.
--    (household_id, category) is also the conflict target used by the frontend
--    assignCategory upsert from bolt 031.
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.category_row_assignments
  drop constraint if exists category_row_assignments_household_id_category_key;
alter table public.category_row_assignments
  add constraint category_row_assignments_pkey primary key (household_id, category);

-- The bolt-027 helper index on (household_id) is now redundant with the PK's leading column.
drop index if exists public.idx_category_row_assignments_household_id;

comment on table public.households is
  'The sharing boundary. Exactly one row in production after the founding cutover '
  '(migration 20260828234000); new signups create their own via handle_new_user().';
