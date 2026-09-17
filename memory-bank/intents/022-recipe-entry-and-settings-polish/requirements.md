---
intent: 022-recipe-entry-and-settings-polish
phase: inception
status: draft
created: '2026-09-17T15:43:09Z'
updated: '2026-09-17T15:43:09Z'
---

# Requirements: Smooth the Add a dinner form and Settings

## Intent Overview

Small frictions in the two forms the household uses to change the app: the entry form and
Settings.

**Type**: brown-field
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17.

## Scope (from the inbox, before Checkpoint 1)

- **Scaling as an accordion**: make the scaling section a green accordion labelled simply "Adjust based on household option", placed just above tags.
- **Optional URL field** on a dinner, in both manual entry and import. A new stored field, so it needs a migration.
- **Placeholder hints read as filled-in values**: the form's example text isn't visibly a hint.
- **Hide the Anthropic API key input on `/settings` once a key is set** (`settings/ClaudeAiCard.tsx`).

## Out of scope

- Items assigned to the other intents in 019–023.
- Cooking mode improvements (step check-off, timer, next/previous step), deferred and kept in
  `tasks.md`.

## Functional Requirements

_Not yet gathered. Written after Checkpoint 1._

## Non-Functional Requirements

_Not yet gathered._
