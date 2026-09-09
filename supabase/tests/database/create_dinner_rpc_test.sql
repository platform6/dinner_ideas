-- pgTAP tests for 20260908230000_create_dinner_rpc.sql
-- (intent 014-recipe-entry, unit 001-recipe-manual-entry, bolt 060; ADR-13)
-- Run locally via: supabase test db
--
-- The claim under test is atomicity: a save writes a COMPLETE dinner or it writes nothing.
-- Everything else here is supporting detail.

begin;
select plan(22);

-- Run as the founding household's owner (migration 20260828234000), so household_id self-assigns
-- via current_user_household_id() and the RLS insert policies apply as they do in the app.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f0","role":"authenticated"}';

-- ── Shape ─────────────────────────────────────────────────────────────────
select has_function(
  'public', 'fn_create_dinner',
  array['text', 'text', 'integer', 'text', 'jsonb', 'text[]', 'text[]'],
  'fn_create_dinner exists with the expected signature');

select is(
  (select prosecdef from pg_proc
   where oid = 'public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[])'::regprocedure),
  false,
  'fn_create_dinner is SECURITY INVOKER — RLS applies to its inserts (ADR-13)');

-- ── A complete save writes all four tables ────────────────────────────────
select lives_ok(
  $$
    select public.fn_create_dinner(
      'Test Sheet Pan Chicken', 'Test Cuisine', 35, 'A one-line summary.',
      '[{"quantity": 1.5, "unit": "lb", "name": "Test Chicken Thighs", "category": "Protein"},
        {"quantity": 2,   "unit": "each", "name": "Test Bell Peppers", "category": "Produce"}]'::jsonb,
      array['Heat the oven to 425.', 'Spread on a sheet pan.', 'Roast for 30 minutes.'],
      array['test-weeknight', 'test-sheet-pan']
    )
  $$,
  'a complete recipe saves');

select is(
  (select count(*)::int from public.dinners where name = 'Test Sheet Pan Chicken'),
  1, 'one dinners row');

select is(
  (select count(*)::int from public.dinner_ingredients i
   join public.dinners d on d.id = i.dinner_id where d.name = 'Test Sheet Pan Chicken'),
  2, 'one dinner_ingredients row per line');

select is(
  (select count(*)::int from public.dinner_steps s
   join public.dinners d on d.id = s.dinner_id where d.name = 'Test Sheet Pan Chicken'),
  3, 'one dinner_steps row per step');

select is(
  (select count(*)::int from public.dinner_tags dt
   join public.dinners d on d.id = dt.dinner_id where d.name = 'Test Sheet Pan Chicken'),
  2, 'one dinner_tags row per tag');

select is(
  (select household_id from public.dinners where name = 'Test Sheet Pan Chicken'),
  public.current_user_household_id(),
  'household_id is the caller''s, from the column default');

-- ── Step numbers follow the array order, contiguously from 1 ──────────────
select is(
  (select array_agg(s.instruction order by s.step_number)
   from public.dinner_steps s join public.dinners d on d.id = s.dinner_id
   where d.name = 'Test Sheet Pan Chicken'),
  array['Heat the oven to 425.', 'Spread on a sheet pan.', 'Roast for 30 minutes.'],
  'the stored order IS the order the steps were given in');

select is(
  (select array_agg(s.step_number order by s.step_number)
   from public.dinner_steps s join public.dinners d on d.id = s.dinner_id
   where d.name = 'Test Sheet Pan Chicken'),
  array[1, 2, 3],
  'step numbers are contiguous from 1 (WITH ORDINALITY)');

-- ── Ingredient values survive the jsonb round trip ────────────────────────
select is(
  (select quantity from public.dinner_ingredients i join public.dinners d on d.id = i.dinner_id
   where d.name = 'Test Sheet Pan Chicken' and i.name = 'Test Chicken Thighs'),
  1.5::numeric,
  'a fractional quantity survives as numeric, not truncated to an integer');

select is(
  (select category from public.dinner_ingredients i join public.dinners d on d.id = i.dinner_id
   where d.name = 'Test Sheet Pan Chicken' and i.name = 'Test Bell Peppers'),
  'Produce', 'the category is stored as given');

-- ── Tags: created lowercase, and an existing one is REUSED not duplicated ─
select is(
  (select count(*)::int from public.tags
   where name = 'test-weeknight' and household_id = public.current_user_household_id()),
  1, 'a new tag is created once');

select lives_ok(
  $$
    select public.fn_create_dinner(
      'Test Second Dinner', 'Test Cuisine', 20, 'Another summary.',
      '[{"quantity": 1, "unit": "each", "name": "Test Onion", "category": "Produce"}]'::jsonb,
      array['Chop it.'],
      array['TEST-WEEKNIGHT', '  test-weeknight  ', 'test-new-one']
    )
  $$,
  'a second dinner reusing an existing tag saves');

select is(
  (select count(*)::int from public.tags
   where name = 'test-weeknight' and household_id = public.current_user_household_id()),
  1, 'the existing tag is REUSED, not duplicated by case or whitespace');

select is(
  (select count(*)::int from public.dinner_tags dt
   join public.dinners d on d.id = dt.dinner_id where d.name = 'Test Second Dinner'),
  2, 'the three tag spellings collapse to two distinct attachments');

-- ── The items registry fills itself, via the trigger (ADR-7) ──────────────
select is(
  (select count(*)::int from public.items
   where name_key = lower(btrim('Test Chicken Thighs'))
     and household_id = public.current_user_household_id()),
  1, 'the ingredient registered a grocery item — written by the trigger, not by this function');

-- ══════════════════════════════════════════════════════════════════════════
-- ATOMICITY — the claim this whole bolt exists for
-- ══════════════════════════════════════════════════════════════════════════
-- A category outside the CHECK set makes the dinner_ingredients insert fail AFTER the dinners
-- insert has already succeeded inside the function. If the write were not one transaction, the
-- dinners row would survive and the catalog would hold a dinner with no ingredients — exactly
-- the non-Dinner the domain model says cannot exist.
select throws_ok(
  $$
    select public.fn_create_dinner(
      'Test Orphan Dinner', 'Test Cuisine', 15, 'Should never exist.',
      '[{"quantity": 1, "unit": "each", "name": "Test Thing", "category": "NotACategory"}]'::jsonb,
      array['Do something.'],
      array[]::text[]
    )
  $$,
  '23514',
  null,
  'a bad ingredient category is rejected by the CHECK constraint');

select is(
  (select count(*)::int from public.dinners where name = 'Test Orphan Dinner'),
  0,
  'NO dinners row survives that failure — the dinner insert rolled back with the ingredient insert');

-- ── INV-1 / INV-2: the function refuses an incomplete aggregate itself ────
select throws_ok(
  $$
    select public.fn_create_dinner(
      'Test No Ingredients', 'Test Cuisine', 15, 'Summary.',
      '[]'::jsonb, array['A step.'], array[]::text[])
  $$,
  '23514', null,
  'a dinner with no ingredients is refused by the function, not by a column constraint');

select throws_ok(
  $$
    select public.fn_create_dinner(
      'Test No Steps', 'Test Cuisine', 15, 'Summary.',
      '[{"quantity": 1, "unit": "each", "name": "Test Thing", "category": "Pantry"}]'::jsonb,
      array[]::text[], array[]::text[])
  $$,
  '23514', null,
  'a dinner with no steps is refused by the function');

-- ── Duplicate name: 23505, per household (story 006) ──────────────────────
select throws_ok(
  $$
    select public.fn_create_dinner(
      'Test Sheet Pan Chicken', 'Test Cuisine', 15, 'A duplicate.',
      '[{"quantity": 1, "unit": "each", "name": "Test Thing", "category": "Pantry"}]'::jsonb,
      array['A step.'], array[]::text[])
  $$,
  '23505', null,
  'a duplicate dinner name raises 23505 on dinners_household_id_name_key');

select * from finish();
rollback;
