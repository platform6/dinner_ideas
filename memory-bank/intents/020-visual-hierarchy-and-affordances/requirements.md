---
intent: 020-visual-hierarchy-and-affordances
phase: inception
status: draft
created: '2026-09-17T15:43:09Z'
updated: '2026-09-17T15:43:09Z'
---

# Requirements: Make the important things readable and the interactive things obvious

## Intent Overview

The app reads as washed out: very little hierarchy beyond size, one low-saturation palette, and
icon-only buttons that look decorative.

**Type**: brown-field
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17.

## Scope (from the inbox, before Checkpoint 1)

- **Recipe titles on unpicked cards are low contrast** (muted brown on cream); likely fails WCAG AA. Card titles use `textStyle="cardTitle"`. (Reported; contrast to be measured.)
- **The "Full" state on unpicked cards is easy to miss.** `DinnerCard.tsx:203` labels it "Full" in the same muted tone, with no explanation. Wanted: a clearer state and a tooltip like "Remove a pick to add this one".
- **Overall palette and hierarchy**: serif headings plus muted secondary text everywhere.
- **Sidebar**: primary nav (Catalog, This week, List, Cooking) and secondary nav (Store setup, Settings, Log out) are separated only by a thin divider, with no section labels.
- **Icon-only buttons without labels or tooltips**: the eye icon next to Add dinner (opens Not interested) and the store icon on each shopping-list row (opens aisle assignment).

## Out of scope

- Items assigned to the other intents in 019–023.
- Cooking mode improvements (step check-off, timer, next/previous step), deferred and kept in
  `tasks.md`.

## Functional Requirements

_Not yet gathered. Written after Checkpoint 1._

## Non-Functional Requirements

_Not yet gathered._
