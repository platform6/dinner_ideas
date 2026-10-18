---
id: 081-merged-line-aisle
unit: 002-merged-line-aisle
intent: 023-shopping-list-consolidation
type: simple-construction-bolt
status: complete
stories:
  - 001-merged-line-finds-its-aisle
  - 002-sheet-and-checks-follow-the-line
created: '2026-09-24T14:56:10Z'
started: '2026-09-24T18:24:05Z'
completed: '2026-10-18T19:38:18Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-24T18:47:10Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-24T18:56:53Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-18T19:38:12Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 080-line-merging
enables_bolts: []
requires_units:
  - 001-line-merging
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 081-merged-line-aisle

## Objective

A merged line keeps the aisle the household placed it in, and the aisle sheet and check marks work on
it.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1). It changes how the client matches a line to a registry item,
not the registry itself.

## What matters here

Today a line and its registry item share one key, `nameKey(line.name)`, in two places (`reorder.ts`
and `ShoppingListPage`). Resolve the item once, when the list is built. The key test: a prep-note
variant that has an aisle, with no item under the plain name, must still sort into that aisle.

## Verification

Unit tests on the resolver and the page. Then, in a browser against the household's data: a merged
line opens the right aisle sheet, and a move re-sorts it with its check mark intact.
