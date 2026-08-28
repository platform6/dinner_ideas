---
stage: test
bolt: 022-frontend-review-ui
created: 2026-08-28T17:40:00Z
---

## Test Report: frontend-review-ui — bolt 022 (ink ramp AA correction)

### Summary

- **Tests**: 132 / 132 passed (21 files) — `vitest run`
- **Build**: `tsc -b && vite build` clean
- **Lint**: `eslint .` clean
- **Coverage**: n/a — no new code paths; a theme-token value change

### Test Files

No test files added or changed. The full existing suite was run as a regression check and passes
unchanged — as expected for a token-value change that touches no markup or logic.

- [x] `src/**/*.test.tsx` (21 files, 132 tests) — all green; no assertion pinned the old ink hexes

### Acceptance Criteria Validation

- ✅ **`ink` block matches `theme-patch.ts` §1**: `ink.400 #726C5B`, `ink.300 #757060`,
  `ink.200 #8A8272`; `ink.900 / 700 / 500` untouched
- ✅ **Old literals gone**: `grep -rn "8C8677|A39C8B|B8B1A0" src/` → no matches
- ✅ **`textStyle="faint"` (→ `ink.300`) legibility**: `ink.300 #757060` computes to **4.87:1** vs
  `paper.base #FFFDFA` — passes WCAG AA. This is the token carrying real body copy (PlanPage empty
  states, SuppressedPage metadata, StoreConfigPage help text, ShoppingListPage prompt, DinnerCard
  "last made"), so the primary goal of the story is met.
- ✅ **`eyebrow` (→ `ink.400`)**: `ink.400 #726C5B` computes to **5.16:1** — passes AA.
- ⚠️ **`ink.200` ≥ 4.5:1**: applied value `#8A8272` computes to **3.75:1** by WCAG 2.x relative
  luminance, not the 4.5:1 stated in `theme-patch.ts` §1's table (see Issues Found).
- ✅ **Build / lint / suite clean**

### Contrast measurements (WCAG 2.x, vs `paper.base` #FFFDFA)

| Token     | Old       | Old ratio | New       | New ratio  | AA (4.5:1)                        |
| --------- | --------- | --------- | --------- | ---------- | --------------------------------- |
| `ink.400` | `#8C8677` | 3.57:1    | `#726C5B` | **5.16:1** | pass                              |
| `ink.300` | `#A39C8B` | 2.69:1    | `#757060` | **4.87:1** | pass                              |
| `ink.200` | `#B8B1A0` | 2.10:1    | `#8A8272` | **3.75:1** | fails 4.5 (clears 3:1 large-text) |
| `ink.500` | unchanged | —         | `#7E7869` | 4.33:1     | (unchanged, marginal)             |

### Issues Found

1. **`ink.200` lands at ~3.75:1, not the 4.5:1 quoted in `theme-patch.ts` §1.** The patch file's
   own comment says "measured against paper.base", but WCAG 2.x relative-luminance math on
   `#8A8272` / `#FFFDFA` gives 3.75:1 here. The value was applied verbatim per the "do not round or
   adjust" constraint. Practical impact is low: `ink.200` is used in exactly two places
   (`ShoppingListPage.tsx:180,188`) — the colour of a **checked / struck-through** shopping-list
   item, a deliberately de-emphasised "done" state, not primary reading text. It still improves
   from 2.10:1 → 3.75:1 and now clears the 3:1 large-text threshold. Flagged for the user to
   accept as-is or to darken `ink.200` further (would be a deviation from the handoff).
2. **`ink.500` (unchanged) computes to 4.33:1**, just under AA, vs the 4.6:1 in the patch comment —
   noted only for context; out of scope for this story (the patch marks it "unchanged").

### Notes

- Measurement basis for the discrepancy is unconfirmed — the handoff author may have measured
  `ink.200` against pure `#FFFFFF` (3.86:1 — still short) or intends it for large text only.
- The change is independently deployable; it does not depend on bolt `023`.
