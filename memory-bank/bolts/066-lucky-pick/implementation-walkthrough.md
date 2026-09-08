---
stage: implement
bolt: 066-lucky-pick
created: '2026-09-08T22:40:00Z'
---

## Implementation Walkthrough: 001-lucky-pick

### Summary

A "Surprise me" control on the catalog that fills the week's remaining picks at random, weighted
away from recently-eaten dinners. Three pieces: a pure draw, one mutation, one control.

### Structure Overview

The draw is a pure function taking its random source as an argument; `Math.random()` is called once,
at the edge, in the page's click handler. The mutation resolves the plan once and inserts
sequentially. The control owns only its disabled states.

### Completed Work

- [x] `weekly-plan/lucky-draw.ts` — `luckyWeight` and `drawLucky`; pure, seedable
- [x] `weekly-plan/hooks.ts` — `useLuckyPick`
- [x] `weekly-plan/components/LuckyPickControl.tsx` — the control and its three disabled states
- [x] `dinners/components/CatalogPage.tsx` — candidates, slot count, handler, control, messages

### Key Decisions

- **`Math.random()` at the edge, not inside the draw.** Injecting the source is the only reason the
  two promises — that it is random, and that it is biased the right way — can be asserted at all.
- **`Infinity` is clamped, deliberately.** `daysSinceForSort` returns `+Infinity` for a never-made
  dinner: right as a sort key, fatal as a weight. One `Infinity` in a cumulative sum makes every
  later comparison meaningless, so the first never-made candidate would win every draw and the rest
  would be unreachable. Clamped to 730 days — two years is past any real recency signal, so a
  dinner not eaten in two years and one never eaten are equally due.
- **Weights have a `+ 1` floor.** A dinner eaten today scores 0 days, and a zero weight would make
  it _impossible_ rather than unlikely — a filter, not a bias. The requirement is "drawn less
  often", not "never drawn".
- **One mutation, not K toggles.** `CatalogPage` already carries a comment about two picks in
  flight deciding their create-plan action from the same stale `currentPlan`. `useLuckyPick`
  resolves the plan once and reuses the id. Intent 017's outage was a different symptom in that
  same area.
- **Sequential inserts, not `Promise.all`.** Intent 015's cap trigger serialises on the plan row
  anyway; parallel inserts would only race for the last slot.
- **Partial failure keeps what landed.** Three of four saved is closer to what the user asked for
  than none, so the mutation reports the count rather than failing wholesale.
- **No confirm step**, unlike `ClearPicksControl` and `LockWeekControl`. Those are destructive or
  irreversible; this only ever adds to empty slots.
- **Every disabled state says why.** Locked, full, or no candidates. "Disabled and silent" leaves
  the user unsure whether the app is broken or they are.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- The draw defaults to the last pool entry if no cumulative threshold matches. Floating-point sums
  mean a `random()` very close to 1 can leave the threshold fractionally above the total, and
  without that default the function would return `undefined` for a valid input.
- Suppressed dinners need no explicit filter: `useDinners()` returns active ones only. Worth
  knowing before someone "adds the missing check".
