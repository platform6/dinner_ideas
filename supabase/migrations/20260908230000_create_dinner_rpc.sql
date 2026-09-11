-- Recipe save: write the whole dinner aggregate in one transaction
-- (intent 014-recipe-entry, unit 001-recipe-manual-entry, bolt 060)
-- Stories: 005-atomic-save, 006-duplicate-name-handling
-- See ddd-01-domain-model.md, ddd-02-technical-design.md,
--     adr-013-aggregate-write-in-one-transaction.md
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
-- Saving a recipe writes four tables: dinners, dinner_ingredients, dinner_steps, dinner_tags
-- (plus find-or-create on tags). PostgREST inserts are separate HTTP calls, so there is no
-- transaction available from the browser.
--
-- Seven of the Dinner aggregate's eight invariants are properties of a COMPLETE dinner. A
-- `dinners` row with no ingredients is not an incomplete Dinner — it is not a Dinner. So the
-- aggregate boundary and the transaction boundary are the same boundary (ADR-13).
--
-- The rejected alternative was client-side compensation (insert, then children, delete on
-- failure). Its fatal flaw is not that the compensating delete can fail. It is that the window
-- is a VISIBILITY window: between the dinners insert and the children, the row is committed and
-- queryable, so another household member's catalog can list a dinner with no ingredients and
-- PICK IT FOR THE WEEK — on the path where nothing goes wrong at all.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ SECURITY INVOKER — NOT DEFINER. Read before "fixing" this for consistency.
-- ─────────────────────────────────────────────────────────────────────────────
-- This schema runs 19 `security definer` functions to one `invoker`, so the reflex is to make
-- this one definer too. Do not.
--
-- Those 19 are definer because they deliberately BYPASS RLS (reading household_members past its
-- own RLS, the key vault, the AI counter). This one must not. All five tables it writes carry
-- household-scoped INSERT policies from intent 004
-- (20260828232000_account_model_household_scoped_rls.sql), so `invoker` satisfies story 005's
-- "existing RLS insert policies used unchanged — no new policy, no service_role path" BY
-- CONSTRUCTION.
--
-- Making it definer would bypass those policies and oblige this function to re-derive the
-- household checks they already make — more code, more ways to be wrong, and a new escalation
-- surface for no gain. See ADR-13.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- NOT IN THIS MIGRATION: the dinners.name constraint
-- ─────────────────────────────────────────────────────────────────────────────
-- Bolt 060's brief says "the migration is certain" because dinners.name uniqueness must be
-- rescoped to the household, and story 006 says the constraint is global. Both are STALE.
--
-- Intent 004 already did it, on 2026-08-28, in
-- 20260828231000_account_model_household_id_columns.sql:
--     alter table public.dinners drop constraint if exists dinners_name_key;
--     alter table public.dinners add constraint dinners_household_id_name_key
--       unique nulls not distinct (household_id, name);
--
-- Verified against production before writing this file: `dinners` carries exactly one unique
-- constraint, dinners_household_id_name_key. Resolved decision 3 was answered before intent 014
-- was written. A duplicate name already raises 23505 per household, which is what story 006
-- wants; the client maps the code to English.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK  (symmetric — this migration only adds a function)
-- ─────────────────────────────────────────────────────────────────────────────
--   drop function if exists public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[]);
--   -- and revert the client to leaving the draft unsaved (bolt 059's state).
--
-- Safe at any time: nothing depends on the function except the recipe entry page, and no data
-- written through it is shaped differently from a seeded dinner.

create or replace function public.fn_create_dinner(
  p_name               text,
  p_cuisine_type       text,
  p_cook_time_minutes  integer,
  p_instructions       text,
  p_ingredients        jsonb,
  p_steps              text[],
  p_tag_names          text[]
)
returns uuid
language plpgsql
security invoker
-- ADR-12: restated here, never inherited. Every reference below is schema-qualified.
set search_path = ''
as $$
declare
  v_dinner_id   uuid;
  v_household   uuid := public.current_user_household_id();
  v_tag_names   text[];
begin
  -- ── INV-1 / INV-2: a Dinner has at least one ingredient and at least one step ──────────
  -- No column constraint can carry these: an empty array is a perfectly valid text[], and an
  -- empty jsonb array is valid jsonb. The client validates for the person typing; this
  -- validates for every other caller, including unit 002's importer (ADR-1).
  if p_ingredients is null or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'A dinner needs at least one ingredient'
      using errcode = 'check_violation';
  end if;

  if p_steps is null or coalesce(array_length(p_steps, 1), 0) = 0 then
    raise exception 'A dinner needs at least one cooking step'
      using errcode = 'check_violation';
  end if;

  -- ── The dinner ────────────────────────────────────────────────────────────────────────
  -- household_id is NOT a parameter: the column defaults to current_user_household_id(), so a
  -- caller cannot write into another household even by trying.
  insert into public.dinners (name, cuisine_type, cook_time_minutes, instructions)
  values (btrim(p_name), btrim(p_cuisine_type), p_cook_time_minutes, btrim(p_instructions))
  returning id into v_dinner_id;

  -- ── Ingredient lines ──────────────────────────────────────────────────────────────────
  -- category is left to the column's CHECK constraint rather than re-listed here; a second copy
  -- of the five values would drift from it (the same reason the client imports
  -- INGREDIENT_CATEGORIES instead of re-declaring them).
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select
    v_dinner_id,
    (line ->> 'quantity')::numeric,
    coalesce(btrim(line ->> 'unit'), ''),
    btrim(line ->> 'name'),
    line ->> 'category'
  from jsonb_array_elements(p_ingredients) as line;

  -- ── Cooking steps ─────────────────────────────────────────────────────────────────────
  -- WITH ORDINALITY numbers the array 1..n. INV-3 (contiguous from 1) is not enforced here so
  -- much as made UNREPRESENTABLE: there is no parameter in which a gap could be expressed.
  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select v_dinner_id, ordinality::integer, btrim(step)
  from unnest(p_steps) with ordinality as t(step, ordinality);

  -- ── Tags ──────────────────────────────────────────────────────────────────────────────
  -- Normalized and deduped first, so `Quick` and `quick ` in one draft resolve to one tag
  -- rather than colliding on the unique constraint. Matches normalizeTagName in the client:
  -- trim and lowercase, nothing else.
  select coalesce(array_agg(distinct lower(btrim(n))), array[]::text[])
  into v_tag_names
  from unnest(coalesce(p_tag_names, array[]::text[])) as n
  where btrim(n) <> '';

  if array_length(v_tag_names, 1) > 0 then
    -- Find-or-create over the household's shared, permanent vocabulary. Resolution happens
    -- INSIDE this transaction: a tag created for a dinner that then fails to save would be a
    -- word added to a shared vocabulary in exchange for nothing.
    insert into public.tags (name)
    select n from unnest(v_tag_names) as n
    on conflict (household_id, name) do nothing;

    insert into public.dinner_tags (dinner_id, tag_id)
    select v_dinner_id, t.id
    from public.tags t
    where t.household_id = v_household
      and t.name = any (v_tag_names)
    on conflict (dinner_id, tag_id) do nothing;
  end if;

  -- The items registry fills itself: trg_dinner_ingredients_sync_item fired on the insert
  -- above, inside this transaction. ADR-7 makes that trigger the only creator — do not add
  -- application code here to "help" it.
  return v_dinner_id;
end;
$$;

comment on function public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[]) is
  'Creates a complete dinner — the row, its ingredient lines, its cooking steps and its tags — in '
  'ONE transaction (intent 014, ADR-13). The aggregate boundary is the transaction boundary: a '
  'dinner with no ingredients is not an incomplete dinner, it is not a dinner. security invoker '
  'ON PURPOSE so the household-scoped RLS insert policies apply unchanged; do not change it to '
  'definer for consistency with this schema''s other functions. Step numbers come from WITH '
  'ORDINALITY, so a gap is unrepresentable. Tag names are trimmed/lowercased and find-or-created '
  'against the household vocabulary. Returns the new dinner id.';

grant execute on function public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[])
  to authenticated;
