---
intent: 023-shopping-list-consolidation
created: '2026-09-17T15:43:09Z'
completed: '2026-09-24T15:00:00Z'
status: complete
---

# Inception Log: 023-shopping-list-consolidation

## Overview

**Intent**: A shopping list you can shop from without merging lines in your head
**Type**: brown-field
**Created**: 2026-09-17T15:43:09Z

## Origin

Created from the product owner's task inbox (`tasks.md`, commit `02b16b9`) on 2026-09-17. The
inbox was triaged into five intents at the product owner's direction:

| Intent | Focus                                                  |
| ------ | ------------------------------------------------------ |
| 019    | UI correctness fixes (goes through requirements first) |
| 020    | Visual hierarchy and affordances                       |
| 021    | Catalog findability                                    |
| 022    | Recipe entry and settings polish                       |
| 023    | Shopping list consolidation                            |

Cooking mode was deferred and stays in `tasks.md`.

## Artifacts Created

| Artifact       | Status   | File              |
| -------------- | -------- | ----------------- |
| Requirements   | approved | requirements.md   |
| System Context | done     | system-context.md |
| Units          | done     | units.md          |
| Stories        | 6        | units/*/stories/  |
| Bolts          | planned  | bolts 080–082     |

## Decisions

| Checkpoint | Question                             | Decision              |
| ---------- | ------------------------------------ | --------------------- |
| Triage     | How should the inbox become intents? | Five intents, 019–023 |
| Triage     | Include cooking mode now?            | Deferred              |
| Triage     | Which goes first?                    | 019                   |

## Checkpoints 1–4 (2026-09-24)

| Checkpoint   | Question                                   | Decision                                              |
| ------------ | ------------------------------------------ | ----------------------------------------------------- |
| Checkpoint 1 | Which lines count as the same?             | Strip prep notes: text after a comma, and prep words  |
| Checkpoint 1 | Different units on matching lines?         | One line, both amounts, with no conversion            |
| Checkpoint 1 | Show prep notes or dinners on the list?    | No. Just the total                                    |
| Checkpoint 1 | Empty aisles in Store setup?               | Hidden behind a toggle; nothing deleted               |
| Checkpoint 2 | FR-1 to FR-5, NFR-1 to NFR-3               | Approved as written                                   |
| Checkpoint 3 | Context, 3 units, 6 stories, bolts 080–082 | Approved, including FR-4 rule 1 (the exact name wins) |
| Checkpoint 4 | Ready for construction                     | Approved                                              |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 5     |
| Non-Functional Requirements | 3     |
| Units                       | 3     |
| Stories                     | 6     |
| Bolts Planned               | 3     |

## Units Breakdown

| Unit                   | Stories | Bolts | Priority          |
| ---------------------- | ------- | ----- | ----------------- |
| 001-line-merging       | 3       | 080   | Must              |
| 002-merged-line-aisle  | 2       | 081   | Must              |
| 003-empty-aisle-toggle | 1       | 082   | Should (cuttable) |

**080 and 081 are released together.** 082 is independent.
