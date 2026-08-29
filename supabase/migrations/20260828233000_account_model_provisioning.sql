-- Account Model: default-catalog seed routine + household_invites + handle_new_user() trigger
-- (intent 004-account-model, unit 001-household-data-model)
-- Stories: 005-default-catalog-seed-routine, 006-household-invites-table,
--          007-new-user-provisioning-trigger
-- Bolt: 029-household-data-model
-- See memory-bank/bolts/029-household-data-model/ddd-02-technical-design.md.
--
-- Additive migration. Adds one function, one table (+ 2 indexes + RLS), one function, one
-- trigger on auth.users. Edits no shipped migration.
--
-- seed_default_household_catalog() is generated from the shipped seed migrations
-- (20260826175606 + 20260826224346 + 20260828000000) by a deterministic transform
-- (see the bolt's ddd-02), so the re-expressed data is identical to a freshly-seeded DB by
-- construction. It is NOT executable by `authenticated` — only handle_new_user() (security
-- definer) and migrations call it.
--
-- ROLLBACK:
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop table if exists public.household_invites;
--   drop function if exists public.seed_default_household_catalog(uuid);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. seed_default_household_catalog(p_household_id) — story 005
--    (body re-expressed verbatim from the shipped seed migrations; idempotent guard on top)
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.seed_default_household_catalog(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- Idempotency guard (story 005): a household that already has any dinner is left untouched.
  if exists (select 1 from public.dinners where household_id = p_household_id) then
    return;
  end if;

  -- ----- default dinners + ingredients (re-expressed from 20260826175606) -----
  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Lemon Herb Chicken with Roasted Broccoli', 'American', 35, 'Toss chicken and broccoli with oil, garlic, lemon juice, and oregano; roast at 425F for 30 min.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken thighs', 'Protein'),
    (3, 'cups', 'broccoli florets', 'Produce'),
    (1, 'each', 'lemon', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (2, 'cloves', 'garlic', 'Produce'),
    (1, 'tsp', 'dried oregano', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Taco Bowls', 'Mexican', 25, 'Brown turkey with seasoning, serve over rice with cheese, avocado, and tomato.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (1, 'packet', 'taco seasoning', 'Pantry'),
    (1, 'cup', 'cooked rice', 'Grains'),
    (1, 'cup', 'shredded cheese', 'Dairy'),
    (1, 'each', 'avocado', 'Produce'),
    (1, 'cup', 'diced tomatoes', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Salmon with Garlic Green Beans', 'American', 25, 'Pan-sear salmon; saute green beans in butter and garlic; finish both with lemon.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'salmon fillet', 'Protein'),
    (3, 'cups', 'green beans', 'Produce'),
    (3, 'cloves', 'garlic', 'Produce'),
    (2, 'tbsp', 'butter', 'Dairy'),
    (1, 'each', 'lemon', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Stir-Fry with Brown Rice', 'Chinese', 30, 'Stir-fry chicken and vegetables, toss in soy-sesame sauce thickened with cornstarch, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast', 'Protein'),
    (3, 'cups', 'mixed stir-fry vegetables', 'Produce'),
    (1, 'cup', 'brown rice', 'Grains'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'sesame oil', 'Pantry'),
    (1, 'tbsp', 'cornstarch', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Veggie & Black Bean Quesadillas', 'Mexican', 20, 'Fill tortillas with beans, cheese, pepper, and corn; pan-crisp until golden.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (6, 'small', 'flour tortillas', 'Grains'),
    (1, 'can', 'black beans', 'Pantry'),
    (1.5, 'cups', 'shredded cheese', 'Dairy'),
    (1, 'each', 'bell pepper', 'Produce'),
    (0.5, 'cup', 'corn', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Meatballs with Zucchini Noodles', 'Italian', 35, 'Bake turkey meatballs; spiralize zucchini; simmer meatballs in marinara and serve over noodles.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (3, 'medium', 'zucchini', 'Produce'),
    (1.5, 'cups', 'marinara sauce', 'Pantry'),
    (0.25, 'cup', 'breadcrumbs', 'Grains'),
    (1, 'each', 'egg', 'Protein'),
    (0.25, 'cup', 'parmesan', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Shrimp Fried Rice', 'Chinese', 25, 'Scramble eggs, add shrimp and vegetables, toss with rice and soy sauce.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'shrimp', 'Protein'),
    (3, 'cups', 'cooked rice (day-old)', 'Grains'),
    (2, 'each', 'eggs', 'Protein'),
    (1, 'cup', 'frozen peas and carrots', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (2, 'each', 'green onions', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Fajita Bowls', 'Mexican', 30, 'Saute chicken, peppers, and onion with seasoning; serve over rice with cheese.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, sliced', 'Protein'),
    (2, 'each', 'bell peppers', 'Produce'),
    (1, 'each', 'onion', 'Produce'),
    (1, 'cup', 'cooked rice', 'Grains'),
    (1, 'tbsp', 'fajita seasoning', 'Pantry'),
    (0.5, 'cup', 'shredded cheese', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Cod with Roasted Vegetables', 'American', 30, 'Roast vegetables at 400F, add cod for the final 15 minutes with oil and paprika.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'cod fillet', 'Protein'),
    (2, 'cups', 'carrots, chopped', 'Produce'),
    (2, 'cups', 'zucchini, chopped', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (1, 'tsp', 'paprika', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Whole Wheat Spaghetti with Turkey Bolognese', 'Italian', 35, 'Brown turkey with carrot and onion, simmer in marinara, toss with cooked spaghetti.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (12, 'oz', 'whole wheat spaghetti', 'Grains'),
    (2, 'cups', 'marinara sauce', 'Pantry'),
    (1, 'each', 'carrot, diced', 'Produce'),
    (1, 'each', 'onion, diced', 'Produce'),
    (0.25, 'cup', 'parmesan', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Souvlaki with Tzatziki', 'Mediterranean', 35, 'Marinate and grill/pan-sear chicken skewers; mix yogurt, cucumber, and garlic for tzatziki; serve with pita.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken thighs, cubed', 'Protein'),
    (1, 'cup', 'plain yogurt', 'Dairy'),
    (1, 'each', 'cucumber', 'Produce'),
    (2, 'cloves', 'garlic', 'Produce'),
    (3, 'small', 'pitas', 'Grains'),
    (1, 'tbsp', 'olive oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Beef and Broccoli Stir-Fry', 'Chinese', 30, 'Stir-fry beef, add broccoli and garlic, toss in soy-brown sugar sauce, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'flank steak, sliced thin', 'Protein'),
    (3, 'cups', 'broccoli florets', 'Produce'),
    (1, 'cup', 'rice', 'Grains'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'brown sugar', 'Pantry'),
    (2, 'cloves', 'garlic', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Sheet Pan Chicken Fajitas', 'Mexican', 30, 'Toss chicken and vegetables with oil and seasoning; roast on one sheet pan at 425F for 20 min; serve with tortillas.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, sliced', 'Protein'),
    (2, 'each', 'bell peppers, sliced', 'Produce'),
    (1, 'each', 'onion, sliced', 'Produce'),
    (6, 'small', 'flour tortillas', 'Grains'),
    (1, 'tbsp', 'fajita seasoning', 'Pantry'),
    (2, 'tbsp', 'olive oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Grilled Chicken Caesar Salad', 'American', 25, 'Grill chicken, slice, toss with romaine, parmesan, croutons, and dressing.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast', 'Protein'),
    (2, 'heads', 'romaine lettuce', 'Produce'),
    (0.5, 'cup', 'parmesan', 'Dairy'),
    (1, 'cup', 'croutons', 'Grains'),
    (0.25, 'cup', 'light Caesar dressing', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Tilapia Tacos with Cabbage Slaw', 'Mexican', 25, 'Bake seasoned tilapia; toss cabbage with yogurt and lime for slaw; assemble tacos.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'tilapia', 'Protein'),
    (2, 'cups', 'shredded cabbage', 'Produce'),
    (6, 'small', 'corn tortillas', 'Grains'),
    (0.25, 'cup', 'plain yogurt', 'Dairy'),
    (1, 'each', 'lime', 'Produce'),
    (1, 'tsp', 'chili powder', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chickpea & Spinach Curry with Rice', 'Indian', 30, 'Saute onion, add chickpeas, coconut milk, and curry powder, simmer, stir in spinach, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (2, 'cans', 'chickpeas', 'Pantry'),
    (4, 'cups', 'fresh spinach', 'Produce'),
    (1, 'can', 'coconut milk', 'Pantry'),
    (1, 'each', 'onion', 'Produce'),
    (1, 'tbsp', 'curry powder', 'Pantry'),
    (1, 'cup', 'rice', 'Grains')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Chili', 'American', 40, 'Brown turkey with onion and pepper, add beans, tomatoes, and seasoning, simmer 25 min.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (1, 'can', 'kidney beans', 'Pantry'),
    (1, 'can', 'diced tomatoes', 'Pantry'),
    (1, 'each', 'onion', 'Produce'),
    (1, 'each', 'bell pepper', 'Produce'),
    (2, 'tbsp', 'mild chili seasoning', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Honey Garlic Salmon with Quinoa', 'American/Asian fusion', 30, 'Glaze salmon with honey-garlic-soy sauce and bake; serve with quinoa and steamed broccoli.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'salmon fillet', 'Protein'),
    (1, 'cup', 'quinoa', 'Grains'),
    (2, 'tbsp', 'honey', 'Pantry'),
    (2, 'tbsp', 'soy sauce', 'Pantry'),
    (3, 'cloves', 'garlic', 'Produce'),
    (2, 'cups', 'steamed broccoli', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Chicken Parmesan with Side Salad', 'Italian', 40, 'Bread and bake chicken, top with sauce and mozzarella, bake until melted; serve with salad.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, thin-cut', 'Protein'),
    (0.75, 'cup', 'breadcrumbs', 'Grains'),
    (1, 'cup', 'marinara sauce', 'Pantry'),
    (1, 'cup', 'shredded mozzarella', 'Dairy'),
    (4, 'cups', 'salad greens', 'Produce'),
    (1, 'each', 'egg', 'Protein')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Veggie Fried Rice with Egg', 'Chinese', 25, 'Scramble eggs, saute vegetables, add rice and soy sauce, toss together.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (3, 'cups', 'cooked rice (day-old)', 'Grains'),
    (3, 'each', 'eggs', 'Protein'),
    (1, 'cup', 'frozen peas and carrots', 'Produce'),
    (2, 'each', 'green onions', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'vegetable oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Burgers with Sweet Potato Fries', 'American', 35, 'Cut and roast sweet potato fries with oil at 425F; grill or pan-fry turkey patties; assemble burgers.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (3, 'each', 'burger buns', 'Grains'),
    (2, 'each', 'sweet potatoes', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (1, 'tsp', 'garlic powder', 'Pantry'),
    (1, 'cup', 'lettuce & tomato (topping)', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Shrimp Tacos with Avocado Crema', 'Mexican', 25, 'Saute seasoned shrimp; blend avocado, sour cream, and lime for crema; assemble tacos.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'shrimp', 'Protein'),
    (6, 'small', 'corn tortillas', 'Grains'),
    (1, 'each', 'avocado', 'Produce'),
    (0.25, 'cup', 'sour cream', 'Dairy'),
    (1, 'each', 'lime', 'Produce'),
    (1, 'tsp', 'cumin', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Ziti with Turkey & Spinach', 'Italian', 40, 'Brown turkey, mix with cooked ziti, marinara, spinach, and cheeses; bake until bubbly.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (12, 'oz', 'ziti pasta', 'Grains'),
    (2, 'cups', 'marinara sauce', 'Pantry'),
    (2, 'cups', 'fresh spinach', 'Produce'),
    (1.5, 'cups', 'shredded mozzarella', 'Dairy'),
    (0.5, 'cup', 'ricotta', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Teriyaki Bowls', 'Japanese', 30, 'Pan-sear chicken, glaze with teriyaki sauce, serve over rice with steamed broccoli.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken thighs', 'Protein'),
    (1, 'cup', 'rice', 'Grains'),
    (0.33, 'cup', 'teriyaki sauce', 'Pantry'),
    (2, 'cups', 'steamed broccoli', 'Produce'),
    (1, 'tbsp', 'sesame seeds', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Mediterranean Chicken Skewers with Rice', 'Mediterranean', 35, 'Skewer chicken with vegetables, grill or bake, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, cubed', 'Protein'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'each', 'bell pepper', 'Produce'),
    (1, 'each', 'zucchini', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (1, 'tsp', 'dried oregano', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Black Bean & Sweet Potato Tacos', 'Mexican', 30, 'Roast sweet potato cubes, warm black beans with cumin, assemble tacos with cheese and avocado.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (2, 'each', 'sweet potatoes, cubed', 'Produce'),
    (1, 'can', 'black beans', 'Pantry'),
    (6, 'small', 'corn tortillas', 'Grains'),
    (0.5, 'cup', 'shredded cheese', 'Dairy'),
    (1, 'tsp', 'cumin', 'Pantry'),
    (1, 'each', 'avocado', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Pan-Seared Salmon with Asparagus', 'American', 20, 'Pan-sear salmon; saute asparagus with butter and garlic; finish with lemon.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'salmon fillet', 'Protein'),
    (2, 'bunches', 'asparagus', 'Produce'),
    (2, 'tbsp', 'butter', 'Dairy'),
    (1, 'each', 'lemon', 'Produce'),
    (2, 'cloves', 'garlic', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey & Veggie Stir-Fry Lettuce Wraps', 'Asian', 25, 'Brown turkey with carrots and water chestnuts in soy-hoisin sauce; serve in lettuce cups.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (1, 'head', 'butter lettuce', 'Produce'),
    (1, 'cup', 'shredded carrots', 'Produce'),
    (0.5, 'cup', 'water chestnuts', 'Pantry'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'hoisin sauce', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Chicken Thighs with Roasted Carrots', 'American', 40, 'Toss chicken and carrots with oil, garlic, and thyme; roast at 425F for 35 min.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1.5, 'lb', 'chicken thighs', 'Protein'),
    (4, 'cups', 'carrots, chopped', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (1, 'tsp', 'thyme', 'Pantry'),
    (2, 'cloves', 'garlic', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Shrimp & Vegetable Pad Thai', 'Thai', 35, 'Soak noodles, stir-fry shrimp and egg, add vegetables and sauce, toss with noodles, top with peanuts.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'shrimp', 'Protein'),
    (8, 'oz', 'rice noodles', 'Grains'),
    (2, 'each', 'eggs', 'Protein'),
    (2, 'cups', 'bean sprouts & carrots', 'Produce'),
    (3, 'tbsp', 'pad thai sauce', 'Pantry'),
    (0.25, 'cup', 'crushed peanuts', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Sloppy Joes with Side Salad', 'American', 25, 'Brown turkey with onion and pepper, simmer in tomato sauce, serve on buns with a side salad.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (3, 'each', 'burger buns', 'Grains'),
    (1, 'cup', 'tomato sauce', 'Pantry'),
    (1, 'each', 'onion, diced', 'Produce'),
    (1, 'each', 'bell pepper, diced', 'Produce'),
    (3, 'cups', 'salad greens', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Grilled Chicken Quesadillas', 'Mexican', 20, 'Fill tortillas with chicken, cheese, and pepper; pan-crisp; serve with salsa.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, cooked & shredded', 'Protein'),
    (6, 'small', 'flour tortillas', 'Grains'),
    (1.5, 'cups', 'shredded cheese', 'Dairy'),
    (0.5, 'cup', 'salsa', 'Pantry'),
    (1, 'each', 'bell pepper', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Cod Piccata with Steamed Green Beans', 'Italian', 30, 'Dredge and pan-sear cod, make a butter-caper-lemon pan sauce, serve with steamed green beans.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'cod fillet', 'Protein'),
    (3, 'cups', 'green beans', 'Produce'),
    (2, 'tbsp', 'capers', 'Pantry'),
    (2, 'tbsp', 'butter', 'Dairy'),
    (1, 'each', 'lemon', 'Produce'),
    (2, 'tbsp', 'flour', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Vegetable Lo Mein with Chicken', 'Chinese', 30, 'Stir-fry chicken and vegetables, toss with cooked noodles and soy-sesame sauce.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, sliced', 'Protein'),
    (12, 'oz', 'lo mein noodles', 'Grains'),
    (3, 'cups', 'mixed stir-fry vegetables', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'sesame oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken & Veggie Kabobs with Rice Pilaf', 'Mediterranean', 35, 'Skewer and grill/bake chicken and vegetables; serve with rice pilaf.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, cubed', 'Protein'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'each', 'zucchini', 'Produce'),
    (1, 'each', 'bell pepper', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry'),
    (1, 'tsp', 'paprika', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Taco Salad', 'Mexican', 20, 'Brown turkey with seasoning, serve over lettuce with cheese, tomatoes, and tortilla strips.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (1, 'packet', 'taco seasoning', 'Pantry'),
    (4, 'cups', 'romaine lettuce', 'Produce'),
    (1, 'cup', 'shredded cheese', 'Dairy'),
    (1, 'cup', 'diced tomatoes', 'Produce'),
    (1, 'cup', 'tortilla strips', 'Grains')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Salmon Teriyaki with Broccoli', 'Japanese', 30, 'Glaze salmon with teriyaki and bake; serve with steamed broccoli and rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'salmon fillet', 'Protein'),
    (0.33, 'cup', 'teriyaki sauce', 'Pantry'),
    (3, 'cups', 'broccoli florets', 'Produce'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'tbsp', 'sesame seeds', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Noodle Stir-Fry', 'Chinese', 25, 'Stir-fry chicken and vegetables, toss with cooked noodles and soy sauce.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, sliced', 'Protein'),
    (12, 'oz', 'lo mein or spaghetti noodles', 'Grains'),
    (2, 'cups', 'shredded carrots & cabbage', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'vegetable oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Stuffed Bell Peppers with Ground Turkey & Rice', 'American', 40, 'Mix cooked turkey, rice, and sauce; stuff into halved peppers; bake at 375F for 25 min, top with cheese.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (4, 'each', 'bell peppers', 'Produce'),
    (1, 'lb', 'ground turkey', 'Protein'),
    (1, 'cup', 'cooked rice', 'Grains'),
    (1, 'cup', 'tomato sauce', 'Pantry'),
    (0.5, 'cup', 'shredded cheese', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Shrimp Scampi with Whole Wheat Linguine', 'Italian', 25, 'Saute shrimp with garlic and butter, toss with cooked linguine, lemon juice, and parsley.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'shrimp', 'Protein'),
    (12, 'oz', 'whole wheat linguine', 'Grains'),
    (4, 'tbsp', 'butter', 'Dairy'),
    (4, 'cloves', 'garlic', 'Produce'),
    (1, 'each', 'lemon', 'Produce'),
    (0.25, 'cup', 'parsley', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Tikka Masala with Basmati Rice', 'Indian', 40, 'Saute chicken and onion, add tomato sauce, yogurt, and spices, simmer, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, cubed', 'Protein'),
    (1, 'cup', 'basmati rice', 'Grains'),
    (1, 'can', 'tomato sauce', 'Pantry'),
    (0.5, 'cup', 'plain yogurt', 'Dairy'),
    (1, 'tbsp', 'mild garam masala', 'Pantry'),
    (1, 'each', 'onion', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey and Veggie Meatloaf with Mashed Sweet Potato', 'American', 45, 'Mix and bake turkey meatloaf at 375F for 40 min; boil and mash sweet potatoes with butter.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1.5, 'lb', 'ground turkey', 'Protein'),
    (1, 'each', 'carrot, grated', 'Produce'),
    (0.5, 'cup', 'breadcrumbs', 'Grains'),
    (1, 'each', 'egg', 'Protein'),
    (3, 'each', 'sweet potatoes', 'Produce'),
    (2, 'tbsp', 'butter', 'Dairy')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Black Bean Burrito Bowls', 'Mexican', 25, 'Warm beans and corn, layer over rice with cheese, avocado, and salsa.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'can', 'black beans', 'Pantry'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'cup', 'corn', 'Produce'),
    (1, 'cup', 'shredded cheese', 'Dairy'),
    (1, 'each', 'avocado', 'Produce'),
    (0.5, 'cup', 'salsa', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Garlic Butter Shrimp with Zucchini Noodles', 'Italian', 20, 'Saute shrimp in garlic butter; spiralize zucchini and toss in briefly; finish with lemon.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'shrimp', 'Protein'),
    (3, 'medium', 'zucchini', 'Produce'),
    (3, 'tbsp', 'butter', 'Dairy'),
    (4, 'cloves', 'garlic', 'Produce'),
    (1, 'each', 'lemon', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Chicken Fried Rice', 'Chinese', 25, 'Cook chicken, scramble in eggs and vegetables, add rice and soy sauce, toss together.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast, diced', 'Protein'),
    (3, 'cups', 'cooked rice (day-old)', 'Grains'),
    (2, 'each', 'eggs', 'Protein'),
    (1, 'cup', 'frozen peas and carrots', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Baked Chicken Tenders with Roasted Broccoli', 'American', 30, 'Bread chicken tenders with panko and egg, bake at 425F; roast broccoli alongside.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast tenders', 'Protein'),
    (1, 'cup', 'panko breadcrumbs', 'Grains'),
    (1, 'each', 'egg', 'Protein'),
    (3, 'cups', 'broccoli florets', 'Produce'),
    (2, 'tbsp', 'olive oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Salmon Poke Bowls', 'Hawaiian', 20, 'Marinate salmon cubes in soy sauce and sesame oil; serve over rice with cucumber and avocado.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'sushi-grade salmon, cubed', 'Protein'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'each', 'cucumber', 'Produce'),
    (1, 'each', 'avocado', 'Produce'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tsp', 'sesame oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Turkey Enchiladas', 'Mexican', 40, 'Brown turkey with onion, roll into tortillas, top with sauce and cheese, bake at 375F for 20 min.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'ground turkey', 'Protein'),
    (8, 'small', 'corn tortillas', 'Grains'),
    (2, 'cups', 'mild enchilada sauce', 'Pantry'),
    (1.5, 'cups', 'shredded cheese', 'Dairy'),
    (1, 'each', 'onion, diced', 'Produce')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Greek Chicken & Rice Bowls with Cucumber Tomato Salad', 'Mediterranean', 30, 'Grill or pan-sear seasoned chicken, serve over rice with a cucumber-tomato-feta salad.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (1, 'lb', 'chicken breast', 'Protein'),
    (1, 'cup', 'rice', 'Grains'),
    (1, 'each', 'cucumber', 'Produce'),
    (1, 'cup', 'cherry tomatoes', 'Produce'),
    (0.25, 'cup', 'feta cheese', 'Dairy'),
    (2, 'tbsp', 'olive oil', 'Pantry')
  ) as v(quantity, unit, name, category);

  with d as (
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
    values (p_household_id, 'Vegetable & Tofu Stir-Fry with Brown Rice', 'Chinese', 25, 'Pan-fry tofu until crisp, stir-fry with vegetables, toss in soy-sesame sauce, serve over rice.')
    returning id
  )
  insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
  select id, v.quantity, v.unit, v.name, v.category from d, (values
    (14, 'oz', 'firm tofu, cubed', 'Protein'),
    (3, 'cups', 'mixed stir-fry vegetables', 'Produce'),
    (1, 'cup', 'brown rice', 'Grains'),
    (3, 'tbsp', 'soy sauce', 'Pantry'),
    (1, 'tbsp', 'sesame oil', 'Pantry'),
    (1, 'tbsp', 'cornstarch', 'Pantry')
  ) as v(quantity, unit, name, category);

  -- ----- default cooking steps (re-expressed from 20260826224346) -----
  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 425°F.'),
    (2, 'Toss the chicken thighs and broccoli florets with oil, garlic, lemon juice, and oregano.'),
    (3, 'Spread on a sheet pan and roast for 30 minutes, until the chicken is cooked through.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Lemon Herb Chicken with Roasted Broccoli';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Brown the ground turkey in a skillet with taco seasoning.'),
    (2, 'Cook the rice according to package directions.'),
    (3, 'Divide the rice into bowls and top with the seasoned turkey.'),
    (4, 'Add cheese, avocado, and tomato, then serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Taco Bowls';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Pan-sear the salmon fillets until cooked through; set aside.'),
    (2, 'In the same pan, sauté the green beans in butter and garlic.'),
    (3, 'Squeeze lemon over the salmon and green beans.'),
    (4, 'Serve together.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Salmon with Garlic Green Beans';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the brown rice according to package directions.'),
    (2, 'Stir-fry the chicken breast until cooked through.'),
    (3, 'Add the mixed stir-fry vegetables and cook until crisp-tender.'),
    (4, 'Toss with soy-sesame sauce thickened with cornstarch.'),
    (5, 'Serve over the brown rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Stir-Fry with Brown Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Fill each tortilla with black beans, cheese, pepper, and corn.'),
    (2, 'Fold the tortillas in half.'),
    (3, 'Pan-crisp on both sides until golden and the cheese melts.'),
    (4, 'Slice and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Veggie & Black Bean Quesadillas';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and bake the turkey meatballs until cooked through.'),
    (2, 'Spiralize the zucchini into noodles.'),
    (3, 'Simmer the baked meatballs in marinara sauce.'),
    (4, 'Toss the zucchini noodles with the warm sauce and meatballs.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Meatballs with Zucchini Noodles';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Scramble the eggs in a hot pan or wok; set aside.'),
    (2, 'Cook the shrimp until pink and opaque.'),
    (3, 'Add the vegetables and cook briefly.'),
    (4, 'Add the cooked rice, scrambled eggs, and soy sauce, tossing to combine.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Shrimp Fried Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Sauté the chicken with peppers and onion, seasoned with fajita spices.'),
    (2, 'Cook the rice according to package directions.'),
    (3, 'Divide the rice into bowls and top with the chicken-pepper mixture.'),
    (4, 'Sprinkle with cheese and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Fajita Bowls';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 400°F.'),
    (2, 'Toss the vegetables with oil and roast.'),
    (3, 'Season the cod with oil and paprika, then add to the sheet pan for the final 15 minutes of roasting.'),
    (4, 'Serve the cod with the roasted vegetables.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Cod with Roasted Vegetables';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the whole wheat spaghetti according to package directions.'),
    (2, 'Brown the ground turkey with diced carrot and onion.'),
    (3, 'Stir in the marinara sauce and simmer.'),
    (4, 'Toss the sauce with the cooked spaghetti.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Whole Wheat Spaghetti with Turkey Bolognese';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Marinate the chicken, then thread onto skewers.'),
    (2, 'Grill or pan-sear the skewers until cooked through.'),
    (3, 'Mix yogurt, cucumber, and garlic to make the tzatziki.'),
    (4, 'Serve the skewers with pita and tzatziki.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Souvlaki with Tzatziki';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Stir-fry the beef until browned.'),
    (3, 'Add the broccoli and garlic, cooking until crisp-tender.'),
    (4, 'Toss with the soy-brown sugar sauce.'),
    (5, 'Serve over the rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Beef and Broccoli Stir-Fry';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 425°F.'),
    (2, 'Toss the chicken and vegetables with oil and fajita seasoning.'),
    (3, 'Spread on a sheet pan and roast for 20 minutes.'),
    (4, 'Serve with warm tortillas.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Sheet Pan Chicken Fajitas';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Grill the chicken until cooked through.'),
    (2, 'Slice the chicken.'),
    (3, 'Toss the romaine with parmesan, croutons, and dressing.'),
    (4, 'Top with the sliced chicken and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Grilled Chicken Caesar Salad';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and bake the seasoned tilapia until it flakes easily.'),
    (2, 'Toss the cabbage with yogurt and lime juice to make the slaw.'),
    (3, 'Flake the tilapia into warm tortillas.'),
    (4, 'Top with the slaw and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Tilapia Tacos with Cabbage Slaw';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Sauté the onion until softened.'),
    (3, 'Add the chickpeas, coconut milk, and curry powder; simmer.'),
    (4, 'Stir in the spinach until wilted.'),
    (5, 'Serve over the rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chickpea & Spinach Curry with Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Brown the ground turkey with onion and pepper.'),
    (2, 'Add the beans, tomatoes, and chili seasoning.'),
    (3, 'Simmer for 25 minutes, stirring occasionally.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Chili';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and cook the quinoa according to package directions.'),
    (2, 'Glaze the salmon with the honey-garlic-soy sauce.'),
    (3, 'Bake the salmon until cooked through.'),
    (4, 'Steam the broccoli.'),
    (5, 'Serve the salmon with quinoa and steamed broccoli.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Honey Garlic Salmon with Quinoa';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and bread the chicken.'),
    (2, 'Bake the breaded chicken until nearly cooked through.'),
    (3, 'Top with marinara sauce and mozzarella, then bake until the cheese melts.'),
    (4, 'Serve with a side salad.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Chicken Parmesan with Side Salad';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Scramble the eggs in a hot pan or wok; set aside.'),
    (2, 'Sauté the vegetables until tender.'),
    (3, 'Add the rice, scrambled eggs, and soy sauce, tossing to combine.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Veggie Fried Rice with Egg';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 425°F.'),
    (2, 'Cut the sweet potatoes into fries, toss with oil, and roast.'),
    (3, 'Grill or pan-fry the turkey patties until cooked through.'),
    (4, 'Assemble the burgers and serve with the sweet potato fries.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Burgers with Sweet Potato Fries';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Sauté the seasoned shrimp until pink and opaque.'),
    (2, 'Blend the avocado, sour cream, and lime juice into a crema.'),
    (3, 'Assemble the shrimp into warm tortillas.'),
    (4, 'Top with the avocado crema and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Shrimp Tacos with Avocado Crema';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the ziti according to package directions.'),
    (2, 'Brown the ground turkey.'),
    (3, 'Mix the turkey with the cooked ziti, marinara, spinach, and cheeses.'),
    (4, 'Transfer to a baking dish and bake until bubbly.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Ziti with Turkey & Spinach';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice and steam the broccoli.'),
    (2, 'Pan-sear the chicken until cooked through.'),
    (3, 'Glaze the chicken with teriyaki sauce.'),
    (4, 'Serve over rice with the steamed broccoli.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Teriyaki Bowls';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Thread the chicken and vegetables onto skewers.'),
    (3, 'Grill or bake the skewers until the chicken is cooked through.'),
    (4, 'Serve over the rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Mediterranean Chicken Skewers with Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and roast the sweet potato cubes until tender.'),
    (2, 'Warm the black beans with cumin.'),
    (3, 'Assemble the sweet potato and beans into tortillas.'),
    (4, 'Top with cheese and avocado, then serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Black Bean & Sweet Potato Tacos';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Pan-sear the salmon fillets until cooked through; set aside.'),
    (2, 'In the same pan, sauté the asparagus in butter and garlic.'),
    (3, 'Squeeze lemon over the salmon and asparagus.'),
    (4, 'Serve together.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Pan-Seared Salmon with Asparagus';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Brown the ground turkey with carrots and water chestnuts.'),
    (2, 'Stir in the soy-hoisin sauce and cook briefly.'),
    (3, 'Spoon the mixture into lettuce cups.'),
    (4, 'Serve immediately.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey & Veggie Stir-Fry Lettuce Wraps';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 425°F.'),
    (2, 'Toss the chicken thighs and carrots with oil, garlic, and thyme.'),
    (3, 'Spread on a sheet pan and roast for 35 minutes, until the chicken is cooked through.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Chicken Thighs with Roasted Carrots';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Soak the rice noodles according to package directions.'),
    (2, 'Stir-fry the shrimp and egg until the shrimp is cooked through.'),
    (3, 'Add the vegetables and pad thai sauce, cooking briefly.'),
    (4, 'Toss with the soaked noodles.'),
    (5, 'Top with peanuts and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Shrimp & Vegetable Pad Thai';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Brown the ground turkey with onion and pepper.'),
    (2, 'Stir in the tomato sauce and simmer.'),
    (3, 'Spoon onto buns.'),
    (4, 'Serve with a side salad.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Sloppy Joes with Side Salad';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Grill or cook the chicken, then slice or shred it.'),
    (2, 'Fill each tortilla with chicken, cheese, and pepper.'),
    (3, 'Fold and pan-crisp on both sides until golden and the cheese melts.'),
    (4, 'Slice and serve with salsa.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Grilled Chicken Quesadillas';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Dredge the cod lightly and pan-sear until cooked through; set aside.'),
    (2, 'In the same pan, make a butter-caper-lemon pan sauce.'),
    (3, 'Steam the green beans.'),
    (4, 'Serve the cod with the pan sauce and steamed green beans.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Cod Piccata with Steamed Green Beans';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the lo mein noodles according to package directions.'),
    (2, 'Stir-fry the chicken until cooked through.'),
    (3, 'Add the vegetables and cook until crisp-tender.'),
    (4, 'Toss with the cooked noodles and soy-sesame sauce.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Vegetable Lo Mein with Chicken';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice pilaf according to package directions.'),
    (2, 'Thread the chicken and vegetables onto skewers.'),
    (3, 'Grill or bake the skewers until the chicken is cooked through.'),
    (4, 'Serve with the rice pilaf.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken & Veggie Kabobs with Rice Pilaf';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Brown the ground turkey with taco seasoning.'),
    (2, 'Arrange the lettuce in bowls.'),
    (3, 'Top with the seasoned turkey, cheese, tomatoes, and tortilla strips.'),
    (4, 'Serve immediately.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Taco Salad';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven and cook the rice.'),
    (2, 'Glaze the salmon with teriyaki sauce.'),
    (3, 'Bake the salmon until cooked through.'),
    (4, 'Steam the broccoli.'),
    (5, 'Serve the salmon with rice and steamed broccoli.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Salmon Teriyaki with Broccoli';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the noodles according to package directions.'),
    (2, 'Stir-fry the chicken until cooked through.'),
    (3, 'Add the vegetables and cook until crisp-tender.'),
    (4, 'Toss with the cooked noodles and soy sauce.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Noodle Stir-Fry';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 375°F.'),
    (2, 'Mix the cooked turkey, rice, and sauce.'),
    (3, 'Stuff the mixture into the halved bell peppers.'),
    (4, 'Bake for 25 minutes, then top with cheese and bake briefly until melted.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Stuffed Bell Peppers with Ground Turkey & Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the linguine according to package directions.'),
    (2, 'Sauté the shrimp with garlic and butter until pink and opaque.'),
    (3, 'Toss with the cooked linguine, lemon juice, and parsley.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Shrimp Scampi with Whole Wheat Linguine';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the basmati rice according to package directions.'),
    (2, 'Sauté the chicken and onion until the chicken is browned.'),
    (3, 'Add the tomato sauce, yogurt, and spices, then simmer until the chicken is cooked through.'),
    (4, 'Serve over the basmati rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Tikka Masala with Basmati Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 375°F.'),
    (2, 'Mix the turkey meatloaf ingredients and shape into a loaf.'),
    (3, 'Bake for 40 minutes, until cooked through.'),
    (4, 'Boil the sweet potatoes until tender, then mash with butter.'),
    (5, 'Serve the meatloaf with the mashed sweet potato.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey and Veggie Meatloaf with Mashed Sweet Potato';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Warm the black beans and corn.'),
    (3, 'Layer the rice, beans, and corn in bowls.'),
    (4, 'Top with cheese, avocado, and salsa, then serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Black Bean Burrito Bowls';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Sauté the shrimp in garlic butter until pink and opaque; set aside.'),
    (2, 'Spiralize the zucchini into noodles.'),
    (3, 'Toss the zucchini noodles briefly in the same pan.'),
    (4, 'Return the shrimp to the pan, finish with lemon, and serve.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Garlic Butter Shrimp with Zucchini Noodles';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the chicken until done, then set aside.'),
    (2, 'Scramble the eggs with the vegetables in the same pan.'),
    (3, 'Add the rice, cooked chicken, and soy sauce, tossing to combine.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Chicken Fried Rice';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 425°F.'),
    (2, 'Bread the chicken tenders with egg and panko.'),
    (3, 'Arrange the tenders and broccoli on a sheet pan and bake until the chicken is cooked through.'),
    (4, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Baked Chicken Tenders with Roasted Broccoli';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Marinate the salmon cubes in soy sauce and sesame oil.'),
    (3, 'Divide the rice into bowls and top with the marinated salmon, cucumber, and avocado.'),
    (4, 'Serve immediately.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Salmon Poke Bowls';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Preheat the oven to 375°F.'),
    (2, 'Brown the ground turkey with onion.'),
    (3, 'Roll the turkey mixture into tortillas and place in a baking dish.'),
    (4, 'Top with enchilada sauce and cheese, then bake for 20 minutes.'),
    (5, 'Serve hot.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Turkey Enchiladas';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the rice according to package directions.'),
    (2, 'Grill or pan-sear the seasoned chicken until cooked through.'),
    (3, 'Toss the cucumber, tomato, and feta into a salad.'),
    (4, 'Slice the chicken and serve over rice with the salad.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Greek Chicken & Rice Bowls with Cucumber Tomato Salad';

  insert into public.dinner_steps (dinner_id, step_number, instruction)
  select d.id, v.step_number, v.instruction from public.dinners d, (values
    (1, 'Cook the brown rice according to package directions.'),
    (2, 'Pan-fry the tofu until crisp on all sides.'),
    (3, 'Add the vegetables and stir-fry until crisp-tender.'),
    (4, 'Toss in the soy-sesame sauce.'),
    (5, 'Serve over the brown rice.')
  ) as v(step_number, instruction)
    where d.household_id = p_household_id and d.name = 'Vegetable & Tofu Stir-Fry with Brown Rice';

  -- ----- default store rows + category assignments (re-expressed from 20260828000000) -----
  insert into public.grocery_store_rows (household_id, name, position) values
    (p_household_id, 'Dairy', 1), (p_household_id, 'Grains', 2), (p_household_id, 'Pantry', 3), (p_household_id, 'Produce', 4), (p_household_id, 'Protein', 5);

  insert into public.category_row_assignments (household_id, category, row_id)
  select p_household_id, v.category, r.id
  from (values ('Dairy'), ('Grains'), ('Pantry'), ('Produce'), ('Protein')) as v(category)
  join public.grocery_store_rows r on r.name = v.category and r.household_id = p_household_id;
end;
$fn$;
comment on function public.seed_default_household_catalog(uuid) is
  'Populates a household with the default 50-dinner catalog + cooking steps + 5 store rows and '
  'category assignments (re-expressed from the shipped seed migrations). Idempotent: a no-op if '
  'the household already has any dinner. security definer; not executable by authenticated.';

-- Only security-definer callers (handle_new_user, migrations) may run it.
-- Supabase auto-grants EXECUTE on new public functions to anon/authenticated/service_role, so
-- revoke from those explicitly, not just PUBLIC. Only security-definer callers run this.
revoke all on function public.seed_default_household_catalog(uuid) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. household_invites — story 006
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

comment on table public.household_invites is
  'A pending "this email may join my household" record, consumed by handle_new_user() at signup '
  '(story 007). Invite-sending UI + email are intent 007-auth-flows. Email stored as entered; '
  'all matching is lower(email).';

-- One pending invite per email per household.
create unique index if not exists household_invites_one_pending_per_email
  on public.household_invites (household_id, lower(email))
  where status = 'pending';

-- Fast lookup for the story-007 trigger: pending invites by email, across households.
create index if not exists household_invites_pending_email
  on public.household_invites (lower(email))
  where status = 'pending';

alter table public.household_invites enable row level security;

-- Members of the target household may read its invites.
create policy "Household invites readable by members"
  on public.household_invites for select
  to authenticated
  using (household_id = public.current_user_household_id());

-- An owner of the target household may create invites for it.
create policy "Household invites insertable by an owner"
  on public.household_invites for insert
  to authenticated
  with check (
    household_id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members
      where household_id = public.household_invites.household_id
        and profile_id = (select auth.uid())
        and role = 'owner'
    )
  );

-- An owner may update its household's invites (in practice: set status = 'revoked').
-- with check keeps the row in the owner's household and forbids client-side 'accepted'
-- (that transition is done only by handle_new_user(), which is security definer).
create policy "Household invites updatable by an owner"
  on public.household_invites for update
  to authenticated
  using (
    household_id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members
      where household_id = public.household_invites.household_id
        and profile_id = (select auth.uid())
        and role = 'owner'
    )
  )
  with check (
    household_id = public.current_user_household_id()
    and status in ('pending', 'revoked')
  );

-- No delete policy — invites are revoked, not deleted.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. handle_new_user() + trigger on auth.users — story 007
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email text := coalesce(new.email, '');
  v_invite public.household_invites%rowtype;
  v_household_id uuid;
begin
  -- Escape hatch for the founding-household migration (20260828234000): when it bootstraps a
  -- synthetic founding user in a fresh local/CI DB it provisions that user itself, so it sets
  -- this GUC for the insert to keep this trigger from also creating a household + seeding.
  -- Never set in normal operation.
  if coalesce(current_setting('app.provisioning_disabled', true), '') = 'on' then
    return new;
  end if;

  -- Every new auth user gets a profile.
  insert into public.profiles (id, display_name)
  values (new.id, null);

  -- Invite branch: oldest matching pending invite wins.
  if v_email <> '' then
    select * into v_invite
    from public.household_invites
    where lower(email) = lower(v_email)
      and status = 'pending'
    order by created_at asc
    limit 1;
  end if;

  if v_invite.id is not null then
    insert into public.household_members (household_id, profile_id, role)
    values (v_invite.household_id, new.id, 'member');

    update public.household_invites
    set status = 'accepted'
    where id = v_invite.id;
  else
    -- Fresh household + seeded catalog.
    insert into public.households (name)
    values (coalesce(nullif(split_part(v_email, '@', 1), ''), 'New') || '''s household')
    returning id into v_household_id;

    insert into public.household_members (household_id, profile_id, role)
    values (v_household_id, new.id, 'owner');

    perform public.seed_default_household_catalog(v_household_id);
  end if;

  return new;
end;
$fn$;

comment on function public.handle_new_user() is
  'Runs inside the auth.users INSERT transaction (story 007). Creates a profile, then either '
  'joins the oldest matching pending household_invite as a member, or creates a fresh owner '
  'household and seeds its default catalog. Any failure rolls back the whole signup.';

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
