---
intent: 025-hide-photo-slots
created: '2026-10-18T19:55:31Z'
completed: '2026-10-18T20:09:08Z'
status: complete
---

# Inception Log: 025-hide-photo-slots

## Overview

**Intent**: Put the photo slots away for now
**Type**: brown-field
**Created**: 2026-10-18T19:55:31Z

## Origin

Product owner request on 2026-10-18: hide the UI put in place for pictures, but keep it as part of
the design.

## Artifacts Created

| Artifact       | Status | File                                              |
| -------------- | ------ | ------------------------------------------------- |
| Requirements   | ✅     | requirements.md                                   |
| System Context | ✅     | system-context.md                                 |
| Units          | ✅     | units.md, units/001-photo-slots-off/unit-brief.md |
| Stories        | ✅     | units/001-photo-slots-off/stories/*.md (2)        |
| Bolt Plan      | ✅     | memory-bank/bolts/083-photo-slots-off/bolt.md     |

## Decisions

| Checkpoint | Question                                                                                        | Decision                                                  |
| ---------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1          | Are the three slots the full list?                                                              | Yes                                                       |
| 1          | What happens to the cuisine icons?                                                              | They stay. The cooking view gets an inline meta-row icon. |
| 1          | How is the switch controlled?                                                                   | A code constant, not an env variable                      |
| 2          | FR-1 to FR-4, three NFRs; the catalog card's 30px icon goes with its tile (meta-row icon stays) | Approved as written                                       |
| 3          | Context, 1 unit, 2 stories, bolt 083                                                            | Approved                                                  |
| 4          | Ready for construction                                                                          | Approved                                                  |

## Scope Changes

| Date | Change | Reason | Impact |
| ---- | ------ | ------ | ------ |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 4     |
| Non-Functional Requirements | 3     |
| Units                       | 1     |
| Stories                     | 2     |
| Bolts Planned               | 1     |

## Units Breakdown

| Unit                | Stories | Bolts | Priority |
| ------------------- | ------- | ----- | -------- |
| 001-photo-slots-off | 2       | 083   | Must     |

## Ready for Construction

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. `/specsmd-construction-agent --unit="001-photo-slots-off" --bolt-id="083-photo-slots-off"`

## Dependencies

None. Independent of intent 023 and of intents 020–022.
