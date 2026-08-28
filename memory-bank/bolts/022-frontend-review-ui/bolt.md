---
id: 022-frontend-review-ui
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 001-ink-ramp-aa-correction
created: '2026-08-28T17:10:00Z'
started: '2026-08-28T17:30:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T17:32:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T17:37:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T17:42:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 023-frontend-review-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
completed: '2026-08-28T18:47:32Z'
---

# Bolt: 022-frontend-review-ui

## Objective

Ship review blocker 1: correct the `ink` ramp to WCAG-AA values. One file, three token values,
every screen — kept as its own bolt so the accessibility fix can be reviewed, merged and deployed
without waiting on the rest of `theme-patch.ts`.

## Stories Included

- [ ] **001-ink-ramp-aa-correction**: Replace the `ink` block per `theme-patch.ts` §1 — Priority: Must

## Expected Outputs

- `src/shared/theme/index.ts` — `ink.400 #726C5B`, `ink.300 #757060`, `ink.200 #8A8272`
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`
- A pass over the five `textStyle="faint"` screens + every eyebrow, live-verified

## Dependencies

### Bolt Dependencies (within intent)

- None

### Unit Dependencies (cross-unit)

- `002-kitchen-table-theme` — complete (this bolt edits its theme file)

### Enables

- 023-frontend-review-ui (same file — sequenced after this)

## Success Criteria

- [ ] `ink` block matches `theme-patch.ts` §1 exactly; `900 / 700 / 500` untouched
- [ ] Each of `ink.400 / 300 / 200` ≥ 4.5:1 against `paper.base`
- [ ] `textStyle="faint"` copy re-checked on PlanPage, SuppressedPage, StoreConfigPage,
      ShoppingListPage, DinnerCard
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; existing suite green
- [ ] Code reviewed

## Notes

Diff against the corrected `theme.ts` in `design_handoff_dinner_ideas_theme/` — it already carries
the corrected ramp.
