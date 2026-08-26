---
stage: implement
bolt: 008-weekly-dinner-planner-ui
created: 2026-08-26T23:31:20Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 5; cooking view, added later)

### Summary

Added the "Cooking" page — the current plan's 3 dinners, each with its ordered cooking steps as a numbered list, reachable via its own route regardless of the plan's lock state. This is the last story in the intent.

### Structure Overview

New `src/features/cooking-view/` feature (hooks + `CookingViewPage`), following the same shape as `weekly-plan` and `shopping-list`. One small addition to the `dinners` feature (`fetchDinnersWithStepsByIds`) rather than reusing the shopping list's ingredient-embedding fetch, since the two pages need different embeds.

### Completed Work

- [x] `src/features/dinners/types.ts` — added `DinnerStep`, `DinnerWithSteps`
- [x] `src/features/dinners/api.ts` — added `fetchDinnersWithStepsByIds` (embeds `dinner_steps`, ordered by `step_number`)
- [x] `src/features/cooking-view/hooks.ts` — `useDinnersWithSteps`, enabled only at exactly 3 picks
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` — gate message under 3 picks, each dinner as a card with an ordered step list, a fallback note for a dinner with zero steps
- [x] `src/App.tsx` — added `/cooking` route (all four pages are now real routes)
- [x] `src/shared/components/Layout.tsx` — added "Cooking" nav link

### Key Decisions

- **Separate fetch from the shopping list's**: `fetchDinnersWithStepsByIds` embeds `dinner_steps`, distinct from `fetchDinnersByIds`'s ingredient embed — each page fetches only what it needs, per the Stage 1 plan's reasoning.
- **No lock-based branching**: unlike `PlanPage` (which hides edit actions once locked), this page renders identically regardless of `locked_at` — per the story, locking must never hide or change the cooking view.
- **Ordered list, not a paragraph**: steps render via Chakra's `OrderedList`/`ListItem`, directly satisfying the story's explicit rendering requirement.

### Deviations from Plan

None — implemented as scoped in `implementation-plan.md`.

### Dependencies Added

None — no new npm packages.

### Developer Notes

- `pnpm run lint`, `pnpm exec tsc -b`, `pnpm run build`, and the existing test suite (56/56) all pass clean.
- This closes out every story in intent `001-weekly-dinner-planner`'s MVP scope once Stage 3 (Test) confirms.
