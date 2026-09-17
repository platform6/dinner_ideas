---
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
phase: inception
status: complete
created: '2026-09-11T16:24:16Z'
updated: '2026-09-11T16:24:16Z'
---

# Unit Brief: Scale On Review

## Purpose

Take the arithmetic away from the language model. The extraction reports what the page says; the
user decides whether to scale; the app does the multiplication.

## Scope

### In Scope

- Removing the rescaling instruction from the extraction prompt
- Carrying the source's stated serving count through the parser into the draft, **as stated**
- A pure scaling module with tests
- A control on the review form that applies and un-applies scaling

### Out of Scope

- Scaling by anything other than servings ("halve this recipe")
- Retroactively scaling anything already saved (NFR-1)
- Any change to the save path

## Notes

**This unit's whole point is a boundary move.** Before: the model divides quantities by a ratio it
infers. After: the model reports, code computes.

The bug that started this intent was not that the model divided _badly_ — on the two pages tested
it was exact. It was that it divided _at all_, unasked, invisibly, in a place no test could reach.

**Do not reintroduce automatic scaling for convenience.** FR-4 exists because the household setting
is a target offered, never a rule applied. A tray bake imports as written and the user simply does
not press the button — that is the entire resolution of the household-versus-dish tension, and it
only works while the default stays hands-off.

## Stories

- `001-extraction-reports-servings` — The model reports the serving count; it does not rescale (Must)
- `002-scaling-is-pure-code` — Scaling is arithmetic in code, with tests (Must)
- `003-scale-control-on-review` — The user chooses, and can change their mind (Must)
