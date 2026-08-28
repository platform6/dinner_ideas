---
stage: implement
bolt: 023-frontend-review-ui
created: 2026-08-28T18:55:00Z
---

## Implementation Walkthrough: frontend-review-ui — bolt 023 (rest of theme-patch.ts)

### Summary

Applied `theme-patch.ts` §§2–5 to the Chakra theme: added the `line.brandSubtle` token and removed
the raw `#E3E7DA` literals, replaced the `Alert` stub with the `heart`/`brand` palette block, added
theme entries for `Menu` / `Textarea` / `CloseButton`, and promoted the olive focus ring to
`styles.global` while dropping `Button`'s private copy. One call-site edit in `CookingViewPage.tsx`
for the token rename.

### Structure Overview

All theme changes are contained in `src/shared/theme/index.ts`: `colors.line`, `layerStyles`,
`components` (Menu/Textarea/CloseButton/Alert), `components.Button.baseStyle`, and `styles.global`.
Component call sites are unchanged except `CookingViewPage.tsx`, which had one inline hex.

### Completed Work

- [x] `src/shared/theme/index.ts`
  - `colors.line.brandSubtle: '#E3E7DA'` added (§2)
  - `layerStyles.cardSelected.borderColor` and `components.Input.variants.filled.field.borderColor`
    now reference `line.brandSubtle` (§2)
  - `components.Menu`, `components.Textarea`, `components.CloseButton` added verbatim from §3
  - `components.Alert` replaced with the §4 block — `baseStyle.container`/`icon` + `variants.subtle`
    status-map function (`error`/`warning`→`heart`, `success`→`brand`+`line.brandSubtle`,
    `info`→neutral) + `defaultProps.variant: 'subtle'`
  - `components.Button.baseStyle._focusVisible` removed (§5)
  - `styles.global` gained the `:focus-visible` selector rule from §5
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` — `'#E3E7DA'` → `'line.brandSubtle'`

### Key Decisions

- **Applied §§2–5 verbatim.** `variants.subtle` kept as a `(props) => …` function (Chakra v2
  `extendTheme` supports function variants; `LoginForm` error-path tests confirm it renders).
- **`Menu`/`Textarea`/`CloseButton` inserted before `Alert`** in `components`; `Alert` kept in place
  so the existing `Spinner` entry order is undisturbed.

### Deviations from Plan

None.

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `grep -rn "E3E7DA" src/` → only the token definition on `colors.line` remains
- [x] `npm run build` (`tsc -b && vite build`) — clean, exit 0
- [x] `npm run lint` — clean, exit 0

### Developer Notes

`Input`/`Select` variants keep their own `_focusVisible: { boxShadow: 'none' }`; the global ring is
the floor for controls that had no focus style (Menu items, the cooking accordion header
`as="button"`, the pick `Checkbox`). Visual confirmation of the ring on those three and of inputs
being unchanged is recorded in the test walkthrough.
