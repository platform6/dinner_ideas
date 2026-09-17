---
intent: 023-shopping-list-consolidation
phase: inception
status: draft
created: '2026-09-17T15:43:09Z'
updated: '2026-09-17T15:43:09Z'
---

# Requirements: A shopping list you can shop from without merging lines in your head

## Intent Overview

Generating a usable grocery list is the app's core job, and near-duplicate lines undermine it.

**Type**: brown-field
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17.

## Scope (from the inbox, before Checkpoint 1)

- **Similar ingredients are not merged.** `shopping-list/aggregate.ts:19` merges on normalized name + unit only, so "chicken thighs" and "chicken thighs, cubed" appear as two Protein lines. (Confirmed in code.) What counts as "the same ingredient", and what happens to units that differ, are the central requirements questions.
- **Empty aisles in Store setup** show "Nothing here yet" with no way to hide or delete aisles the household never uses, cluttering the walking-path view.

## Out of scope

- Items assigned to the other intents in 019–023.
- Cooking mode improvements (step check-off, timer, next/previous step), deferred and kept in
  `tasks.md`.

## Functional Requirements

_Not yet gathered. Written after Checkpoint 1._

## Non-Functional Requirements

_Not yet gathered._
