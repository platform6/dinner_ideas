-- Grocery Store Config (intent 001-weekly-dinner-planner, new unit 004-grocery-store-config)
-- Stories: 001-store-rows-schema, 002-reorder-shopping-list-by-rows (FR-12, bolt 011-grocery-store-config)
-- See memory-bank/bolts/011-grocery-store-config/ddd-02-technical-design.md for design rationale.
-- Brand-new unit — no dependency on 001-dinner-catalog/002-weekly-planning schemas.

create table if not exists public.grocery_store_rows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null unique
);

comment on table public.grocery_store_rows is 'One named section of the household''s store, in shopping order (FR-12). Position is unique but not required to be contiguous — a gap after a delete is cosmetically invisible (ORDER BY position still works).';

create table if not exists public.category_row_assignments (
  category text primary key,
  row_id uuid not null references public.grocery_store_rows(id) on delete cascade
);

comment on table public.category_row_assignments is 'Maps an ingredient grocery category (same free-text values as dinner_ingredients.category) to a row. A category absent from this table is simply unassigned, not an error.';

create index if not exists idx_category_row_assignments_row_id on public.category_row_assignments (row_id);

-- RPC: atomic, race-safe row reorder (shifts every row between old and new position).
-- See ddd-02-technical-design.md for the move-out/shift/move-in trace showing every
-- intermediate UPDATE keeps `position` unique.
create or replace function public.reorder_grocery_store_row(p_row_id uuid, p_new_position integer)
returns setof public.grocery_store_rows
language plpgsql
as $$
declare
  v_old_position integer;
  v_row_count integer;
begin
  select position into v_old_position from public.grocery_store_rows where id = p_row_id for update;

  if v_old_position is null then
    raise exception 'grocery store row % not found', p_row_id;
  end if;

  select count(*) into v_row_count from public.grocery_store_rows;
  if p_new_position < 1 or p_new_position > v_row_count then
    raise exception 'position % out of range (1..%)', p_new_position, v_row_count;
  end if;

  if p_new_position = v_old_position then
    return query select * from public.grocery_store_rows order by position;
  end if;

  update public.grocery_store_rows set position = -1 where id = p_row_id;

  if p_new_position > v_old_position then
    update public.grocery_store_rows
    set position = position - 1
    where position > v_old_position and position <= p_new_position;
  else
    update public.grocery_store_rows
    set position = position + 1
    where position >= p_new_position and position < v_old_position;
  end if;

  update public.grocery_store_rows set position = p_new_position where id = p_row_id;

  return query select * from public.grocery_store_rows order by position;
end;
$$;

comment on function public.reorder_grocery_store_row(uuid, integer) is 'Atomically moves a row to a new position, shifting every row between the old and new position. FOR UPDATE serializes concurrent reorders.';

-- Row Level Security: same shape as sibling tables — single shared household login.

alter table public.grocery_store_rows enable row level security;
alter table public.category_row_assignments enable row level security;

create policy "Authenticated household can read grocery_store_rows"
  on public.grocery_store_rows for select
  to authenticated
  using (true);

create policy "Authenticated household can insert grocery_store_rows"
  on public.grocery_store_rows for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update grocery_store_rows"
  on public.grocery_store_rows for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete grocery_store_rows"
  on public.grocery_store_rows for delete
  to authenticated
  using (true);

create policy "Authenticated household can read category_row_assignments"
  on public.category_row_assignments for select
  to authenticated
  using (true);

create policy "Authenticated household can insert category_row_assignments"
  on public.category_row_assignments for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update category_row_assignments"
  on public.category_row_assignments for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete category_row_assignments"
  on public.category_row_assignments for delete
  to authenticated
  using (true);

grant execute on function public.reorder_grocery_store_row(uuid, integer) to authenticated;
