---
intent: 005-desktop-layout
created: 2026-08-28T19:30:00Z
completed: 2026-08-28T19:45:00Z
status: complete
---

# Inception Log: desktop-layout

## Overview

**Intent**: Add the desktop layout the app never had — a persistent left rail at md+, a content
measure cap, md+ shapes for the three screens that earn one (shopping list, this week, store
setup), a catalog breakpoint move, pointer-hover states, and the test infrastructure to test
responsive components. Keeps `ux-guide.md`'s low desktop bar. Below md, unchanged from intent `003`.
**Type**: brown-field (net-new presentation layer over an existing app)
**Created**: 2026-08-28

## Artifacts Created

| Artifact       | Status | File                                                 |
| -------------- | ------ | ---------------------------------------------------- |
| Requirements   | ✅     | requirements.md                                      |
| System Context | ✅     | system-context.md                                    |
| Units          | ✅     | units.md + units/001-desktop-layout-ui/unit-brief.md |
| Stories        | ✅     | units/001-desktop-layout-ui/stories/*.md (9)         |
| Bolt Plan      | ✅     | memory-bank/bolts/032–034-desktop-layout-ui/bolt.md  |

## Summary

| Metric                      | Count                                          |
| --------------------------- | ---------------------------------------------- |
| Functional Requirements     | 9                                              |
| Non-Functional Requirements | 2 groups (Compatibility, Accessibility/UX bar) |
| Units                       | 1                                              |
| Stories                     | 9                                              |
| Bolts Planned               | 3                                              |

## Units Breakdown

| Unit                  | Stories | Bolts | Priority |
| --------------------- | ------- | ----- | -------- |
| 001-desktop-layout-ui | 9       | 3     | Must     |

## Decision Log

| Date       | Decision                                                                                                   | Rationale                                                                                                                        | Approved   |
| ---------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-08-28 | This intent renumbered `004-desktop-layout` → `005-desktop-layout`; bolts `026–028` → `032–034`            | A concurrent specsmd session created `004-account-model` (bolts `026–031`) at the same time; renumbered to avoid the collision   | Yes (user) |
| 2026-08-28 | Rail renders one nav at a time via `useBreakpointValue`, not `Layout.reference.tsx`'s CSS `display` toggle | Two navs in the DOM would put two links per route → every `Layout.test.tsx` singular query breaks; needs FR-9's test infra first | Yes        |
| 2026-08-28 | md (768px) is the only breakpoint switch; Catalog's 3rd column at `xl` is the lone exception               | Straight from README part two — "one switch, one alternate layout to maintain"                                                   | Yes        |
| 2026-08-28 | This-week photo slot ships as the empty `paper.sunken` tile                                                | Same decision as `003` finding 12 — no image field on the model, photos are future work                                          | Yes        |

## Scope Changes

None.

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete (autonomous run per user goal "complete remaining ui intents without approval prompts")

## Next Steps

1. Begin Construction Phase
2. Start with Unit: `001-desktop-layout-ui`, bolt `032-desktop-layout-ui` (test infra + rail + measure cap + login)
3. Execute: `/specsmd-construction-agent --unit="001-desktop-layout-ui" --bolt-id="032-desktop-layout-ui"`

## Dependencies

Depends on intent `003-frontend-review-remediation` (complete) — corrected ink ramp,
`line.brandSubtle`, finding-3 sticky-bar fix. Unrelated to the concurrent `004-account-model` intent
beyond both touching `useAuth` (Layout imports it read-only; `004` modifies it — a later merge, not
a blocker).
