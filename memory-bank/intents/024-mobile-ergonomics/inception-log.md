---
intent: 024-mobile-ergonomics
created: '2026-09-17T16:01:11Z'
completed: '2026-09-18T13:15:12Z'
status: complete
---

# Inception Log: 024-mobile-ergonomics

## Overview

**Intent**: Use it by hand on a phone
**Type**: brown-field
**Created**: 2026-09-17T16:01:11Z

## Origin

The product owner's mobile review (`mobile.md`), triaged on 2026-09-17. Its findings were split
across intents at the product owner's direction:

| Finding                                                   | Went to                  |
| --------------------------------------------------------- | ------------------------ |
| Copy still says 3                                         | 019 FR-1 (already there) |
| Shopping-list footer and card menu overlapping content    | 019 FR-6, FR-7           |
| Catalog header on mobile; filter dropdown on mobile       | 021                      |
| Touch targets; Store setup truncation; aisle-picker sheet | **024 (this intent)**    |

## Artifacts Created

| Artifact     | Status | File            |
| ------------ | ------ | --------------- |
| Requirements | draft  | requirements.md |

## Decisions

| Checkpoint | Question                                                               | Decision          |
| ---------- | ---------------------------------------------------------------------- | ----------------- |
| Triage     | Where do touch targets, Store setup truncation and the aisle sheet go? | A new intent, 024 |

## Checkpoints 1–4 (2026-09-18)

| Checkpoint   | Question                                                | Decision                                                                                                   |
| ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Checkpoint 1 | How do controls reach 44px?                             | Grow the theme's `sm` to 44px below `md` only — not invisible hit areas, which would overlap in tight rows |
| Checkpoint 1 | The 24px "Remove step" button?                          | Bigger **and** moved away from the reorder arrows; no confirmation dialog                                  |
| Checkpoint 1 | Store setup rows truncating the aisle name?             | Name and preview first on a phone, actions on their own line                                               |
| Checkpoint 2 | FR-1 to FR-4, NFR-1 to NFR-3, and the three assumptions | Approved as written                                                                                        |
| Checkpoint 3 | Context, 3 units, 5 stories, bolts 077–079              | Approved                                                                                                   |
| Checkpoint 4 | Ready for construction                                  | Approved                                                                                                   |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 4     |
| Non-Functional Requirements | 3     |
| Units                       | 3     |
| Stories                     | 5     |
| Bolts Planned               | 3     |

## Units Breakdown

| Unit                  | Stories | Bolts | Priority          |
| --------------------- | ------- | ----- | ----------------- |
| 001-touch-target-size | 2       | 077   | Must              |
| 002-dense-row-layouts | 2       | 078   | Must              |
| 003-aisle-sheet-close | 1       | 079   | Should (cuttable) |

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin with bolt `077-touch-target-size`; the other two depend on it.
2. Then `078-dense-row-layouts`, and `079-aisle-sheet-close` if it is not cut.
3. Every bolt ends in a browser at phone width and at 1024px (NFR-3).

## Dependencies

078 and 079 each require 077. Neither requires the other.
