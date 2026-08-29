---
id: 009-scoping-existing-functions
unit: 001-household-data-model
intent: 004-account-model
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 027-household-data-model
implemented: true
---

# Story: 009-scoping-existing-functions

## User Story

**As a** household member
**I want** the meal-history trigger, the store-row reorder RPC, and the last-chosen view to respect household boundaries
**So that** locking a plan, reordering a store, or seeing "last made" never touches or leaks another household's data

## Acceptance Criteria

- [ ] **Given** `fn_weekly_plans_record_meal_history`, **When** a plan locks, **Then** the
      `meal_history` rows it inserts set `household_id` = the parent `weekly_plans.household_id`
- [ ] **Given** `reorder_grocery_store_row(p_row_id, p_new_position)`, **When** called, **Then**
      it derives the row's `household_id` (via the initial `for update` select) and scopes both
      its `count(*)` range check and every position-shift `update` to
      `where household_id = <that household>`
- [ ] **Given** two households each with store rows, **When** household A reorders a row,
      **Then** household B's `grocery_store_rows.position` values are unchanged
- [ ] **Given** `dinner_last_chosen`, **When** queried by a member, **Then** it returns one row
      per dinner **in that member's household only**, with `last_chosen_date` derived from that
      household's locked plans — confirmed to work via the existing `security_invoker = true`
      plus story `004`'s RLS, adjusting the view definition only if a test shows a leak
- [ ] **Given** `lock_weekly_plan`, `fn_weekly_plan_selections_guard`,
      `fn_weekly_plans_require_three_on_lock`, `fn_weekly_plans_block_edit_after_lock`, **Then**
      each has a regression test proving it still behaves correctly under the new schema; the
      expectation is **no functional change** (all are id-scoped)
- [ ] **Given** the reorder RPC and meal-history trigger changes, **Then** the existing
      `weekly_planning_test.sql` and `grocery_store_config_test.sql` cases pass, extended with a
      two-household case each

## Technical Notes

- These are the DB objects from `001-weekly-dinner-planner` that read/write columns story `003`
  adds, or that assume a single global table. Grouped with story `003` in bolt `027` because
  they can't be tested until those columns exist.
- `reorder_grocery_store_row` currently does `select count(*) from grocery_store_rows` and
  shifts by bare `position` predicates — both must gain the `household_id` filter or a
  cross-household reorder corrupts positions.
- `dinner_last_chosen` is expected to "just work" once `dinners` and `weekly_plans` have
  household RLS (it is `security_invoker`); the acceptance criterion is a test, not necessarily
  a code change.
- The guard triggers on `weekly_plan_selections` / `weekly_plans` operate purely on ids and row
  counts within one plan — they need coverage, not changes.

## Dependencies

### Requires

- `003-household-id-on-domain-tables`

### Enables

- `008-founding-household-migration` (a clean post-migration test needs these correct)

## Edge Cases

| Scenario                                                                   | Expected Behavior                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `reorder_grocery_store_row` called for a row not in the caller's household | RLS on `grocery_store_rows` already hides it → `for update` select finds nothing → "row not found" error |
| A household with zero locked plans                                         | `dinner_last_chosen` returns its dinners with `last_chosen_date = null`                                  |
| `meal_history` insert for a plan mid-migration                             | Not applicable — trigger only fires on the `locked_at` transition                                        |

## Out of Scope

- Adding new RPCs
- Any change to the lock semantics (exactly-3, immutability) — verified unchanged
