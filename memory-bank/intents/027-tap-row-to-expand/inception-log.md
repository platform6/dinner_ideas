---
intent: 027-tap-row-to-expand
created: '2026-10-19T10:20:41Z'
completed: '2026-10-19T11:11:25Z'
status: complete
---

# Inception Log: 027-tap-row-to-expand

## Overview

**Intent**: Tap a picked dinner's bar to expand it on This week
**Type**: brown-field
**Created**: 2026-10-19T10:20:41Z

## Origin

Product owner request on 2026-10-19, after v0.20.0 shipped: "make it so this week is a click on that
full bar as opposed to just the expand icon"

## Artifacts Created

| Artifact       | Status | File                                                 |
| -------------- | ------ | ---------------------------------------------------- |
| Requirements   | ✅     | requirements.md                                      |
| System Context | ✅     | system-context.md                                    |
| Units          | ✅     | units.md, units/001-tap-bar-to-open/unit-brief.md    |
| Stories        | ✅     | units/001-tap-bar-to-open/stories/001-tap-the-bar.md |
| Bolt Plan      | ✅     | memory-bank/bolts/085-tap-bar-to-open/bolt.md        |

## Decisions

| Checkpoint | Question                           | Decision                                                                                                                  |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1          | What toggles, and what doesn't?    | Phone: the bar toggles that row. Desktop: the card's top part toggles all three. Remove and the open details don't toggle |
| 1          | Keep the expand icon?              | Yes, as the keyboard and screen-reader control                                                                            |
| 1          | v0.20.0's smoke checks             | Carried into this release's smoke test                                                                                    |
| 2          | FR-1 to FR-3, two NFRs             | Approved as written                                                                                                       |
| 3          | Context, 1 unit, 1 story, bolt 085 | Approved                                                                                                                  |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 3     |
| Non-Functional Requirements | 2     |
| Units                       | 1     |
| Stories                     | 1     |
| Bolts Planned               | 1     |

## Next Steps

`/specsmd-construction-agent --unit="001-tap-bar-to-open" --bolt-id="085-tap-bar-to-open"`
