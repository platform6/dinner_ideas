-- Dinner Catalog schema (intent 001-weekly-dinner-planner, unit 001-dinner-catalog)
-- Story: 001-dinner-catalog-schema
-- See memory-bank/bolts/001-dinner-catalog/ddd-02-technical-design.md for design rationale.

create table if not exists public.dinners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cuisine_type text not null,
  cook_time_minutes integer not null check (cook_time_minutes > 0),
  rosie_approved boolean not null default false,
  instructions text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.dinners is 'A single recipe/meal option in the catalog.';
comment on column public.dinners.cuisine_type is 'Free text, not an enum, so new cuisines never require a migration.';
comment on column public.dinners.is_active is 'FR-7: suppress/un-suppress flag. false = hidden from the default catalog view; reversible.';

create table if not exists public.dinner_ingredients (
  id uuid primary key default gen_random_uuid(),
  dinner_id uuid not null references public.dinners(id) on delete cascade,
  name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  category text not null check (category in ('Produce', 'Protein', 'Dairy', 'Grains', 'Pantry'))
);

comment on table public.dinner_ingredients is 'One ingredient line within a dinner, pre-scaled to 3 servings (2 adults + 1 small child).';
comment on column public.dinner_ingredients.category is 'Grocery category used for FR-3 shopping-list grouping.';

create index if not exists idx_dinners_is_active on public.dinners (is_active);
create index if not exists idx_dinners_cuisine_type on public.dinners (cuisine_type);
create index if not exists idx_dinner_ingredients_dinner_id on public.dinner_ingredients (dinner_id);

-- Row Level Security: single shared household login, no per-user roles.
-- Every authenticated session represents the same household, so policies
-- gate on authentication only, with no row-level differentiation.

alter table public.dinners enable row level security;
alter table public.dinner_ingredients enable row level security;

create policy "Authenticated household can read dinners"
  on public.dinners for select
  to authenticated
  using (true);

create policy "Authenticated household can insert dinners"
  on public.dinners for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update dinners"
  on public.dinners for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete dinners"
  on public.dinners for delete
  to authenticated
  using (true);

create policy "Authenticated household can read dinner_ingredients"
  on public.dinner_ingredients for select
  to authenticated
  using (true);

create policy "Authenticated household can insert dinner_ingredients"
  on public.dinner_ingredients for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update dinner_ingredients"
  on public.dinner_ingredients for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete dinner_ingredients"
  on public.dinner_ingredients for delete
  to authenticated
  using (true);
