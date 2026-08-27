---
stage: design
bolt: 011-grocery-store-config
created: 2026-08-27T06:30:00Z
---

## Technical Design: grocery-store-config

### Architecture Pattern

Same BaaS-direct pattern as every other unit: Postgres schema + RLS, plus one single-purpose RPC (`reorder_grocery_store_row`) for the one operation that genuinely needs atomicity across multiple rows — per `ADR-1`.

### Scoping refinement from Stage 1: "contiguous, no gaps" relaxed to "unique, ordered"

Stage 1's domain model stated row positions must be gap-free. On review, this is stricter than the feature actually needs: `ORDER BY position` produces a correct, stable order whether positions are `{1,2,3}` or `{1,2,5}` — a gap is cosmetically invisible to the user (the UI never displays the raw position number, only the resulting order). Enforcing strict contiguity would require either a trigger that renumbers on every `DELETE` (extra machinery) or an RPC-wrapped delete — disproportionate for a low-frequency admin action in a single-household app. Relaxed invariant: **positions are unique** (enforced by a DB `UNIQUE` constraint, holds regardless of caller) **and used only for ordering**, not required to be contiguous. `reorder_grocery_store_row` still produces a tidy, contiguous result in the normal case (nothing about this relaxation makes the common path messier) — this only changes what's _guaranteed_ against an edge case (a row deleted via direct client `DELETE`, bypassing any renumbering step), not what the RPC itself produces.

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Reads rows/assignments via PostgREST; reorders via one RPC
├─────────────────────────────┤
│  PostgREST auto-API + RPC   │  Tables exposed directly; reorder_grocery_store_row() for atomicity
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies
├─────────────────────────────┤
│   Postgres schema           │  grocery_store_rows, category_row_assignments
└─────────────────────────────┘
```

### API Design

- **List rows, ordered**: `GET /rest/v1/grocery_store_rows?order=position.asc` — Response: `GroceryStoreRow[]`
- **Add a row**: `POST /rest/v1/grocery_store_rows` body `{name, position}` — client computes `position` as `(current row count) + 1` from the list it already has loaded for display; appending can never collide with an existing position.
- **Reorder a row**: `POST /rpc/reorder_grocery_store_row` body `{p_row_id, p_new_position}` — Postgres function; atomically shifts every row between the old and new position, returns the full ordered row list. Raises a clear error if the row doesn't exist or the position is out of range.
- **Delete a row**: `DELETE /rest/v1/grocery_store_rows?id=eq.{id}` — cascades to remove its `category_row_assignments` (those categories become unassigned, not orphaned); leaves a gap in `position`, which is fine per the scoping refinement above.
- **List category assignments**: `GET /rest/v1/category_row_assignments`
- **Assign/reassign a category to a row**: `POST /rest/v1/category_row_assignments` with `Prefer: resolution=merge-duplicates` (upsert) body `{category, row_id}` — moves the category if it was already assigned elsewhere (last write wins, no history).

### Data Model

- **`grocery_store_rows`**: `id` (uuid, pk, default `gen_random_uuid()`), `name` (text, not null), `position` (integer, not null, `UNIQUE`).
- **`category_row_assignments`**: `category` (text, primary key), `row_id` (uuid, not null, `REFERENCES grocery_store_rows(id) ON DELETE CASCADE`).

**Indexes**: `category_row_assignments`'s primary key on `category` already supports the "look up this category's row" lookup the shopping-list reorder needs; `row_id` gets an index for the cascade delete's own lookup performance (trivial at this scale, included for consistency with other units' FK-indexing convention).

```sql
create index if not exists idx_category_row_assignments_row_id on public.category_row_assignments (row_id);
```

**`reorder_grocery_store_row(p_row_id uuid, p_new_position integer)` function** (SQL, `SECURITY INVOKER`, the default):

```sql
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

  -- Move the target row out of the active range first, so the shift below (a single
  -- set-based UPDATE over the affected rows) can never collide with it mid-statement.
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
```

- **`FOR UPDATE`** on the target row, same pattern as `lock_weekly_plan`, serializes concurrent reorders against each other.
- **Three-statement shift** (move-out → shift-range → move-in) keeps every intermediate `UPDATE`'s final state free of duplicate positions, verified by hand-tracing both "move down" and "move up" cases (see this bolt's domain model discussion) — the `UNIQUE` constraint on `position` would reject any step that got this wrong, so the design is self-checking at write time, not just by inspection.
- **`-1` placeholder** is safe because real positions are always `>= 1` by construction (`add row` always appends at `count + 1`).

### Security Design

- **RLS**: Enabled on both tables, same shape as sibling tables — authenticated-household-only, no per-user rows.
- **`reorder_grocery_store_row`**: `SECURITY INVOKER` (default) — subject to the caller's RLS grants, no privilege escalation.

### NFR Implementation

- **Performance**: Trivial volume (a handful of rows/categories) — no indexing beyond what's listed is needed at this scale.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults.

### Integrations

- **No dependency on other units**: references ingredient `category` strings conceptually (for the shopping-list reorder logic in `003-weekly-dinner-planner-ui`), not via a hard FK to `dinner_ingredients` — `001-dinner-catalog`'s schema is unaffected and doesn't need to be read during this bolt's own migration.
- **Migration applied**: same pattern as prior bolts — `supabase db push` against the linked "dinner ideas" project, verified live via `supabase db query --linked` (per the working pattern established in bolt `010`).
