---
stage: test
bolt: 065-plan-flow-variable-n
created: '2026-09-08T21:10:00Z'
---

## Test Report: 002-plan-flow-variable-n

### Summary

- **Tests**: 331 / 331 (32 files) - was 324, **+7**
- **`tsc -b`**, **`eslint src`**, **`vite build`**: clean
- **pgTAP**: unaffected at 370/370; no SQL in this bolt

### Test Files

- [x] `dinners/components/CatalogPage.test.tsx` - 4 cases
- [x] `shopping-list/components/ShoppingListPage.test.tsx` - 3 cases
- [x] `weekly-plan/components/LockWeekControl.test.tsx` - fixture updated for the new required prop

### The cases

| Case                                               | Asserts                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| Catalog counts against the household number        | "3 of 5", not "3 of 3"                                    |
| **Unpicked dinners stay selectable at 3 when N=5** | the site the re-grep found                                |
| Unpicked dinners disable once N is reached         | the cap affordance still works                            |
| Catalog unchanged at the default                   | the setting is invisible to a household that never set it |
| Shopping list gates at N                           | "Pick 5 dinners" with 3 picked                            |
| Singular at N=1                                    | "Pick 1 dinner", never "1 dinners"                        |
| List renders once N is met                         | the gate opens at the right count                         |

### An assertion that could not fail, caught by sabotage

The most important case - _unpicked dinners stay selectable at 3 when the household plans 5_ - was
written as:

```ts
const chowder = await screen.findByRole('checkbox', { name: 'Pick Chowder for this week' });
expect(chowder).not.toBeDisabled();
```

`findByRole` resolves as soon as the card exists, which is **before the plan query resolves**. At
that moment nothing is selected, so the card is enabled whatever the code does.

The sabotage run proved it: `selectionDisabled` reverted to a literal `3`, and the suite passed
76/76. The test asserting the bolt's whole point was worthless.

Fixed by waiting for `"3 of 5"` - which only renders once both queries have resolved and the state
under test actually exists - and then asserting synchronously. Re-sabotaged: it fails.

**This is the second time in this bolt that a `find*` + negative assertion produced a false pass.**
The first was caught because it failed for a different reason and was fixed with `waitFor`; this
one only surfaced under sabotage. The pattern to distrust: _asserting an absence immediately after
an async find_, where "not yet loaded" and "correctly not disabled" look identical.

### Falsification

| Sabotage                                                                   | Result                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| `selectionDisabled` reverted to literal 3, **before** fixing the assertion | Passed 76/76 - test had no teeth |
| Same sabotage, **after** fixing the assertion                              | Failed as expected               |
| Restored                                                                   | 331 / 331                        |

### Acceptance Criteria Validation

- All 7 files read the household's number
- No user-facing string names a fixed count
- Singular renders correctly at N=1
- `selectionDisabled` locks the catalog at N, not at 3 - **and the assertion has teeth**
- Both data hooks are `enabled` at N
- Grep for hard-coded selection counts returns only day-count false positives
- Tests cover a non-default N **and** confirm the default is unchanged
- `tsc -b`, `eslint`, `vitest` green

### Not covered

- **`PlanPage` and `CookingViewPage` have no new cases.** Their changes are the same shape as the
  two files that do (`?? 3`, a gate, a plural), and their existing suites pass. That is weaker
  evidence than the catalog and shopping-list cases, and is stated rather than glossed: if either
  regressed at a non-default N, this suite would not catch it.
- **End-to-end** - changing the setting on `/settings` and watching four screens follow is not
  exercised anywhere. It needs the migration deployed, so it belongs to the release's post-deploy
  check.
