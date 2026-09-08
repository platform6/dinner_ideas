---
stage: plan
bolt: 065-plan-flow-variable-n
created: '2026-09-08T20:45:00Z'
---

## Implementation Plan: 002-plan-flow-variable-n

### Objective

Make every screen read `households.dinners_per_week` instead of a hard-coded 3, so the setting
built in bolts 063 and 064 stops being inert.

---

### The re-grep found a file the plan missed

Story 001 says the file list is "a snapshot… re-run rather than trust". Doing so found a
**seventh** file the unit brief did not list:

**`src/features/dinners/components/CatalogPage.tsx`** — four sites, and the most user-visible ones,
because the catalog is where picking actually happens:

| Line | Site                                                | Effect if left at 3                                                   |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------- |
| 112  | `Badge variant={size >= 3 ? 'countFull' : 'count'}` | Badge turns "full" at the wrong count                                 |
| 115  | `{size} of 3`                                       | **Reads "4 of 3"** at N=5                                             |
| 199  | `{size >= 3 && <Alert>…}`                           | At-capacity notice fires early or never                               |
| 201  | "You've picked 3 for this week"                     | States a number that is not the household's                           |
| 239  | `selectionDisabled: size >= 3 && …`                 | **Cards lock at 3 even when N=5** — the feature simply would not work |

Line 239 is the one that matters most: without it, a household set to 5 could never pick a fourth
dinner from the UI, whatever the database allowed. Shipping the other six files and missing this
one would have produced a setting that appears to save, passes its own tests, and does nothing.

The unit brief's list is corrected as part of this bolt.

### The full site list, verified 2026-09-08

| File                                            | Sites                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `dinners/components/CatalogPage.tsx`            | 5 — badge variant, "N of M" label, capacity alert + copy, `selectionDisabled` |
| `weekly-plan/components/PlanPage.tsx`           | 4 — `isFull`, nudge condition, nudge copy, lock condition                     |
| `weekly-plan/components/LockWeekControl.tsx`    | 2 — the `< 3` guard and its comment                                           |
| `shopping-list/components/ShoppingListPage.tsx` | 2 — the gate and "Pick 3 dinners"                                             |
| `shopping-list/hooks.ts`                        | 2 — `enabled: length === 3` and its comment                                   |
| `cooking-view/components/CookingViewPage.tsx`   | 2 — the gate and "Pick 3 dinners"                                             |
| `cooking-view/hooks.ts`                         | 2 — `enabled: length === 3` and its comment                                   |

`dinners/last-chosen.ts`'s `< 30` / `< 365` are day counts, not selection counts. False positives.

---

### Technical Approach

#### 1. One hook, read where it is needed

`useDinnersPerWeek()` already exists from bolt 064. Each screen calls it directly rather than
threading the number through props. It is a cached react-query read; a second caller costs nothing,
and prop-drilling a household setting through four features would be worse than the duplication it
avoids.

`LockWeekControl` is the exception: it already takes `selectionCount` as a prop, so it takes the
target as a prop too. It is a presentational component and should stay one.

#### 2. The default while loading

`useDinnersPerWeek()` returns `undefined` on the first render. Every site needs a fallback, and
**3 is the right one** — it is the column default, so a household that never set it sees no flicker,
and an unconfigured or offline read degrades to today's behaviour rather than to zero.

`?? 3` at each site. Not a shared constant: the number appears once per file and a constant would
add an import to say what `3` already says. (`DEFAULT_DINNERS_PER_WEEK` does exist in
`settings/api.ts`, but it is that module's fallback for a missing row, not a UI default.)

#### 3. Copy that names a number

Four strings state "3":

- "Pick 3 dinners on the catalog to see your shopping list." (×2 — list and cooking)
- "Pick 3 dinners to lock in your week."
- "You've picked 3 for this week — remove one to swap in another."
- "{size} of 3" (the badge)

Each becomes the household's number. **Singular matters**: at N=1, "Pick 1 dinners" is wrong.
Every string that can render at 1 needs the plural handled.

#### 4. What must NOT change

- **No client-side enforcement.** These are affordances. The cap and the lock rule are Postgres's
  (bolts 063's triggers), and a screen computing the wrong N shows a wrong prompt — it cannot
  produce an invalid plan. No site should start rejecting anything.
- **`selectionDisabled`'s other two conditions** — the in-flight guards — are unrelated to N and
  stay exactly as they are. Their comment explains a real race; do not disturb it.

---

### Acceptance Criteria

- [ ] All 7 files read the household's number
- [ ] No user-facing string names a fixed count
- [ ] Singular renders correctly at N=1
- [ ] `selectionDisabled` locks the catalog at N, not at 3
- [ ] Both hooks are `enabled` at N
- [ ] A grep for hard-coded selection counts in `src/` returns nothing but the day-count false positives
- [ ] Tests cover a **non-default** N, and separately confirm the default is unchanged
- [ ] `tsc -b`, `eslint`, `vitest` green

---

### Out of Scope

- The column, the triggers, the settings control — bolts 063 and 064
- Any change to what a screen does once its gate passes
