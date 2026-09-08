---
stage: test
bolt: 066-lucky-pick
created: '2026-09-08T22:50:00Z'
---

## Test Report: 001-lucky-pick

### Summary

- **Tests**: 353 / 353 (34 files) — was 331, **+22**
- **`tsc -b`**, **`eslint src`**, **`vite build`**: clean
- **pgTAP**: unaffected at 370/370; no SQL in this bolt

### Test Files

- [x] `weekly-plan/lucky-draw.test.ts` — 11 cases, new file
- [x] `weekly-plan/components/LuckyPickControl.test.tsx` — 7 cases, new file
- [x] `dinners/components/CatalogPage.test.tsx` — 4 integration cases appended

### The bias is measured, not asserted

A single draw proves nothing about a weighted distribution, so the bias cases run **2000 draws** and
compare frequencies:

- A dinner eaten 400 days ago beats one eaten yesterday **more than 90%** of the time. Weights are
  ~401 and ~2, so the bound is loose enough not to flake and tight enough that an unweighted draw
  (~50%) fails it.
- A dinner eaten **today** is still drawn sometimes — a bias, not a filter.
- A **never-made** dinner does not shut out a long-ago one. If `Infinity` reached the weights, the
  never-made candidate would win every single draw and this case would fail.

### Falsification

| Sabotage                            | Expected to break      | Result                                                                     |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| All weights equal (`return 1`)      | the bias cases         | Failed: "rises with how long ago" and "draws a long-ago dinner more often" |
| `Infinity` no longer clamped        | the finite-weight case | Failed — **and also "is a draw, not a ranking"**                           |
| Plan created inside the insert loop | the create-once case   | Failed: `createPlan` called **3 times**                                    |
| Restored                            | —                      | 353 / 353                                                                  |

The second is worth noting: the `Infinity` sabotage was caught by an assertion aimed at something
else. Letting it through does not merely skew the odds, it removes the randomness entirely — which
is exactly the "sorted list wearing a costume" failure the requirements warn about.

### The async-find trap, third occurrence

All four catalog integration cases initially failed with `addSelection` called **0 times**. The
click was landing on a **disabled** button — the queries had not resolved, so `candidateCount` was
0 — and clicking a disabled button is a no-op.

`findByRole` resolves as soon as the element exists, disabled or not. The fix was to wait for the
catalog's content (`findByText('Tacos')`) and then for the button to be enabled, before clicking.

This is the **third** time in three bolts that `find*` returning too early has produced a
misleading result:

- bolt 065, twice: an absence asserted before load — once caught by luck, once only by sabotage
- bolt 066, here: an action performed on a not-yet-enabled control

The common shape: **`find*` proves existence, never readiness.** Anything that depends on loaded
state — an assertion about absence, a click on something conditionally disabled — needs a second
wait on the state itself.

### The case that matters most

_"creates the plan exactly once, not once per dinner"_. Adding K dinners via K `useToggleSelection`
calls would decide each create-plan action from the same stale `currentPlan` and create K plans —
the hazard `CatalogPage` already carries a comment about, and a cousin of intent 017's outage. The
sabotage produced exactly that: three plans for three dinners.

### Acceptance Criteria Validation

- ✅ `drawLucky` is pure, takes its random source, returns distinct ids
- ✅ Recently-eaten drawn less often; never-made fully eligible and not an automatic winner
- ✅ Different sources give different results — a draw, not a ranking
- ✅ Already-picked never drawn; suppressed never drawn (`useDinners()` returns active only)
- ✅ One press fills every empty slot, keeping existing picks
- ✅ The plan is created at most once and every insert targets it
- ✅ Full / locked / no-candidates each disable **with the reason shown**
- ✅ Fewer candidates than slots warns **before** the press
- ⚠️ Partial failure keeps what landed and reports the count — see below
- ✅ `tsc -b`, `eslint`, `vitest` green

### Not covered

- **The partial-failure path has no automated test.** The mutation's `catch` returns `{ added }`
  when some inserts landed, and the catalog renders "Added N of M". Provoking a failure on the
  third of three mocked inserts is possible, but the assertion would be about mock choreography
  rather than behaviour. Stated rather than glossed: that path is reasoned, not proven.
- **No end-to-end check.** Pressing the button on the live site and seeing sensible dinners appear
  is a post-deploy step, as it was for intent 015.
