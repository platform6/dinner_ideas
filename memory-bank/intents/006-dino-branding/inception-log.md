---
intent: 006-dino-branding
created: 2026-08-28T00:00:00Z
completed: 2026-08-28T00:00:00Z
status: complete
---

# Inception Log: dino-branding

## Overview

**Intent**: Integrate the supplied dinosaur `logo.png` as the app's mark and rename the visible
product from "Dinner Ideas" to "Dino Recipes" across five surfaces (rail header, mobile header,
login heading, `<title>`, PWA manifest). Presentation-only, deliberately light.
**Type**: enhancement (branding / asset integration)
**Created**: 2026-08-28

## Artifacts Created

| Artifact       | Status | File                                                |
| -------------- | ------ | --------------------------------------------------- |
| Requirements   | ✅     | requirements.md                                     |
| System Context | ✅     | system-context.md                                   |
| Units          | ✅     | units.md + units/001-dino-branding-ui/unit-brief.md |
| Stories        | ✅     | units/001-dino-branding-ui/stories/*.md (3)         |
| Bolt Plan      | ✅     | memory-bank/bolts/035-dino-branding-ui/bolt.md      |

## Summary

| Metric                      | Count                                 |
| --------------------------- | ------------------------------------- |
| Functional Requirements     | 4                                     |
| Non-Functional Requirements | 2 groups (Compatibility, Performance) |
| Units                       | 1                                     |
| Stories                     | 3                                     |
| Bolts Planned               | 1                                     |

## Units Breakdown

| Unit                 | Stories | Bolts   | Priority |
| -------------------- | ------- | ------- | -------- |
| 001-dino-branding-ui | 3       | 1 (035) | Must     |

## Decision Log

| Date       | Decision                                                                                                                                                                              | Rationale                                                                                                                                         | Approved |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2026-08-28 | Insert this small intent as `006-dino-branding`, ahead of `004-account-model` construction                                                                                            | User asked to pause before `004` construction and add the logo integration; `004`'s follow-ons shift to `007-auth-flows` / `008-account-settings` | Yes      |
| 2026-08-28 | Rebrand visible product name to "Dino Recipes"                                                                                                                                        | The supplied logo carries a "Dino Recipes" wordmark; user chose to adopt it over the existing "Dinner Ideas"                                      | Yes      |
| 2026-08-28 | Rename limited to 5 surfaces (rail header, mobile header, login heading, `<title>`, PWA manifest name/short_name) — NOT `package.json`, repo, tagline, description, comments, or docs | User scoped it explicitly; keep it a visible-brand pass, not a project rename                                                                     | Yes      |
| 2026-08-28 | Use the dinosaur mark only (crop out the baked-in wordmark), transparent background, small mobile-friendly sizes                                                                      | User asked for a trimmed transparent asset that loads well on mobile; the wordmark is rendered as live text                                       | Yes      |
| 2026-08-28 | Keep it a light intent — 1 unit, 3 stories, 1 bolt; merge Checkpoints 2 and 3 into one review                                                                                         | Small presentation-only change; user asked for a lighter intent                                                                                   | Yes      |

## Scope Changes

None.

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete (merged Checkpoint 2/3, 2026-08-28)

## Next Steps

1. Combined review of requirements + artifacts
2. On approval → Construction: `/specsmd-construction-agent --unit="001-dino-branding-ui" --bolt-id="035-dino-branding-ui"`

## Dependencies

- Independent of every other intent. Touches `Layout.tsx`, `LoginForm.tsx`, `index.html`,
  `vite.config.ts`, and `public/` assets — none of which `004-account-model` modifies.
- Can ship before or after `004`; the user is doing it first.
