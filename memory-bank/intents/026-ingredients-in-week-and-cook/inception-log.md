---
intent: 026-ingredients-in-week-and-cook
created: '2026-10-18T21:46:16Z'
completed: '2026-10-18T22:24:51Z'
status: complete
---

# Inception Log: 026-ingredients-in-week-and-cook

## Overview

**Intent**: See a picked dinner's ingredients on This week and Cook
**Type**: brown-field
**Created**: 2026-10-18T21:46:16Z

## Origin

Product owner request on 2026-10-18: expand a dinner on the This week tab to view its ingredients
there as well. Then: "Cook should also display ingredients."

## Artifacts Created

| Artifact       | Status | File                                                    |
| -------------- | ------ | ------------------------------------------------------- |
| Requirements   | ✅     | requirements.md                                         |
| System Context | ✅     | system-context.md                                       |
| Units          | ✅     | units.md, units/001-picked-dinner-details/unit-brief.md |
| Stories        | ✅     | units/001-picked-dinner-details/stories/*.md (3)        |
| Bolt Plan      | ✅     | memory-bank/bolts/084-picked-dinner-details/bolt.md     |

## Decisions

| Checkpoint | Question                                             | Decision                                                                                                        |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1          | What does This week's expand show?                   | Ingredients and steps, as in the catalog (no tags)                                                              |
| 1          | Past weeks?                                          | They expand too                                                                                                 |
| 1          | Desktop: one card or all three?                      | All three open together                                                                                         |
| 1          | Empty dinners?                                       | "No ingredients recorded."                                                                                      |
| 1          | Cook tab order and opening?                          | Not answered: defaults taken (ingredients first; collapsed until tapped, several open), flagged at Checkpoint 2 |
| 2          | FR-1 to FR-5, three NFRs, with the Cook tab defaults | Approved as written                                                                                             |
| 3          | Context, 1 unit, 3 stories, bolt 084                 | Approved                                                                                                        |

## Scope Changes

| Date       | Change                                                                                         | Reason                             | Impact                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| 2026-10-18 | Cook tab added. Renamed from `026-this-week-ingredients` to `026-ingredients-in-week-and-cook` | Product owner, before Checkpoint 1 | A second surface, plus `dinner_ingredients(*)` in the Cook tab's select |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 5     |
| Non-Functional Requirements | 3     |
| Units                       | 1     |
| Stories                     | 3     |
| Bolts Planned               | 1     |

## Units Breakdown

| Unit                      | Stories | Bolts | Priority |
| ------------------------- | ------- | ----- | -------- |
| 001-picked-dinner-details | 3       | 1     | Must     |

## Next Steps

`/specsmd-construction-agent --unit="001-picked-dinner-details" --bolt-id="084-picked-dinner-details"`
