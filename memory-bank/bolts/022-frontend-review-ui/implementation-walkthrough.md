---
stage: implement
bolt: 022-frontend-review-ui
created: 2026-08-28T17:35:00Z
---

## Implementation Walkthrough: frontend-review-ui — bolt 022 (ink ramp AA correction)

### Summary

Replaced the three failing grey values in the theme's `ink` colour scale with the WCAG-AA values
from `theme-patch.ts` §1. A single object-literal change; no component, test, or markup changes.

### Structure Overview

The `ink` scale lives in the `colors` object of the Chakra theme at `src/shared/theme/index.ts`.
Every screen consumes it only through the `ink.*` tokens (via `textStyle="faint"`, the `eyebrow`
text style, and direct `color="ink.xxx"` props), so changing the scale values propagates
everywhere without touching call sites.

### Completed Work

- [x] `src/shared/theme/index.ts` — `ink.400` `#8C8677`→`#726C5B`, `ink.300` `#A39C8B`→`#757060`,
      `ink.200` `#B8B1A0`→`#8A8272`. `ink.900 / 700 / 500` left as-is.

### Key Decisions

- **Applied `theme-patch.ts` §1 values verbatim** — the README's suggested diff source
  (`design_handoff_dinner_ideas_theme/theme.ts`) is not present in this repo; the patch file
  carries the exact target hexes and contrast ratios.
- **No call-site or test edits** — a repo-wide grep confirms the old literals (`#8C8677`,
  `#A39C8B`, `#B8B1A0`) appear nowhere outside the theme file and the handoff docs, and no snapshot
  or fixture pins them.

### Deviations from Plan

None.

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `npm run build` (`tsc -b && vite build`) — clean, exit 0
- [x] `npm run lint` (`eslint .`) — clean, exit 0
- [x] `grep -rn "8C8677|A39C8B|B8B1A0" src/` — no matches

### Developer Notes

Full test-suite run and the live per-screen contrast check are done in Stage 3 (Test) against the
story's acceptance criteria. The change is deployable on its own — it does not depend on the rest
of `theme-patch.ts` (bolt `023`).
