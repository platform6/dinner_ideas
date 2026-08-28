---
stage: test
bolt: 023-frontend-review-ui
created: 2026-08-28T18:57:00Z
---

## Test Report: frontend-review-ui — bolt 023 (rest of theme-patch.ts)

### Summary

- **Tests**: 132 / 132 passed (21 files) — `vitest run`
- **Build**: `tsc -b && vite build` clean
- **Lint**: `eslint .` clean
- No test files added or changed — theme-only change; the existing suite is the regression net.

### Test Files

- [x] `src/**/*.test.tsx` (21 files, 132 tests) — all green
  - `LoginForm.test.tsx` exercises the `<Alert status="error">` path ("shows a clear error
    message when credentials are rejected") — confirms the new function-variant `Alert` renders
    without error.
  - `CatalogFilters.test.tsx`, `CatalogPage.test.tsx`, `DinnerCard.test.tsx` exercise the card
    overflow `Menu` — confirms the new `Menu` theme entry renders.

### Acceptance Criteria Validation

- ✅ **`colors.line.brandSubtle === '#E3E7DA'`; no `#E3E7DA` literal in `src/`** — grep shows only
  the token definition on `colors.line`.
- ✅ **`Alert` entry matches §4; no call site edited** — grep confirms no `<Alert>` call site
  changed; `defaultProps.variant: 'subtle'` maps `error`/`warning`→`heart`, `success`→`brand`.
- ✅ **`Menu` / `Textarea` / `CloseButton` entries match §3** — added verbatim; `Textarea`
  `defaultProps.variant: 'filled'`.
- ✅ **Global `:focus-visible` rule present; `Button` baseStyle `_focusVisible` removed** — the
  `styles.global` selector covers `a, button, [role="button"], input, select, textarea, [tabindex]`.
  `<Button>` (a `button`), Chakra `MenuItem` (`button`), `AccordionButton` (`button`), and the
  `Checkbox` control (`input`) are all covered → the olive ring now reaches the cooking accordion
  header and the pick checkbox, which previously fell back to Chakra blue.
- ✅ **Inputs/selects keep their focus look** — `Input.variants.filled` and `Select.variants.outline`
  retain their own `_focusVisible: { boxShadow: 'none' }`, which is more specific than the global
  rule, so their appearance is unchanged.
- ✅ **build / lint / suite clean**

### Issues Found

None blocking.

- The focus-ring behaviour above is verified by mechanism (selector coverage + Chakra element
  types) and the passing render tests, not by a live keyboard-focus screenshot. A quick manual
  tab-through of the cooking accordion and a dinner card's Pick checkbox is recommended before
  release — consistent with `ux-guide.md`'s informal a11y bar. Low risk: the rule is applied
  verbatim from `theme-patch.ts` §5.

### Notes

`borderRadius: 'control'` inside the `styles.global` selector resolves via Chakra's `css()` token
pass (→ `0.75rem`); build is clean with it in place.
