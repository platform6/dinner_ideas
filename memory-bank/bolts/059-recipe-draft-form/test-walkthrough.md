---
stage: test
bolt: 059-recipe-draft-form
created: '2026-09-08T22:45:00Z'
---

## Test Report: 001-recipe-manual-entry

### Summary

- **Tests**: 427 / 427 (36 files) — was 353, **+74**
- **`tsc -b`**, **`eslint src`**, **`vite build`**: clean
- **pgTAP**: unaffected at 370/370; no SQL in this bolt

### Test Files

- [x] `recipe-entry/draft.test.ts` — 52 cases, new file: parsing, numbering, moving, tag toggling, validation
- [x] `recipe-entry/components/RecipeEntryPage.test.tsx` — 22 cases, new file: the page end to end

### The most important test could not fail

The case that justifies the whole stable-id scheme — _"removing a line leaves every other line
holding its own values"_ — **passed with the sabotage in place**. Keying the ingredient lines by
array index broke nothing: 22 / 22 still green.

The reason is that the inputs are **controlled**. `value={line.name}` means React writes the
correct value back from state on every render, whatever the key is. The assertion was true either
way, so it discriminated nothing.

Keys govern **DOM node identity**, not value — and identity is what carries focus, caret position
and in-progress IME composition. So the test was rewritten to assert what keys actually control:

> the third line's input is the **same DOM element** before and after the middle line is removed

Keyed by id, React moves that element. Keyed by index, React reuses the second line's element for
the third line's data and unmounts the last one — a different node wearing the same value. That
version fails under sabotage and passes restored.

This is the **fourth bolt running** where an assertion looked meaningful and proved nothing. It is
worth stating the general shape, because the specific traps keep differing:

- bolt 065: an absence asserted before load
- bolt 066: a click on a not-yet-enabled control
- bolt 059: a value assertion where the value was never at risk

**An assertion is only a test if there is a plausible defect it would catch.** "It passes" is not
evidence until the sabotage is run.

### A test that was removed rather than made to pass

A focus-retention case was written alongside the node-identity one: focus the third line, remove
the second, expect the caret still in the third.

It failed **restored**, with `document.activeElement` on `body`. The premise was wrong — clicking
the remove button moves focus to that button, which then unmounts along with its row. Focus is
never on the input at the moment of removal.

The UI does not preserve the caret across a removal and never claimed to. The test was **deleted,
not adjusted**: contorting it until it went green would have produced an assertion about nothing,
which is the exact failure described above. A comment in its place records why.

### Falsification

| Sabotage                                         | Expected to break           | Result                                                      |
| ------------------------------------------------ | --------------------------- | ----------------------------------------------------------- |
| Ingredient lines keyed by array index            | the "keeps its values" case | **PASSED 22/22 — see above.** Caught only after the rewrite |
| ↑ same, against the rewritten node-identity case | node identity               | Failed, as it should                                        |
| Step numbering leaves a gap                      | contiguity                  | Failed **6 cases**, unit and integration                    |
| Validation returns after the first section       | multi-section reporting     | Failed the integration case — **but not the unit case**     |
| ↑ same, after strengthening the unit test        | both levels                 | Failed both                                                 |
| Tag toggle always appends, never detaches        | detach + normalization      | Failed 3 cases                                              |
| `Infinity` no longer rejected                    | the finite-number case      | Failed                                                      |
| Restored                                         | —                           | 427 / 427                                                   |

Two rows there are findings rather than confirmations. The index-key sabotage is described above.
The early-return sabotage exposed a **gap in the unit tests**: "reports every problem at once" used
only dinner-level fields, so it sat entirely on one side of the early return and never crossed it.
A case spanning all three sections (bad name, bad ingredient line, no steps) was added, and the
sabotage then failed at both levels.

### `Infinity` again, in a new place

`Number('Infinity')` is `Infinity`, and `Infinity > 0` — so a `> 0` check alone accepts it and
sends it at a `numeric` column. `parsePositiveNumber` uses `Number.isFinite`, and a case pins it.

Bolt 066 hit the same value as a weight in a cumulative sum. Different mechanism, same lesson:
**`Infinity` passes most comparisons that look like they exclude nonsense.**

### The required-indicator changes the accessible name

Five cases failed initially with "Unable to find a label with the text of: Name". Chakra's
`FormControl isRequired` renders the `*` **inside** the `<label>`, so the accessible name is
`"Name *"` and an exact `getByLabelText('Name')` misses. Anchored regexes (`/^Name/`) fix it.
Worth knowing before the next form in this codebase.

### Acceptance Criteria Validation

- ✅ `/dinners/new` renders, reachable from the catalog
- ✅ Auth unchanged — `AuthGate` wraps `<Routes>`, no new mechanism
- ⚠️ Phone breakpoints — see below
- ✅ Both ways in visible; paste inert and labelled as such
- ✅ Dinner fields, with cuisines suggested from the loaded catalog
- ✅ Categories offered as a `Select` of exactly the five values, never free text
- ✅ Steps add / edit / remove / reorder; removing a middle step leaves no gap
- ✅ Tags: vocabulary offered, click toggles, new names normalized, near-duplicates refused
- ✅ **Nothing written to `tags`** — asserted directly against the mocked api module
- ✅ Validation names its field, before any network call
- ✅ Removing a line leaves the others intact — proven by node identity, not by value
- ✅ "3 servings" and "summary, not the steps" both visible
- ✅ The summary hint does **not** claim the catalog card — asserted as an absence
- ✅ Draft shape exported and documented as unit 002's target
- ✅ `tsc -b`, `eslint`, `vitest`, `vite build` green

### Not covered

- **Responsive layout is unverified.** The ingredient row uses a `templateAreas` switch at `sm`,
  and jsdom has no layout engine — every test here passes at any width. Whether the three-area
  phone stacking actually reads well is a human check on a real device, not something this suite
  can speak to. It is the one thing worth eyeballing before bolt 060 builds on top of it.
- **No save path exists yet**, so nothing here proves a dinner can be created. That is bolt 060,
  and it is the point at which `parsePositiveNumber` and `numberedSteps` get their second caller.
- **`crypto.randomUUID` is deliberately unused**, so there is no environment-dependent id
  generation to test. Line ids come from a module counter.
