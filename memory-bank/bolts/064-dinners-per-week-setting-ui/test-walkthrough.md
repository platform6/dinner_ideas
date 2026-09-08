---
stage: test
bolt: 064-dinners-per-week-setting-ui
created: '2026-09-08T20:20:00Z'
---

## Test Report: 005-settings-control

### Summary

- **Tests**: 324 / 324 (32 files) - was 317, **+7**
- **`tsc -b`**: clean
- **`eslint src`**: clean
- **`vite build`**: green
- **pgTAP**: unaffected at 370/370; this bolt ships no SQL

### Test Files

- [x] `src/features/settings/PlanningWeekCard.test.tsx` - 7 cases appended in their own `describe`;
      the existing block's `beforeEach` extended with the new query's mock

### The seven cases

| Case                                                     | Asserts                                        |
| -------------------------------------------------------- | ---------------------------------------------- |
| Shows the stored number, owner can change it             | `updateDinnersPerWeek('hh-1', 5)`              |
| Offers exactly 1..7                                      | option values equal the database `check` range |
| Reads a non-default stored value                         | 6 renders as 6, not the 3 default              |
| Says which screens follow the number                     | the copy the story asked for                   |
| Non-owner: both controls disabled, hint appears **once** | the duplication bug cannot return              |
| Failed save keeps the stored number visible              | driven by the query, not local state           |
| **Invalidates `['weekly-plan']` too**                    | the design decision that most needed proving   |

### A gap I nearly shipped

The first version of these tests covered the control thoroughly and **did not test the
invalidation** - the one thing flagged at the plan stage as the decision most likely to bite.

That is the shape of a test suite that looks complete: every visible behaviour asserted, the
invisible one that matters left out. Added before closing, with `renderCard` changed to return its
`queryClient` so the spy is possible.

### Tests were falsified before being trusted

| Sabotage                               | Expected to break     | Result             |
| -------------------------------------- | --------------------- | ------------------ |
| `['weekly-plan']` invalidation removed | the invalidation case | Failed as expected |
| Range narrowed to 3-7                  | the range case        | Failed as expected |
| Restored                               | -                     | 324 / 324          |

The first is the important one: without that assertion the sabotage passes silently, and the bug
shows up later as four screens disagreeing with a setting that appears to have saved.

### Acceptance Criteria Validation

- Control sits in `PlanningWeekCard`, with the other household settings
- Only 1..7 selectable, matching the database `check`
- Owner can change it; a member sees it disabled with the explanation, shown once
- A change invalidates `['weekly-plan']`
- A failed save shows a message and the displayed value returns to what is stored
- Copy states that the plan, shopping list and cooking view follow the number
- `tsc -b`, `eslint`, `vitest` green

### Issues Found

**One, mine, caught by an existing test.** The owner hint rendered twice for a non-owner because I
added a copy the plan had explicitly said was unnecessary. The pre-existing
`getByText(/ask a household owner/i)` assertion failed on multiple matches - an old test catching a
new defect, which is the argument for not adjusting existing assertions to fit new work.

### Not verified here

- **The setting has no effect yet.** Every screen still hard-codes 3; that is bolt 065. This bolt
  writes the number and nothing reads it, so "changing it takes effect immediately" is proven only
  at the query-invalidation level, not end to end.
- **Not deployed.** Bolt 063's migration is unapplied to production, so this control would fail
  against prod today. The two must ship together.
