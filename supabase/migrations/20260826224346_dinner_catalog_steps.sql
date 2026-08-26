-- Dinner Catalog: cooking steps (intent 001-weekly-dinner-planner, unit 001-dinner-catalog)
-- Story: 003-dinner-step-by-step-instructions (FR-8, added post-completion of 001-dinner-catalog)
-- See memory-bank/bolts/007-dinner-catalog/ddd-02-technical-design.md for design rationale.
-- Additive migration — does not modify 20260826175605_dinner_catalog_schema.sql.

create table if not exists public.dinner_steps (
  id uuid primary key default gen_random_uuid(),
  dinner_id uuid not null references public.dinners(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  instruction text not null,
  unique (dinner_id, step_number)
);

comment on table public.dinner_steps is 'One ordered, discrete cooking step within a dinner, for the cooking view (FR-8). Distinct from dinners.instructions, which stays as a one-line summary.';
comment on column public.dinner_steps.step_number is 'Unique per dinner; not required to be contiguous, only orderable.';

create index if not exists idx_dinner_steps_dinner_id on public.dinner_steps (dinner_id);

-- Row Level Security: same shape as dinners/dinner_ingredients — single shared
-- household login, no per-user roles, gate on authentication only.

alter table public.dinner_steps enable row level security;

create policy "Authenticated household can read dinner_steps"
  on public.dinner_steps for select
  to authenticated
  using (true);

create policy "Authenticated household can insert dinner_steps"
  on public.dinner_steps for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update dinner_steps"
  on public.dinner_steps for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete dinner_steps"
  on public.dinner_steps for delete
  to authenticated
  using (true);

-- Seed step content for all 50 seed dinners, expanding each dinner's one-line
-- `instructions` summary into discrete, ordered, imperative steps.
-- Idempotent: upserts on the table's natural key (dinner_id, step_number).

with d as (select id from public.dinners where name = 'Baked Lemon Herb Chicken with Roasted Broccoli')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 425°F.'),
  (2, 'Toss the chicken thighs and broccoli florets with oil, garlic, lemon juice, and oregano.'),
  (3, 'Spread on a sheet pan and roast for 30 minutes, until the chicken is cooked through.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Taco Bowls')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Brown the ground turkey in a skillet with taco seasoning.'),
  (2, 'Cook the rice according to package directions.'),
  (3, 'Divide the rice into bowls and top with the seasoned turkey.'),
  (4, 'Add cheese, avocado, and tomato, then serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Salmon with Garlic Green Beans')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Pan-sear the salmon fillets until cooked through; set aside.'),
  (2, 'In the same pan, sauté the green beans in butter and garlic.'),
  (3, 'Squeeze lemon over the salmon and green beans.'),
  (4, 'Serve together.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Stir-Fry with Brown Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the brown rice according to package directions.'),
  (2, 'Stir-fry the chicken breast until cooked through.'),
  (3, 'Add the mixed stir-fry vegetables and cook until crisp-tender.'),
  (4, 'Toss with soy-sesame sauce thickened with cornstarch.'),
  (5, 'Serve over the brown rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Veggie & Black Bean Quesadillas')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Fill each tortilla with black beans, cheese, pepper, and corn.'),
  (2, 'Fold the tortillas in half.'),
  (3, 'Pan-crisp on both sides until golden and the cheese melts.'),
  (4, 'Slice and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Meatballs with Zucchini Noodles')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and bake the turkey meatballs until cooked through.'),
  (2, 'Spiralize the zucchini into noodles.'),
  (3, 'Simmer the baked meatballs in marinara sauce.'),
  (4, 'Toss the zucchini noodles with the warm sauce and meatballs.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Shrimp Fried Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Scramble the eggs in a hot pan or wok; set aside.'),
  (2, 'Cook the shrimp until pink and opaque.'),
  (3, 'Add the vegetables and cook briefly.'),
  (4, 'Add the cooked rice, scrambled eggs, and soy sauce, tossing to combine.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Fajita Bowls')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Sauté the chicken with peppers and onion, seasoned with fajita spices.'),
  (2, 'Cook the rice according to package directions.'),
  (3, 'Divide the rice into bowls and top with the chicken-pepper mixture.'),
  (4, 'Sprinkle with cheese and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Cod with Roasted Vegetables')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 400°F.'),
  (2, 'Toss the vegetables with oil and roast.'),
  (3, 'Season the cod with oil and paprika, then add to the sheet pan for the final 15 minutes of roasting.'),
  (4, 'Serve the cod with the roasted vegetables.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Whole Wheat Spaghetti with Turkey Bolognese')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the whole wheat spaghetti according to package directions.'),
  (2, 'Brown the ground turkey with diced carrot and onion.'),
  (3, 'Stir in the marinara sauce and simmer.'),
  (4, 'Toss the sauce with the cooked spaghetti.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Souvlaki with Tzatziki')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Marinate the chicken, then thread onto skewers.'),
  (2, 'Grill or pan-sear the skewers until cooked through.'),
  (3, 'Mix yogurt, cucumber, and garlic to make the tzatziki.'),
  (4, 'Serve the skewers with pita and tzatziki.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Beef and Broccoli Stir-Fry')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Stir-fry the beef until browned.'),
  (3, 'Add the broccoli and garlic, cooking until crisp-tender.'),
  (4, 'Toss with the soy-brown sugar sauce.'),
  (5, 'Serve over the rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Sheet Pan Chicken Fajitas')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 425°F.'),
  (2, 'Toss the chicken and vegetables with oil and fajita seasoning.'),
  (3, 'Spread on a sheet pan and roast for 20 minutes.'),
  (4, 'Serve with warm tortillas.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Grilled Chicken Caesar Salad')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Grill the chicken until cooked through.'),
  (2, 'Slice the chicken.'),
  (3, 'Toss the romaine with parmesan, croutons, and dressing.'),
  (4, 'Top with the sliced chicken and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Tilapia Tacos with Cabbage Slaw')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and bake the seasoned tilapia until it flakes easily.'),
  (2, 'Toss the cabbage with yogurt and lime juice to make the slaw.'),
  (3, 'Flake the tilapia into warm tortillas.'),
  (4, 'Top with the slaw and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chickpea & Spinach Curry with Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Sauté the onion until softened.'),
  (3, 'Add the chickpeas, coconut milk, and curry powder; simmer.'),
  (4, 'Stir in the spinach until wilted.'),
  (5, 'Serve over the rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Chili')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Brown the ground turkey with onion and pepper.'),
  (2, 'Add the beans, tomatoes, and chili seasoning.'),
  (3, 'Simmer for 25 minutes, stirring occasionally.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Honey Garlic Salmon with Quinoa')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and cook the quinoa according to package directions.'),
  (2, 'Glaze the salmon with the honey-garlic-soy sauce.'),
  (3, 'Bake the salmon until cooked through.'),
  (4, 'Steam the broccoli.'),
  (5, 'Serve the salmon with quinoa and steamed broccoli.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Chicken Parmesan with Side Salad')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and bread the chicken.'),
  (2, 'Bake the breaded chicken until nearly cooked through.'),
  (3, 'Top with marinara sauce and mozzarella, then bake until the cheese melts.'),
  (4, 'Serve with a side salad.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Veggie Fried Rice with Egg')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Scramble the eggs in a hot pan or wok; set aside.'),
  (2, 'Sauté the vegetables until tender.'),
  (3, 'Add the rice, scrambled eggs, and soy sauce, tossing to combine.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Burgers with Sweet Potato Fries')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 425°F.'),
  (2, 'Cut the sweet potatoes into fries, toss with oil, and roast.'),
  (3, 'Grill or pan-fry the turkey patties until cooked through.'),
  (4, 'Assemble the burgers and serve with the sweet potato fries.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Shrimp Tacos with Avocado Crema')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Sauté the seasoned shrimp until pink and opaque.'),
  (2, 'Blend the avocado, sour cream, and lime juice into a crema.'),
  (3, 'Assemble the shrimp into warm tortillas.'),
  (4, 'Top with the avocado crema and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Ziti with Turkey & Spinach')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the ziti according to package directions.'),
  (2, 'Brown the ground turkey.'),
  (3, 'Mix the turkey with the cooked ziti, marinara, spinach, and cheeses.'),
  (4, 'Transfer to a baking dish and bake until bubbly.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Teriyaki Bowls')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice and steam the broccoli.'),
  (2, 'Pan-sear the chicken until cooked through.'),
  (3, 'Glaze the chicken with teriyaki sauce.'),
  (4, 'Serve over rice with the steamed broccoli.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Mediterranean Chicken Skewers with Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Thread the chicken and vegetables onto skewers.'),
  (3, 'Grill or bake the skewers until the chicken is cooked through.'),
  (4, 'Serve over the rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Black Bean & Sweet Potato Tacos')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and roast the sweet potato cubes until tender.'),
  (2, 'Warm the black beans with cumin.'),
  (3, 'Assemble the sweet potato and beans into tortillas.'),
  (4, 'Top with cheese and avocado, then serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Pan-Seared Salmon with Asparagus')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Pan-sear the salmon fillets until cooked through; set aside.'),
  (2, 'In the same pan, sauté the asparagus in butter and garlic.'),
  (3, 'Squeeze lemon over the salmon and asparagus.'),
  (4, 'Serve together.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey & Veggie Stir-Fry Lettuce Wraps')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Brown the ground turkey with carrots and water chestnuts.'),
  (2, 'Stir in the soy-hoisin sauce and cook briefly.'),
  (3, 'Spoon the mixture into lettuce cups.'),
  (4, 'Serve immediately.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Chicken Thighs with Roasted Carrots')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 425°F.'),
  (2, 'Toss the chicken thighs and carrots with oil, garlic, and thyme.'),
  (3, 'Spread on a sheet pan and roast for 35 minutes, until the chicken is cooked through.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Shrimp & Vegetable Pad Thai')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Soak the rice noodles according to package directions.'),
  (2, 'Stir-fry the shrimp and egg until the shrimp is cooked through.'),
  (3, 'Add the vegetables and pad thai sauce, cooking briefly.'),
  (4, 'Toss with the soaked noodles.'),
  (5, 'Top with peanuts and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Sloppy Joes with Side Salad')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Brown the ground turkey with onion and pepper.'),
  (2, 'Stir in the tomato sauce and simmer.'),
  (3, 'Spoon onto buns.'),
  (4, 'Serve with a side salad.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Grilled Chicken Quesadillas')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Grill or cook the chicken, then slice or shred it.'),
  (2, 'Fill each tortilla with chicken, cheese, and pepper.'),
  (3, 'Fold and pan-crisp on both sides until golden and the cheese melts.'),
  (4, 'Slice and serve with salsa.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Cod Piccata with Steamed Green Beans')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Dredge the cod lightly and pan-sear until cooked through; set aside.'),
  (2, 'In the same pan, make a butter-caper-lemon pan sauce.'),
  (3, 'Steam the green beans.'),
  (4, 'Serve the cod with the pan sauce and steamed green beans.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Vegetable Lo Mein with Chicken')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the lo mein noodles according to package directions.'),
  (2, 'Stir-fry the chicken until cooked through.'),
  (3, 'Add the vegetables and cook until crisp-tender.'),
  (4, 'Toss with the cooked noodles and soy-sesame sauce.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken & Veggie Kabobs with Rice Pilaf')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice pilaf according to package directions.'),
  (2, 'Thread the chicken and vegetables onto skewers.'),
  (3, 'Grill or bake the skewers until the chicken is cooked through.'),
  (4, 'Serve with the rice pilaf.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Taco Salad')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Brown the ground turkey with taco seasoning.'),
  (2, 'Arrange the lettuce in bowls.'),
  (3, 'Top with the seasoned turkey, cheese, tomatoes, and tortilla strips.'),
  (4, 'Serve immediately.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Salmon Teriyaki with Broccoli')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven and cook the rice.'),
  (2, 'Glaze the salmon with teriyaki sauce.'),
  (3, 'Bake the salmon until cooked through.'),
  (4, 'Steam the broccoli.'),
  (5, 'Serve the salmon with rice and steamed broccoli.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Noodle Stir-Fry')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the noodles according to package directions.'),
  (2, 'Stir-fry the chicken until cooked through.'),
  (3, 'Add the vegetables and cook until crisp-tender.'),
  (4, 'Toss with the cooked noodles and soy sauce.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Stuffed Bell Peppers with Ground Turkey & Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 375°F.'),
  (2, 'Mix the cooked turkey, rice, and sauce.'),
  (3, 'Stuff the mixture into the halved bell peppers.'),
  (4, 'Bake for 25 minutes, then top with cheese and bake briefly until melted.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Shrimp Scampi with Whole Wheat Linguine')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the linguine according to package directions.'),
  (2, 'Sauté the shrimp with garlic and butter until pink and opaque.'),
  (3, 'Toss with the cooked linguine, lemon juice, and parsley.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Tikka Masala with Basmati Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the basmati rice according to package directions.'),
  (2, 'Sauté the chicken and onion until the chicken is browned.'),
  (3, 'Add the tomato sauce, yogurt, and spices, then simmer until the chicken is cooked through.'),
  (4, 'Serve over the basmati rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey and Veggie Meatloaf with Mashed Sweet Potato')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 375°F.'),
  (2, 'Mix the turkey meatloaf ingredients and shape into a loaf.'),
  (3, 'Bake for 40 minutes, until cooked through.'),
  (4, 'Boil the sweet potatoes until tender, then mash with butter.'),
  (5, 'Serve the meatloaf with the mashed sweet potato.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Black Bean Burrito Bowls')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Warm the black beans and corn.'),
  (3, 'Layer the rice, beans, and corn in bowls.'),
  (4, 'Top with cheese, avocado, and salsa, then serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Garlic Butter Shrimp with Zucchini Noodles')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Sauté the shrimp in garlic butter until pink and opaque; set aside.'),
  (2, 'Spiralize the zucchini into noodles.'),
  (3, 'Toss the zucchini noodles briefly in the same pan.'),
  (4, 'Return the shrimp to the pan, finish with lemon, and serve.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Chicken Fried Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the chicken until done, then set aside.'),
  (2, 'Scramble the eggs with the vegetables in the same pan.'),
  (3, 'Add the rice, cooked chicken, and soy sauce, tossing to combine.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Baked Chicken Tenders with Roasted Broccoli')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 425°F.'),
  (2, 'Bread the chicken tenders with egg and panko.'),
  (3, 'Arrange the tenders and broccoli on a sheet pan and bake until the chicken is cooked through.'),
  (4, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Salmon Poke Bowls')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Marinate the salmon cubes in soy sauce and sesame oil.'),
  (3, 'Divide the rice into bowls and top with the marinated salmon, cucumber, and avocado.'),
  (4, 'Serve immediately.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Turkey Enchiladas')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Preheat the oven to 375°F.'),
  (2, 'Brown the ground turkey with onion.'),
  (3, 'Roll the turkey mixture into tortillas and place in a baking dish.'),
  (4, 'Top with enchilada sauce and cheese, then bake for 20 minutes.'),
  (5, 'Serve hot.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Greek Chicken & Rice Bowls with Cucumber Tomato Salad')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the rice according to package directions.'),
  (2, 'Grill or pan-sear the seasoned chicken until cooked through.'),
  (3, 'Toss the cucumber, tomato, and feta into a salad.'),
  (4, 'Slice the chicken and serve over rice with the salad.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;

with d as (select id from public.dinners where name = 'Vegetable & Tofu Stir-Fry with Brown Rice')
insert into public.dinner_steps (dinner_id, step_number, instruction)
select d.id, v.step_number, v.instruction from d, (values
  (1, 'Cook the brown rice according to package directions.'),
  (2, 'Pan-fry the tofu until crisp on all sides.'),
  (3, 'Add the vegetables and stir-fry until crisp-tender.'),
  (4, 'Toss in the soy-sesame sauce.'),
  (5, 'Serve over the brown rice.')
) as v(step_number, instruction)
on conflict (dinner_id, step_number) do update set instruction = excluded.instruction;
