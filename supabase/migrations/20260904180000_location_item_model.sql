-- Location/Item Model — Store → Location → Item placement schema
-- (intent 010-grocery-store-location-model, unit 001-location-item-model, bolt 050)
-- Stories: 001-stores-and-locations-schema, 002-items-registry-and-sync-trigger,
--          003-item-and-category-placements, 004-location-resolution-query,
--          005-suggestion-dismissals, 006-reorder-location-rpc
-- See memory-bank/bolts/050-location-item-model/ddd-02-technical-design.md,
--     adr-007-items-registry-derived-entity.md, adr-008-composite-fks-for-containment.md.
--
-- Creates 5 tables + 1 trigger + 1 view + 1 RPC. Purely additive: `grocery_store_rows` and
-- `category_row_assignments` are untouched and keep working — the two models coexist until
-- bolt 051 carries the data across and retires the old one. `dinner_ingredients` gains a
-- trigger but no column, index, or constraint change.
--
-- Composite FKs (ADR-8) carry the scope column inside the reference, so a placement can never
-- name another store's location or another household's item. That is why `stores`, `locations`
-- and `items` each carry a `unique (id, <scope>)` constraint that looks redundant with their
-- primary key — each is a foreign-key target, and dropping one breaks the FKs that depend on it.
--
-- ROLLBACK (reverse order): drop view public.item_location_resolution; drop function
-- public.reorder_location(uuid, integer); drop trigger trg_dinner_ingredients_sync_item on
-- public.dinner_ingredients; drop function public.fn_dinner_ingredients_sync_item(); drop tables
-- public.suggestion_dismissals, public.category_placements, public.item_placements,
-- public.items, public.locations, public.stores (policies and indexes drop with them).
-- Nothing pre-existing is modified, so rollback restores the prior state exactly.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. stores (story 001, FR-1)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stores_id_household_id_key unique (id, household_id)
);

-- At most one ACTIVE store per household. Partial, so v2 can keep inactive stores around.
create unique index if not exists stores_one_active_per_household
  on public.stores (household_id) where is_active;

create index if not exists idx_stores_household_id on public.stores (household_id);

comment on table public.stores is
  'A household''s independent walking-path configuration. v1 ships exactly one active store per '
  'household; the multi-store schema lands now so v2 is UI-only (FR-1). Rows are seeded by the '
  'cutover migration (bolt 051), not by this one.';
comment on constraint stores_id_household_id_key on public.stores is
  'Not redundant with the primary key: it is the composite FK target that lets child tables '
  'carry a household_id proven to match this store''s (ADR-8).';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. locations (story 001, FR-2)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  store_id uuid not null,
  name text not null,
  type text not null check (type in ('section', 'aisle')),
  position integer not null,
  created_at timestamptz not null default now(),
  constraint locations_store_id_household_id_fkey
    foreign key (store_id, household_id)
    references public.stores (id, household_id) on delete cascade,
  constraint locations_id_store_id_key unique (id, store_id),
  constraint locations_store_id_position_key
    unique (store_id, position) deferrable initially deferred
);

create index if not exists idx_locations_store_id_household_id
  on public.locations (store_id, household_id);

comment on table public.locations is
  'A stop on one store''s walking path — the successor to grocery_store_rows. Sections and aisles '
  'are peers in a SINGLE ordered sequence per store (order by position); `type` drives display '
  'only and is never derived from `name` (FR-2). A name with no parseable number is valid.';
comment on constraint locations_store_id_position_key on public.locations is
  'DEFERRABLE INITIALLY DEFERRED, deliberately unlike grocery_store_rows_household_id_position_key. '
  'A bulk range shift (set position = position +/- 1) transiently collides under a non-deferrable '
  'constraint because Postgres checks uniqueness per row: shifting UP, the row at N moves to N+1 '
  'while N+1 still holds its old value. Deferring the check to commit is what makes '
  'reorder_location() correct for a move of ANY distance. See that function''s comment.';
comment on constraint locations_id_store_id_key on public.locations is
  'Composite FK target for item_placements / category_placements — this is what makes placing an '
  'item in another store''s location unwritable rather than merely unwritten (ADR-8).';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. items — the ingredient-name registry (story 002, FR-3, ADR-7)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  name_key text generated always as (lower(btrim(name))) stored,
  created_at timestamptz not null default now(),
  constraint items_household_id_name_key_key unique (household_id, name_key),
  constraint items_id_household_id_key unique (id, household_id)
);

comment on table public.items is
  'Deduped, household-scoped registry of ingredient names — the stable identity dinner_ingredients '
  'never had (FR-3). DERIVED state: rows appear only via trg_dinner_ingredients_sync_item, never '
  'from client code. Nothing prunes it; a renamed ingredient leaves its old Item in place because '
  'that Item may still carry a placement the user made (ADR-7).';
comment on column public.items.name_key is
  'The registry''s identity: lower(btrim(name)), stored so it is visible in \d items and usable '
  'directly as an ON CONFLICT target. Dedup is deliberately EXACT — the fuzzy similarity match '
  '(FR-7) is a suggestion layer above this, never the structural key (ADR-7).';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. item_placements — explicit placement (story 003, FR-4)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.item_placements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  store_id uuid not null,
  item_id uuid not null,
  location_id uuid not null,
  created_at timestamptz not null default now(),
  constraint item_placements_item_id_store_id_key unique (item_id, store_id),
  constraint item_placements_location_id_store_id_fkey
    foreign key (location_id, store_id)
    references public.locations (id, store_id) on delete cascade,
  constraint item_placements_store_id_household_id_fkey
    foreign key (store_id, household_id)
    references public.stores (id, household_id) on delete cascade,
  constraint item_placements_item_id_household_id_fkey
    foreign key (item_id, household_id)
    references public.items (id, household_id) on delete cascade
);

create index if not exists idx_item_placements_location_id_store_id
  on public.item_placements (location_id, store_id);
create index if not exists idx_item_placements_store_id_household_id
  on public.item_placements (store_id, household_id);
create index if not exists idx_item_placements_item_id_household_id
  on public.item_placements (item_id, household_id);

comment on table public.item_placements is
  'An item''s EXPLICIT location in one store — a decision the user made (FR-4). "Not placed" is the '
  'ABSENCE of a row, never a row with a null location_id (Resolved Decision 3), which keeps the '
  'resolution chain an existence check rather than a null check.';
comment on constraint item_placements_location_id_store_id_fkey on public.item_placements is
  'Does two jobs, which is why there is deliberately NO separate location_id -> locations(id) FK: '
  'it makes a cross-store placement unwritable (ADR-8) AND delivers the required cascade when a '
  'location is deleted. A single-column FK alongside it would be strictly redundant.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. category_placements — inherited fallback (story 003, FR-5)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.category_placements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  store_id uuid not null,
  category text not null check (category in ('Produce', 'Protein', 'Dairy', 'Grains', 'Pantry')),
  location_id uuid not null,
  created_at timestamptz not null default now(),
  constraint category_placements_store_id_category_key unique (store_id, category),
  constraint category_placements_location_id_store_id_fkey
    foreign key (location_id, store_id)
    references public.locations (id, store_id) on delete cascade,
  constraint category_placements_store_id_household_id_fkey
    foreign key (store_id, household_id)
    references public.stores (id, household_id) on delete cascade
);

create index if not exists idx_category_placements_location_id_store_id
  on public.category_placements (location_id, store_id);
create index if not exists idx_category_placements_store_id_household_id
  on public.category_placements (store_id, household_id);

comment on table public.category_placements is
  'A category''s default location — the INHERITED fallback every item gets with zero per-item work '
  '(FR-5). Migrated 1:1 from category_row_assignments by bolt 051.';
comment on column public.category_placements.category is
  'Mirrors dinner_ingredients.category''s CHECK, not merely its "free-text set": inheritance is '
  'exact string equality against that column, so an unconstrained value here (a typo, or '
  '"produce" lowercased) would create a placement row that can never match anything. No enum and '
  'no categories table — neither exists. Adding a category means updating both CHECKs.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. suggestion_dismissals (story 005, FR-8)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.suggestion_dismissals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  store_id uuid not null,
  item_id uuid not null,
  suggested_item_id uuid not null,
  created_at timestamptz not null default now(),
  constraint suggestion_dismissals_not_self check (item_id <> suggested_item_id),
  constraint suggestion_dismissals_store_item_suggested_key
    unique (store_id, item_id, suggested_item_id),
  constraint suggestion_dismissals_store_id_household_id_fkey
    foreign key (store_id, household_id)
    references public.stores (id, household_id) on delete cascade,
  constraint suggestion_dismissals_item_id_household_id_fkey
    foreign key (item_id, household_id)
    references public.items (id, household_id) on delete cascade,
  constraint suggestion_dismissals_suggested_item_id_household_id_fkey
    foreign key (suggested_item_id, household_id)
    references public.items (id, household_id) on delete cascade
);

create index if not exists idx_suggestion_dismissals_store_id_household_id
  on public.suggestion_dismissals (store_id, household_id);
create index if not exists idx_suggestion_dismissals_item_id_household_id
  on public.suggestion_dismissals (item_id, household_id);
create index if not exists idx_suggestion_dismissals_suggested_item_id_household_id
  on public.suggestion_dismissals (suggested_item_id, household_id);

comment on table public.suggestion_dismissals is
  'A remembered "no" — this exact pairing was rejected in this store and must not be suggested '
  'again (FR-8). Shaped so unit 002''s exclusion is a plain anti-join. Directional: dismissing '
  'A->B says nothing about B->A. A repeat dismissal is a no-op via ON CONFLICT DO NOTHING.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Registry sync trigger (story 002, FR-3, ADR-7)
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.fn_dinner_ingredients_sync_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  if new.name is null or btrim(new.name) = '' then
    return new;
  end if;

  select d.household_id into v_household_id
  from public.dinners d
  where d.id = new.dinner_id;

  if v_household_id is null then
    return new;  -- unscoped dinner: nothing to register, and never a reason to block the write
  end if;

  insert into public.items (household_id, name)
  values (v_household_id, btrim(new.name))
  on conflict (household_id, name_key) do nothing;

  return new;
end;
$$;

comment on function public.fn_dinner_ingredients_sync_item() is
  'Get-or-creates the registry Item for an ingredient name (FR-3). AFTER, not BEFORE: an Item is a '
  'consequence of a committed ingredient row, never a precondition — registry sync must never '
  'block saving a dinner. ON CONFLICT DO NOTHING makes concurrent inserts of the same new name '
  'race-safe with no lock. security definer so the sync holds for EVERY writer, including the '
  'seed/provisioning path and a future recipe-import feature that does not exist yet (ADR-7).';

create trigger trg_dinner_ingredients_sync_item
  after insert or update of name on public.dinner_ingredients
  for each row
  execute function public.fn_dinner_ingredients_sync_item();

comment on trigger trg_dinner_ingredients_sync_item on public.dinner_ingredients is
  '`update of name` only — editing a quantity or category must not re-run registry sync. This '
  'trigger is the ONLY place items rows are created; no application code path calls anything.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. reorder_location RPC (story 006, FR-9)
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.reorder_location(p_location_id uuid, p_new_position integer)
returns setof public.locations
language plpgsql
set search_path = ''
as $$
declare
  v_old_position integer;
  v_store_id uuid;
  v_row_count integer;
begin
  -- FOR UPDATE serializes concurrent reorders; also yields the row's store.
  -- RLS already hides other households' rows, so a foreign p_location_id finds nothing here.
  select position, store_id
    into v_old_position, v_store_id
  from public.locations
  where id = p_location_id
  for update;

  if v_old_position is null then
    raise exception 'location % not found', p_location_id;
  end if;

  select count(*) into v_row_count
  from public.locations
  where store_id = v_store_id;

  if p_new_position < 1 or p_new_position > v_row_count then
    raise exception 'position % out of range (1..%)', p_new_position, v_row_count;
  end if;

  if p_new_position = v_old_position then
    return query
      select * from public.locations
      where store_id = v_store_id
      order by position;
    return;
  end if;

  -- No sentinel parking here, unlike reorder_grocery_store_row: parking is not sufficient.
  -- It rescues only the mover's own slot, while the range shift itself collides row-to-row
  -- when moving UP (the row at N moves to N+1 while N+1 still holds its old value). The
  -- DEFERRABLE INITIALLY DEFERRED constraint on (store_id, position) is what actually makes
  -- this safe: every intermediate state is allowed, and uniqueness is proven at commit.
  if p_new_position > v_old_position then
    update public.locations
    set position = position - 1
    where store_id = v_store_id
      and position > v_old_position
      and position <= p_new_position;
  else
    update public.locations
    set position = position + 1
    where store_id = v_store_id
      and position >= p_new_position
      and position < v_old_position;
  end if;

  update public.locations set position = p_new_position where id = p_location_id;

  return query
    select * from public.locations
    where store_id = v_store_id
    order by position;
end;
$$;

comment on function public.reorder_location(uuid, integer) is
  'Atomically moves a location to a new position, shifting every location between old and new — '
  'scoped to the target''s STORE, so no other store''s positions move (FR-9). Sections and aisles '
  'interleave in one sequence; there is no per-type sub-ordering. security invoker (the default), '
  'so RLS applies to the caller and no household argument is needed or accepted. Generalizes '
  'reorder_grocery_store_row from (household_id, position) to (store_id, position), but does NOT '
  'reproduce its sentinel-parking technique: that technique is insufficient, and '
  'reorder_grocery_store_row consequently raises 23505 on any upward move of 2+ positions '
  '(unhit in production only because v1''s arrow UI moves one step at a time). This function '
  'relies on the deferred (store_id, position) constraint instead and is correct at any distance.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. item_location_resolution view (story 004, FR-6)
-- ═══════════════════════════════════════════════════════════════════════════════
-- THE single definition of resolution. Units 002 (display) and 003 (shopping-list sort) both
-- read this and only this, so they cannot disagree.
--
-- security_invoker = true is load-bearing: without it the view executes as its OWNER and RLS on
-- every underlying table is bypassed, turning this into a cross-household leak. Same flag, same
-- reason as dinner_last_chosen (20260826192038).
create or replace view public.item_location_resolution
with (security_invoker = true) as
with item_category as (
  -- An Item has no category of its own — it is derived from the dinner_ingredients rows that
  -- produced it, which can disagree across dinners. dinner_ingredients has no timestamp column
  -- and uuid keys are not chronological, so "most recent" / "first-seen" have no definition
  -- here. Resolved (bolt 050, stage 2): the MODAL category, ties broken alphabetically —
  -- deterministic, stable under edits, and defensible as "the category you usually file it under".
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
  l.position as location_position
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

comment on view public.item_location_resolution is
  'Resolves every item to a location and a placement state, per store: explicit item_placements -> '
  'inherited category_placements -> unassigned (FR-6). TOTAL (every item yields a row via LEFT '
  'JOINs — unassigned is a normal state, never an error), ORDERED (explicit always beats '
  'inherited), and SINGULAR (unit 002 reads `state`/`via_category` for its pills, unit 003 reads '
  'location_position for its sort key; neither re-derives the chain). security_invoker = true '
  'keeps RLS in force — see the note above the definition.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. Row Level Security — mirrors 20260828232000 exactly
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.stores enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.item_placements enable row level security;
alter table public.category_placements enable row level security;
alter table public.suggestion_dismissals enable row level security;

-- stores
create policy "stores select in own household" on public.stores
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "stores insert in own household" on public.stores
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "stores update in own household" on public.stores
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "stores delete in own household" on public.stores
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- locations
create policy "locations select in own household" on public.locations
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "locations insert in own household" on public.locations
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "locations update in own household" on public.locations
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "locations delete in own household" on public.locations
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- items: SELECT ONLY, deliberately.
-- The registry is derived state written exclusively by trg_dinner_ingredients_sync_item (which
-- runs as the table owner and so is unaffected by policies) and by bolt 051's backfill (a
-- migration, likewise). Omitting insert/update/delete policies makes ADR-7's central claim —
-- "no client code path creates an Item" — structurally true rather than merely conventional.
-- Same technique as meal_history's deliberate omission of update/delete (20260827030000).
create policy "items select in own household" on public.items
  for select to authenticated
  using (household_id = public.current_user_household_id());

-- Defense in depth on top of the omitted policies, matching ai_call_counter (20260831213000):
-- the client has no write path to the registry at the grant level either.
revoke insert, update, delete on public.items from authenticated, anon;

-- item_placements
create policy "item_placements select in own household" on public.item_placements
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "item_placements insert in own household" on public.item_placements
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "item_placements update in own household" on public.item_placements
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "item_placements delete in own household" on public.item_placements
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- category_placements
create policy "category_placements select in own household" on public.category_placements
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "category_placements insert in own household" on public.category_placements
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "category_placements update in own household" on public.category_placements
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "category_placements delete in own household" on public.category_placements
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- suggestion_dismissals
create policy "suggestion_dismissals select in own household" on public.suggestion_dismissals
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "suggestion_dismissals insert in own household" on public.suggestion_dismissals
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "suggestion_dismissals update in own household" on public.suggestion_dismissals
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "suggestion_dismissals delete in own household" on public.suggestion_dismissals
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. Grants
-- ═══════════════════════════════════════════════════════════════════════════════
grant select on public.item_location_resolution to authenticated;
grant execute on function public.reorder_location(uuid, integer) to authenticated;
