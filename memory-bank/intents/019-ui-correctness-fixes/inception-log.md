---
intent: 019-ui-correctness-fixes
created: '2026-09-17T15:43:09Z'
completed: '2026-09-17T16:05:35Z'
status: complete
---

# Inception Log: 019-ui-correctness-fixes

## Overview

**Intent**: Fix what the UI gets wrong
**Type**: defect-fix
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

| Artifact       | Status | File                                |
| -------------- | ------ | ----------------------------------- |
| Requirements   | ✅     | requirements.md                     |
| System Context | ✅     | system-context.md                   |
| Units          | ✅     | units.md, units/*/unit-brief.md (4) |
| Stories        | ✅     | units/_/stories/_.md (7)            |
| Bolt Plan      | ✅     | bolts 073, 074, 075, 076            |

## Decisions

| Checkpoint   | Question                                   | Decision                                                |
| ------------ | ------------------------------------------ | ------------------------------------------------------- |
| Triage       | How should the inbox become intents?       | Five intents, 019–023                                   |
| Triage       | Include cooking mode now?                  | Deferred                                                |
| Triage       | Which goes first?                          | 019                                                     |
| Checkpoint 1 | Aisle for a new ingredient line?           | The household's history, otherwise the cook must choose |
| Checkpoint 1 | How does an expanded card sit in the grid? | It spans its row                                        |
| Checkpoint 1 | The Ctrl+A report?                         | Deferred, back in `tasks.md`                            |
| Checkpoint 1 | "Add dinner" or "Add a dinner"?            | "Add a dinner"                                          |

## Corrections during Checkpoint 1

The triage said the `items` registry knows each ingredient's aisle. It doesn't: `items` holds only
names. The previous aisle lives in `dinner_ingredients.category`, so FR-3 reads the household's own
dinners. The outcome the product owner chose is unchanged, and no schema change is needed.

## Scope change after Checkpoint 3 (2026-09-17)

The product owner's mobile review (`mobile.md`) was triaged before Checkpoint 3 was approved:

| Finding                                                   | Went to                          |
| --------------------------------------------------------- | -------------------------------- |
| "Locks these 3 dinners" / "All three picked"              | Already FR-1                     |
| Sticky "Copy shopping list" covers items                  | **019 FR-6**, unit 004, bolt 076 |
| Card "⋮" menu covers the title                            | **019 FR-7**, unit 004, bolt 076 |
| Catalog header wraps badly; filter dropdown on mobile     | Intent 021                       |
| Touch targets; Store setup truncation; aisle-picker sheet | New intent 024                   |

Two claims in the review were corrected against the code: the footer is sticky, not fixed, and the
menu opens `bottom-end`, landing on a wrapped title. FR-6 and FR-7 need Checkpoint 2 approval before
Checkpoint 3 is presented again.

## Checkpoints 2–4 (2026-09-17)

| Checkpoint           | Question                                                | Decision                                                                                                               |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Checkpoint 2         | FR-1 to FR-5, NFR-1 to NFR-3, and the three assumptions | Approved as written: imported aisles count as chosen; "last used" means most recently created dinner; FR-4 is `Should` |
| Checkpoint 3         | Context, units 001–003, stories, bolts 073–075          | Reopened for the mobile review before approval                                                                         |
| Checkpoint 2 (again) | FR-6 and FR-7 from the mobile review                    | Approved                                                                                                               |
| Checkpoint 4         | Ready for construction                                  | Approved; `mobile.md` deleted by the product owner now its findings are in intents 019, 021 and 024                    |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 7     |
| Non-Functional Requirements | 3     |
| Units                       | 4     |
| Stories                     | 7     |
| Bolts Planned               | 4     |

## Units Breakdown

| Unit                         | Stories | Bolts | Priority                   |
| ---------------------------- | ------- | ----- | -------------------------- |
| 001-copy-corrections         | 2       | 073   | Must (FR-1), Should (FR-5) |
| 002-ingredient-aisle-default | 2       | 074   | Must                       |
| 003-expanded-card-layout     | 1       | 075   | Should (cuttable)          |
| 004-mobile-overlap-fixes     | 2       | 076   | Should (cuttable)          |

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction with bolt `073-copy-corrections` (smallest, Must).
2. Then `074-ingredient-aisle-default`, the only Must-level contract change.
3. `075` and `076` are independent and cuttable; both need verifying at real viewport widths.

## Dependencies

None between units. Within bolt 074, story 001 lands before 002.
