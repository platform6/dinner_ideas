---
intent: 015-dinners-per-week
phase: inception
status: complete
created: '2026-09-07T04:00:00Z'
updated: '2026-09-07T04:00:00Z'
---

# Requirements: Dinners per week — make "3" a household setting

## Intent Overview

The number 3 is not a preference in this app; it is a rule, enforced in Postgres. Two triggers
reject a fourth selection and refuse to lock a plan that does not have exactly three, and one of
them is named `fn_weekly_plans_require_three_on_lock`. Three pgTAP files assert it and roughly
eight client sites hard-code it, several with their own "Pick 3 dinners" copy.

This intent turns that rule into `households.dinners_per_week`, defaulting to 3 so nothing changes
for a household that never touches it.

`tasks.md` calls this "a small follow-up to add the control + the schema/RLS". The control and the
column are indeed small. **Changing the triggers is not** — one of them was already the subject of
a concurrency fix (`20260827002830`) after two writers could race past a `< 3` check and land a
plan at four selections. That code has to keep holding under the same race with a variable bound.

### Precedent

`households.week_start_day` (intent 011, bolt 045) is the same shape and should be followed
closely: an additive, `check`-constrained column on `households`, owner-editable on `/settings`,
**needing no new RLS** because `households` already carries member-SELECT and owner-UPDATE
policies from `20260828230000`.

## Business Goals

| Goal                                                      | Success Metric                                                          | Priority |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| A household plans the number of dinners it actually cooks | The setting is changed on `/settings` and the whole app honours it      | Must     |
| Nothing changes for a household that never touches it     | Default 3; every existing behaviour and test intent is preserved        | Must     |
| The concurrency guarantee survives                        | Two racing writers still cannot exceed N, as they cannot exceed 3 today | Must     |

---

## Functional Requirements

### FR-1: `households.dinners_per_week`

- **Description**: An additive column holding how many dinners this household plans per week.
- **Acceptance Criteria**:
  - `dinners_per_week smallint not null default 3 check (dinners_per_week between 1 and 7)`
  - A week has seven days, so 7 is the ceiling and 1 the floor
  - Existing households take the default; no data migration and no behaviour change on deploy
  - **No new RLS policy** — `households`' existing member-SELECT and owner-UPDATE policies cover it,
    exactly as they cover `week_start_day`
  - The column carries a `comment on column` explaining it, as every prior settings column does
- **Priority**: Must

### FR-2: The selection cap honours the setting

- **Description**: The trigger that rejects an extra selection compares against the household's
  setting instead of the literal 3.
- **Acceptance Criteria**:
  - Adding selection number N+1 is rejected; adding number N is accepted
  - The rejection message states the actual limit, not "3"
  - **The concurrency guarantee is preserved.** The existing `for update` serialisation stays; two
    concurrent inserts cannot both pass the check and land the plan at N+1. This is the specific
    bug `20260827002830` was written to fix and it must not regress
  - The setting is read from the plan's household, not from the caller's session
- **Priority**: Must

### FR-3: Locking honours the setting

- **Description**: The lock trigger requires exactly N selections rather than exactly 3.
- **Acceptance Criteria**:
  - A plan with N selections locks; a plan with fewer or more is rejected
  - The exception message states the actual number required
  - `fn_weekly_plans_require_three_on_lock` is **renamed** — its name asserts the very thing this
    intent removes. The rename and its trigger are handled in one migration, with the drop of the
    old name explicit rather than left behind
- **Priority**: Must

### FR-4: A setting control on `/settings`

- **Description**: An owner can change the number from the existing settings page.
- **Acceptance Criteria**:
  - The control sits with the other household settings and follows `week_start_day`'s pattern
  - Only an owner can change it; a member sees it read-only, matching the existing owner-UPDATE policy
  - The value is constrained to 1–7 in the UI, so the DB `check` is never reached with a bad value
  - Changing it takes effect immediately for an unlocked current week
- **Priority**: Must

### FR-5: A mid-week change adopts the new number, unless the week is locked

- **Description**: What happens to a week already in progress when the setting changes.
- **Acceptance Criteria**:
  - An **unlocked** plan adopts the new N immediately — raising it allows more picks, lowering it
    below the current count does not delete anything
  - A plan with more selections than a newly-lowered N cannot be locked until the extra picks are
    removed, and says so in those words
  - A **locked** plan is untouched. Locking is deliberate and irreversible-feeling (intent 012),
    and its `meal_history` rows are already written
- **Priority**: Must

### FR-6: Every client site honours the setting

- **Description**: Replace the hard-coded 3 everywhere it appears in the app.
- **Acceptance Criteria**:
  - The plan page's "full" state, its lock control and its nudge copy use N
  - The shopping list and cooking view gates use N, including their "Pick 3 dinners" copy
  - `useShoppingListDinners` and the cooking-view hook are enabled at N, not at exactly 3
  - No user-facing string states a fixed number that the setting can contradict
- **Priority**: Must

---

## Non-Functional Requirements

### Reliability

- **Metric**: The concurrency behaviour fixed in `20260827002830` still holds — a pgTAP case
  proves two racing inserts cannot exceed N
- **Metric**: Every existing pgTAP assertion about the three-selection rule is updated to assert
  the rule against the setting, not deleted

### Security

- **Metric**: No new RLS policy; the setting is owner-writable through the policies that already exist
- **Metric**: The cap is enforced in Postgres, not only in the client — ADR-1's principle, and the
  reason the current rule is a trigger in the first place

---

## Constraints

- **The rule lives in Postgres.** Two triggers and their tests, not a client constant
- **`fn_weekly_plans_require_three_on_lock` is misnamed after this change** and must be renamed
- **`fn_weekly_plans_record_meal_history` needs no logic change** — it already inserts one row per
  selection via a `select`. Only its comment says "Writes 3 meal_history rows", and that comment
  should be corrected
- **`week_start_day` is the precedent** for the column, the settings control and the RLS reasoning
- Default 3 is not negotiable: it is what makes this deploy a no-op for the founding household

## Resolved Decisions

| Question           | Decision                                                             |
| ------------------ | -------------------------------------------------------------------- |
| What range?        | **1–7, default 3** — a week has seven days                           |
| A mid-week change? | **Unlocked weeks adopt it; locked weeks are untouched**              |
| Who can change it? | **Owner only**, via the existing owner-UPDATE policy on `households` |

## Priority Definitions

- **Must**: The intent is not deliverable without it.
- **Should**: Valuable, and cuttable without invalidating the rest.
