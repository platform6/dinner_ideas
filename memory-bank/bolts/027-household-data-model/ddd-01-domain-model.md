---
stage: model
bolt: 027-household-data-model
created: 2026-08-29T00:05:00Z
---

## Static Model: household-data-model (bolt 027 — scoping the domain tables)

Continues unit `001-household-data-model`. Bolt 026 created the `Household` aggregate; this bolt
makes every table from intent `001-weekly-dinner-planner` **belong to** a household, and updates
the three DB objects that read those columns or assume a single global namespace.

### Bounded Context

Still the Dinner-Planner context — no new entities. What changes is that each aggregate root
gains a `household_id` attribute (its owning household), and the two-way relationship
`Household 1—* {Dinner, Tag, GroceryStoreRow, WeeklyPlan, ...}` becomes explicit in the schema
instead of implied by "there is only one household".

### Entities (attribute additions only)

| Entity                                                       | New attribute                      | Rule                                                                                              |
| ------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dinner                                                       | `household_id` (uuid, → Household) | Owning household. `name` unique **within** a household, not globally.                             |
| Tag                                                          | `household_id`                     | Tag vocabulary is per-household; two households may both have `quick`. Still lowercase.           |
| GroceryStoreRow                                              | `household_id`                     | Row positions are contiguous **per household**.                                                   |
| CategoryRowAssignment                                        | `household_id`                     | Identity becomes `(household_id, category)` — each household maps its own categories.             |
| WeeklyPlan                                                   | `household_id`                     | A household has at most one unlocked plan at a time (was: globally one).                          |
| MealHistory                                                  | `household_id`                     | Copied from the parent plan when written by the lock trigger.                                     |
| DinnerIngredient, DinnerStep, DinnerTag, WeeklyPlanSelection | _(none)_                           | **Child entities** — household is derived through the FK parent (`dinner_id` / `weekly_plan_id`). |

### Value Objects

- **HouseholdId as owning reference**: on the six parent tables, `household_id` defaults to
  `current_user_household_id()` — a new row self-assigns to the caller's household, so the
  frontend `insert` calls are unchanged (the one exception, `category_row_assignments`'s conflict
  target, is bolt 031). Column is **nullable in this bolt** (there is no founding household to
  point existing rows at until bolt 030); bolt 030 backfills and flips it to `not null`.

### Aggregates

- Aggregate boundaries are unchanged from intent `001`. `household_id` is a cross-aggregate
  reference (Dinner → Household), not a new containment. Child aggregates (ingredients, steps,
  selections) stay owned by their parent; they reach `Household` only transitively.

### Domain Services (updated, not new)

- **MealHistoryRecorder** (`fn_weekly_plans_record_meal_history`, trigger on the `locked_at`
  transition — `ADR-2`): now also stamps `meal_history.household_id` with the locking plan's
  `household_id`. Still fires on the transition itself, not inside `lock_weekly_plan`.
- **StoreRowReorderer** (`reorder_grocery_store_row` RPC): its range check (`count(*)`) and every
  position-shift `update` gain a `household_id` filter derived from the target row (read under the
  existing `for update` lock). A cross-household reorder is impossible: RLS already hides other
  households' rows, so the initial `for update` select finds nothing and the RPC raises
  "row not found".
- **LastChosenQuery** (`dinner_last_chosen` view, `security_invoker = true`): **no change**. Once
  bolt 028 scopes `dinners` / `weekly_plans` / `weekly_plan_selections` with RLS, the view is
  transparently per-household because it runs with the querying member's privileges. Story `009`
  asks for a _test_, not necessarily a code change.

### Unchanged Domain Services (regression-tested only)

`lock_weekly_plan`, `fn_weekly_plan_selections_guard`, `fn_weekly_plans_require_three_on_lock`,
`fn_weekly_plans_block_edit_after_lock` — all operate purely on ids and per-plan row counts.
Expected behaviour: **identical**. Story `009` requires a regression case for each.

### Domain Events

- **DomainRowScoped**: (marker) an existing table now carries an owning `household_id`. No
  runtime event.

### Repository Interfaces

Query surface is unchanged in shape; every read/write is now implicitly household-filtered by RLS
(bolt 028). The only interface change downstream is `CategoryRowAssignmentRepository.assignCategory`
switching its upsert conflict target to `(household_id, category)` — bolt 031.

### Ubiquitous Language

- **Direct-column table**: a parent table that carries `household_id` itself (`dinners`, `tags`,
  `grocery_store_rows`, `category_row_assignments`, `weekly_plans`, `meal_history`).
- **Child table**: a table whose household is its parent's (`dinner_ingredients`, `dinner_steps`,
  `dinner_tags`, `weekly_plan_selections`) — no column, gated through the FK in RLS.
- **Nullable window**: the period between this bolt and bolt 030 during which `household_id` is
  present but nullable and mostly null. `unique nulls not distinct` keeps today's global
  uniqueness meaningful throughout the window.

### Relevant Prior Decisions

- `ADR-1`: the reorder RPC's per-household scoping and the guard triggers stay in Postgres for the
  same reason they were put there — the DB is the only enforcement point.
- `ADR-2`: the meal-history write stays on the `locked_at` transition trigger; this bolt only
  adds a column to what that trigger already writes.

No new ADR: "add nullable → backfill (bolt 030) → set not null" is a routine staged-migration
technique, spelled out in `ddd-02-technical-design.md` for the reviewer rather than as a decision
record.
