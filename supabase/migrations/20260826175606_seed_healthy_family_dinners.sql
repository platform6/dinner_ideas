-- Seed data: 50 healthy family dinners (intent 001-weekly-dinner-planner, unit 001-dinner-catalog)
-- Story: 002-seed-healthy-family-dinners
-- Source content: memory-bank/intents/001-weekly-dinner-planner/units/001-dinner-catalog/seed-data-draft.md
--
-- Idempotent: each dinner insert is `ON CONFLICT (name) DO NOTHING RETURNING id`. If the dinner
-- already exists, the CTE returns no row, so the dependent ingredient insert also inserts nothing.
-- Re-running this migration is a safe no-op.

-- 1. Baked Lemon Herb Chicken with Roasted Broccoli
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Lemon Herb Chicken with Roasted Broccoli', 'American', 35, true, 'Toss chicken and broccoli with oil, garlic, lemon juice, and oregano; roast at 425F for 30 min.')
  on conflict (name) do nothing returning id
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

-- 2. Turkey Taco Bowls
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Taco Bowls', 'Mexican', 25, true, 'Brown turkey with seasoning, serve over rice with cheese, avocado, and tomato.')
  on conflict (name) do nothing returning id
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

-- 3. Salmon with Garlic Green Beans
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Salmon with Garlic Green Beans', 'American', 25, false, 'Pan-sear salmon; saute green beans in butter and garlic; finish both with lemon.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'salmon fillet', 'Protein'),
  (3, 'cups', 'green beans', 'Produce'),
  (3, 'cloves', 'garlic', 'Produce'),
  (2, 'tbsp', 'butter', 'Dairy'),
  (1, 'each', 'lemon', 'Produce')
) as v(quantity, unit, name, category);

-- 4. Chicken Stir-Fry with Brown Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Stir-Fry with Brown Rice', 'Chinese', 30, true, 'Stir-fry chicken and vegetables, toss in soy-sesame sauce thickened with cornstarch, serve over rice.')
  on conflict (name) do nothing returning id
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

-- 5. Veggie & Black Bean Quesadillas
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Veggie & Black Bean Quesadillas', 'Mexican', 20, true, 'Fill tortillas with beans, cheese, pepper, and corn; pan-crisp until golden.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (6, 'small', 'flour tortillas', 'Grains'),
  (1, 'can', 'black beans', 'Pantry'),
  (1.5, 'cups', 'shredded cheese', 'Dairy'),
  (1, 'each', 'bell pepper', 'Produce'),
  (0.5, 'cup', 'corn', 'Produce')
) as v(quantity, unit, name, category);

-- 6. Turkey Meatballs with Zucchini Noodles
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Meatballs with Zucchini Noodles', 'Italian', 35, true, 'Bake turkey meatballs; spiralize zucchini; simmer meatballs in marinara and serve over noodles.')
  on conflict (name) do nothing returning id
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

-- 7. Shrimp Fried Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Shrimp Fried Rice', 'Chinese', 25, true, 'Scramble eggs, add shrimp and vegetables, toss with rice and soy sauce.')
  on conflict (name) do nothing returning id
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

-- 8. Chicken Fajita Bowls
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Fajita Bowls', 'Mexican', 30, true, 'Saute chicken, peppers, and onion with seasoning; serve over rice with cheese.')
  on conflict (name) do nothing returning id
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

-- 9. Baked Cod with Roasted Vegetables
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Cod with Roasted Vegetables', 'American', 30, false, 'Roast vegetables at 400F, add cod for the final 15 minutes with oil and paprika.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'cod fillet', 'Protein'),
  (2, 'cups', 'carrots, chopped', 'Produce'),
  (2, 'cups', 'zucchini, chopped', 'Produce'),
  (2, 'tbsp', 'olive oil', 'Pantry'),
  (1, 'tsp', 'paprika', 'Pantry')
) as v(quantity, unit, name, category);

-- 10. Whole Wheat Spaghetti with Turkey Bolognese
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Whole Wheat Spaghetti with Turkey Bolognese', 'Italian', 35, true, 'Brown turkey with carrot and onion, simmer in marinara, toss with cooked spaghetti.')
  on conflict (name) do nothing returning id
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

-- 11. Chicken Souvlaki with Tzatziki
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Souvlaki with Tzatziki', 'Mediterranean', 35, true, 'Marinate and grill/pan-sear chicken skewers; mix yogurt, cucumber, and garlic for tzatziki; serve with pita.')
  on conflict (name) do nothing returning id
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

-- 12. Beef and Broccoli Stir-Fry
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Beef and Broccoli Stir-Fry', 'Chinese', 30, true, 'Stir-fry beef, add broccoli and garlic, toss in soy-brown sugar sauce, serve over rice.')
  on conflict (name) do nothing returning id
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

-- 13. Sheet Pan Chicken Fajitas
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Sheet Pan Chicken Fajitas', 'Mexican', 30, true, 'Toss chicken and vegetables with oil and seasoning; roast on one sheet pan at 425F for 20 min; serve with tortillas.')
  on conflict (name) do nothing returning id
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

-- 14. Grilled Chicken Caesar Salad
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Grilled Chicken Caesar Salad', 'American', 25, false, 'Grill chicken, slice, toss with romaine, parmesan, croutons, and dressing.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast', 'Protein'),
  (2, 'heads', 'romaine lettuce', 'Produce'),
  (0.5, 'cup', 'parmesan', 'Dairy'),
  (1, 'cup', 'croutons', 'Grains'),
  (0.25, 'cup', 'light Caesar dressing', 'Pantry')
) as v(quantity, unit, name, category);

-- 15. Baked Tilapia Tacos with Cabbage Slaw
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Tilapia Tacos with Cabbage Slaw', 'Mexican', 25, false, 'Bake seasoned tilapia; toss cabbage with yogurt and lime for slaw; assemble tacos.')
  on conflict (name) do nothing returning id
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

-- 16. Chickpea & Spinach Curry with Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chickpea & Spinach Curry with Rice', 'Indian', 30, false, 'Saute onion, add chickpeas, coconut milk, and curry powder, simmer, stir in spinach, serve over rice.')
  on conflict (name) do nothing returning id
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

-- 17. Turkey Chili
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Chili', 'American', 40, true, 'Brown turkey with onion and pepper, add beans, tomatoes, and seasoning, simmer 25 min.')
  on conflict (name) do nothing returning id
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

-- 18. Honey Garlic Salmon with Quinoa
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Honey Garlic Salmon with Quinoa', 'American/Asian fusion', 30, false, 'Glaze salmon with honey-garlic-soy sauce and bake; serve with quinoa and steamed broccoli.')
  on conflict (name) do nothing returning id
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

-- 19. Baked Chicken Parmesan with Side Salad
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Chicken Parmesan with Side Salad', 'Italian', 40, true, 'Bread and bake chicken, top with sauce and mozzarella, bake until melted; serve with salad.')
  on conflict (name) do nothing returning id
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

-- 20. Veggie Fried Rice with Egg
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Veggie Fried Rice with Egg', 'Chinese', 25, true, 'Scramble eggs, saute vegetables, add rice and soy sauce, toss together.')
  on conflict (name) do nothing returning id
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

-- 21. Turkey Burgers with Sweet Potato Fries
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Burgers with Sweet Potato Fries', 'American', 35, true, 'Cut and roast sweet potato fries with oil at 425F; grill or pan-fry turkey patties; assemble burgers.')
  on conflict (name) do nothing returning id
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

-- 22. Shrimp Tacos with Avocado Crema
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Shrimp Tacos with Avocado Crema', 'Mexican', 25, false, 'Saute seasoned shrimp; blend avocado, sour cream, and lime for crema; assemble tacos.')
  on conflict (name) do nothing returning id
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

-- 23. Baked Ziti with Turkey & Spinach
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Ziti with Turkey & Spinach', 'Italian', 40, true, 'Brown turkey, mix with cooked ziti, marinara, spinach, and cheeses; bake until bubbly.')
  on conflict (name) do nothing returning id
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

-- 24. Chicken Teriyaki Bowls
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Teriyaki Bowls', 'Japanese', 30, true, 'Pan-sear chicken, glaze with teriyaki sauce, serve over rice with steamed broccoli.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken thighs', 'Protein'),
  (1, 'cup', 'rice', 'Grains'),
  (0.33, 'cup', 'teriyaki sauce', 'Pantry'),
  (2, 'cups', 'steamed broccoli', 'Produce'),
  (1, 'tbsp', 'sesame seeds', 'Pantry')
) as v(quantity, unit, name, category);

-- 25. Mediterranean Chicken Skewers with Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Mediterranean Chicken Skewers with Rice', 'Mediterranean', 35, true, 'Skewer chicken with vegetables, grill or bake, serve over rice.')
  on conflict (name) do nothing returning id
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

-- 26. Black Bean & Sweet Potato Tacos
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Black Bean & Sweet Potato Tacos', 'Mexican', 30, false, 'Roast sweet potato cubes, warm black beans with cumin, assemble tacos with cheese and avocado.')
  on conflict (name) do nothing returning id
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

-- 27. Pan-Seared Salmon with Asparagus
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Pan-Seared Salmon with Asparagus', 'American', 20, false, 'Pan-sear salmon; saute asparagus with butter and garlic; finish with lemon.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'salmon fillet', 'Protein'),
  (2, 'bunches', 'asparagus', 'Produce'),
  (2, 'tbsp', 'butter', 'Dairy'),
  (1, 'each', 'lemon', 'Produce'),
  (2, 'cloves', 'garlic', 'Produce')
) as v(quantity, unit, name, category);

-- 28. Turkey & Veggie Stir-Fry Lettuce Wraps
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey & Veggie Stir-Fry Lettuce Wraps', 'Asian', 25, false, 'Brown turkey with carrots and water chestnuts in soy-hoisin sauce; serve in lettuce cups.')
  on conflict (name) do nothing returning id
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

-- 29. Baked Chicken Thighs with Roasted Carrots
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Chicken Thighs with Roasted Carrots', 'American', 40, true, 'Toss chicken and carrots with oil, garlic, and thyme; roast at 425F for 35 min.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1.5, 'lb', 'chicken thighs', 'Protein'),
  (4, 'cups', 'carrots, chopped', 'Produce'),
  (2, 'tbsp', 'olive oil', 'Pantry'),
  (1, 'tsp', 'thyme', 'Pantry'),
  (2, 'cloves', 'garlic', 'Produce')
) as v(quantity, unit, name, category);

-- 30. Shrimp & Vegetable Pad Thai
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Shrimp & Vegetable Pad Thai', 'Thai', 35, false, 'Soak noodles, stir-fry shrimp and egg, add vegetables and sauce, toss with noodles, top with peanuts.')
  on conflict (name) do nothing returning id
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

-- 31. Turkey Sloppy Joes with Side Salad
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Sloppy Joes with Side Salad', 'American', 25, true, 'Brown turkey with onion and pepper, simmer in tomato sauce, serve on buns with a side salad.')
  on conflict (name) do nothing returning id
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

-- 32. Grilled Chicken Quesadillas
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Grilled Chicken Quesadillas', 'Mexican', 20, true, 'Fill tortillas with chicken, cheese, and pepper; pan-crisp; serve with salsa.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast, cooked & shredded', 'Protein'),
  (6, 'small', 'flour tortillas', 'Grains'),
  (1.5, 'cups', 'shredded cheese', 'Dairy'),
  (0.5, 'cup', 'salsa', 'Pantry'),
  (1, 'each', 'bell pepper', 'Produce')
) as v(quantity, unit, name, category);

-- 33. Cod Piccata with Steamed Green Beans
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Cod Piccata with Steamed Green Beans', 'Italian', 30, false, 'Dredge and pan-sear cod, make a butter-caper-lemon pan sauce, serve with steamed green beans.')
  on conflict (name) do nothing returning id
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

-- 34. Vegetable Lo Mein with Chicken
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Vegetable Lo Mein with Chicken', 'Chinese', 30, true, 'Stir-fry chicken and vegetables, toss with cooked noodles and soy-sesame sauce.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast, sliced', 'Protein'),
  (12, 'oz', 'lo mein noodles', 'Grains'),
  (3, 'cups', 'mixed stir-fry vegetables', 'Produce'),
  (3, 'tbsp', 'soy sauce', 'Pantry'),
  (1, 'tbsp', 'sesame oil', 'Pantry')
) as v(quantity, unit, name, category);

-- 35. Chicken & Veggie Kabobs with Rice Pilaf
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken & Veggie Kabobs with Rice Pilaf', 'Mediterranean', 35, true, 'Skewer and grill/bake chicken and vegetables; serve with rice pilaf.')
  on conflict (name) do nothing returning id
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

-- 36. Turkey Taco Salad
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Taco Salad', 'Mexican', 20, false, 'Brown turkey with seasoning, serve over lettuce with cheese, tomatoes, and tortilla strips.')
  on conflict (name) do nothing returning id
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

-- 37. Baked Salmon Teriyaki with Broccoli
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Salmon Teriyaki with Broccoli', 'Japanese', 30, false, 'Glaze salmon with teriyaki and bake; serve with steamed broccoli and rice.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'salmon fillet', 'Protein'),
  (0.33, 'cup', 'teriyaki sauce', 'Pantry'),
  (3, 'cups', 'broccoli florets', 'Produce'),
  (1, 'cup', 'rice', 'Grains'),
  (1, 'tbsp', 'sesame seeds', 'Pantry')
) as v(quantity, unit, name, category);

-- 38. Chicken Noodle Stir-Fry
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Noodle Stir-Fry', 'Chinese', 25, true, 'Stir-fry chicken and vegetables, toss with cooked noodles and soy sauce.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast, sliced', 'Protein'),
  (12, 'oz', 'lo mein or spaghetti noodles', 'Grains'),
  (2, 'cups', 'shredded carrots & cabbage', 'Produce'),
  (3, 'tbsp', 'soy sauce', 'Pantry'),
  (1, 'tbsp', 'vegetable oil', 'Pantry')
) as v(quantity, unit, name, category);

-- 39. Stuffed Bell Peppers with Ground Turkey & Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Stuffed Bell Peppers with Ground Turkey & Rice', 'American', 40, true, 'Mix cooked turkey, rice, and sauce; stuff into halved peppers; bake at 375F for 25 min, top with cheese.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (4, 'each', 'bell peppers', 'Produce'),
  (1, 'lb', 'ground turkey', 'Protein'),
  (1, 'cup', 'cooked rice', 'Grains'),
  (1, 'cup', 'tomato sauce', 'Pantry'),
  (0.5, 'cup', 'shredded cheese', 'Dairy')
) as v(quantity, unit, name, category);

-- 40. Shrimp Scampi with Whole Wheat Linguine
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Shrimp Scampi with Whole Wheat Linguine', 'Italian', 25, false, 'Saute shrimp with garlic and butter, toss with cooked linguine, lemon juice, and parsley.')
  on conflict (name) do nothing returning id
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

-- 41. Chicken Tikka Masala with Basmati Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Tikka Masala with Basmati Rice', 'Indian', 40, false, 'Saute chicken and onion, add tomato sauce, yogurt, and spices, simmer, serve over rice.')
  on conflict (name) do nothing returning id
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

-- 42. Turkey and Veggie Meatloaf with Mashed Sweet Potato
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey and Veggie Meatloaf with Mashed Sweet Potato', 'American', 45, true, 'Mix and bake turkey meatloaf at 375F for 40 min; boil and mash sweet potatoes with butter.')
  on conflict (name) do nothing returning id
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

-- 43. Black Bean Burrito Bowls
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Black Bean Burrito Bowls', 'Mexican', 25, true, 'Warm beans and corn, layer over rice with cheese, avocado, and salsa.')
  on conflict (name) do nothing returning id
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

-- 44. Garlic Butter Shrimp with Zucchini Noodles
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Garlic Butter Shrimp with Zucchini Noodles', 'Italian', 20, false, 'Saute shrimp in garlic butter; spiralize zucchini and toss in briefly; finish with lemon.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'shrimp', 'Protein'),
  (3, 'medium', 'zucchini', 'Produce'),
  (3, 'tbsp', 'butter', 'Dairy'),
  (4, 'cloves', 'garlic', 'Produce'),
  (1, 'each', 'lemon', 'Produce')
) as v(quantity, unit, name, category);

-- 45. Chicken Fried Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Chicken Fried Rice', 'Chinese', 25, true, 'Cook chicken, scramble in eggs and vegetables, add rice and soy sauce, toss together.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast, diced', 'Protein'),
  (3, 'cups', 'cooked rice (day-old)', 'Grains'),
  (2, 'each', 'eggs', 'Protein'),
  (1, 'cup', 'frozen peas and carrots', 'Produce'),
  (3, 'tbsp', 'soy sauce', 'Pantry')
) as v(quantity, unit, name, category);

-- 46. Baked Chicken Tenders with Roasted Broccoli
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Baked Chicken Tenders with Roasted Broccoli', 'American', 30, true, 'Bread chicken tenders with panko and egg, bake at 425F; roast broccoli alongside.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'chicken breast tenders', 'Protein'),
  (1, 'cup', 'panko breadcrumbs', 'Grains'),
  (1, 'each', 'egg', 'Protein'),
  (3, 'cups', 'broccoli florets', 'Produce'),
  (2, 'tbsp', 'olive oil', 'Pantry')
) as v(quantity, unit, name, category);

-- 47. Salmon Poke Bowls
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Salmon Poke Bowls', 'Hawaiian', 20, false, 'Marinate salmon cubes in soy sauce and sesame oil; serve over rice with cucumber and avocado.')
  on conflict (name) do nothing returning id
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

-- 48. Turkey Enchiladas
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Turkey Enchiladas', 'Mexican', 40, true, 'Brown turkey with onion, roll into tortillas, top with sauce and cheese, bake at 375F for 20 min.')
  on conflict (name) do nothing returning id
)
insert into public.dinner_ingredients (dinner_id, quantity, unit, name, category)
select id, v.quantity, v.unit, v.name, v.category from d, (values
  (1, 'lb', 'ground turkey', 'Protein'),
  (8, 'small', 'corn tortillas', 'Grains'),
  (2, 'cups', 'mild enchilada sauce', 'Pantry'),
  (1.5, 'cups', 'shredded cheese', 'Dairy'),
  (1, 'each', 'onion, diced', 'Produce')
) as v(quantity, unit, name, category);

-- 49. Greek Chicken & Rice Bowls with Cucumber Tomato Salad
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Greek Chicken & Rice Bowls with Cucumber Tomato Salad', 'Mediterranean', 30, true, 'Grill or pan-sear seasoned chicken, serve over rice with a cucumber-tomato-feta salad.')
  on conflict (name) do nothing returning id
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

-- 50. Vegetable & Tofu Stir-Fry with Brown Rice
with d as (
  insert into public.dinners (name, cuisine_type, cook_time_minutes, rosie_approved, instructions)
  values ('Vegetable & Tofu Stir-Fry with Brown Rice', 'Chinese', 25, false, 'Pan-fry tofu until crisp, stir-fry with vegetables, toss in soy-sesame sauce, serve over rice.')
  on conflict (name) do nothing returning id
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
