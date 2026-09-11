---
id: 059-recipe-draft-form
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
type: simple-construction-bolt
status: complete
stories:
  - 001-recipe-entry-route
  - 002-dinner-fields-form
  - 003-ingredient-lines-editor
  - 004-cooking-steps-editor
  - 008-tag-editor
created: '2026-09-07T03:05:00Z'
started: '2026-09-08T21:30:00Z'
completed: '2026-09-08T22:38:13Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-08T21:30:00Z'
    artifact: implementation-plan.md
requires_bolts: []
enables_bolts:
  - 060-recipe-save
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 059-recipe-draft-form

## Objective

The page, the draft, and the three editors that fill it. Everything a user touches before pressing
save.

## Why `simple-construction-bolt`

Form UI over an existing schema. No domain model to discover — `dinners`, `dinner_ingredients` and
`dinner_steps` have been settled since intent 001, and this bolt does not change them. The shape of
the work is the same as bolt 052 (the store-config page).

## Scope

| Story                       | Priority | Note                                                |
| --------------------------- | -------- | --------------------------------------------------- |
| 001-recipe-entry-route      | Must     | Route + an entry point on the catalog               |
| 002-dinner-fields-form      | Must     | Name, cuisine (suggested), cook time, summary line  |
| 003-ingredient-lines-editor | Must     | Quantity / unit / name / category, 3-serving note   |
| 004-cooking-steps-editor    | Must     | Ordered steps with contiguous renumbering           |
| 008-tag-editor              | Must     | Attach / detach / create over the shared vocabulary |

## What matters here

**The draft shape is this bolt's most consequential output.** Unit 002 fills the same shape, so it
is an interface, not an implementation detail. Design it as one.

**Two conventions must be visible in the UI, not merely honoured in code**: quantities are for 3
servings, and the summary line is the catalog card's one line — distinct from the steps. Both live
only in schema comments today, which is exactly how conventions get lost.

**Reuse `INGREDIENT_CATEGORIES`** from `store-config/types.ts`. A second copy of the five values is
a future divergence from a CHECK constraint.

## Definition of Done

- The page renders and both entry paths are visible (paste may be inert until unit 002)
- All four editors work; validation refuses zero ingredients, zero steps, non-positive cook time
  and non-positive quantity before any network call
- Removing a middle step renumbers the rest contiguously from 1
- The draft shape is exported and documented as unit 002's target, tags included
- `tsc -b`, `eslint`, `vitest` green
