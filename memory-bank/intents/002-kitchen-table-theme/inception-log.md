---
intent: 002-kitchen-table-theme
created: 2026-08-27T09:00:00Z
completed: null
status: in-progress
---

# Inception Log: kitchen-table-theme

## Overview

**Intent**: Adopt a provided "Kitchen Table" design system (warm olive/cream, Lora + Outfit, phone-first) across the whole app, plus 3 structural navigation changes — sourced from a finished design handoff bundle (`theme.ts`, `icons.tsx`, README), not designed from scratch.
**Type**: brown-field (presentation-layer restyle of an existing, fully-built app)
**Created**: 2026-08-27

## Artifacts Created

| Artifact       | Status | File                            |
| -------------- | ------ | ------------------------------- |
| Requirements   | ✅     | requirements.md                 |
| System Context | ✅     | system-context.md               |
| Units          | ✅     | units/{unit-name}/unit-brief.md |
| Stories        | ✅     | units/{unit-name}/stories/*.md  |
| Bolt Plan      | ✅     | memory-bank/bolts/bolt-*.md     |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 12    |
| Non-Functional Requirements | 3     |
| Units                       | 1     |
| Stories                     | 12    |
| Bolts Planned               | 6     |

## Units Breakdown

| Unit                 | Stories | Bolts | Priority |
| -------------------- | ------- | ----- | -------- |
| 001-kitchen-table-ui | 12      | 6     | Must     |

## Decision Log

| Date       | Decision                                                                                                         | Rationale                                                                                                                                                                                        | Approved |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 2026-08-27 | Ship all 3 optional structural changes (bottom tab bar, filter chips + suppressed route, suppress off card face) | User confirmed "all three" — handoff frames them as one cohesive phone-first redesign                                                                                                            | Yes      |
| 2026-08-27 | Extrapolate the theme onto the 4 post-handoff screens/features rather than commissioning fresh mockups           | User confirmed "extrapolate" — faster, and the established tokens/patterns are detailed enough to extend confidently                                                                             | Yes      |
| 2026-08-27 | "rosie-approved" heart is a display rule keyed on a tag literally named `rosie-approved`, not a schema field     | Reconciles the handoff (predates FR-9's tag system) with the now-generic tag model from `001-weekly-dinner-planner`'s enhancement round — zero schema change, reuses existing tag infrastructure | Yes      |
| 2026-08-27 | "Not interested" moves to an overflow menu, not a swipe gesture                                                  | Works identically on touch and desktop/mouse, consistent with `ux-guide.md`'s "remain usable on desktop" note                                                                                    | Yes      |
| 2026-08-27 | `public/icon.svg` + `scripts/generate-pwa-icons.mjs`'s generated PNGs both get recolored to `brand.500`          | Both confirmed to exist and use simple hardcoded teal RGB literals — trivial to update, no need to leave as an open question                                                                     | Yes      |

## Scope Changes

None yet.

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction Phase
2. Start with Unit: 001-kitchen-table-ui, bolt 014-kitchen-table-ui (foundation)
3. Execute: `/specsmd-construction-agent --unit="001-kitchen-table-ui" --bolt-id="014-kitchen-table-ui"`

## Dependencies

Depends on intent `001-weekly-dinner-planner` being complete (it is) — this intent restyles that app's existing screens/features, adding no new business capability of its own.
