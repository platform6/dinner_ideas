---
stage: implement
bolt: 085-tap-bar-to-open
created: '2026-10-19T11:45:08Z'
---

## Implementation Walkthrough: tap-bar-to-open

### Summary

On This week, a picked dinner's bar now opens and closes it, as the expand icon does. The icon and
remove stop the click from reaching the bar, and the open details sit outside the bar.

### Structure Overview

All in `PlanPage.tsx`, inside the `selections.map`:

- **`toggle`**: one function per dinner (desktop flips `allExpanded`, phone calls `toggleRow`),
  used by both the bar and the icon.
- **`barProps`**: `cursor: pointer` and `onClick: toggle`, spread on the phone row's `HStack` and
  on a new inner `Stack` around the desktop card's badge row, photo slot, and name and meta.
- **`cardHoverProps`**: the Cook tab's border transition, and a `line.brand` border on hover while
  collapsed (from `line.brandSubtle`), spread on the phone `Box` and the desktop card `Stack`.

### Completed Work

- [x] `src/features/weekly-plan/components/PlanPage.tsx` - The bar toggles. The expand icon and remove call `e.stopPropagation()`. The desktop card's top three pieces are wrapped in one `Stack gap={2.5}`, so the spacing is unchanged and `{details}` stays outside it
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` - A new "tapping the bar (intent 027)" describe inside the intent 026 one, reusing its fixtures and `renderAt`: 6 tests (7 runs, one at both widths)

### Key Decisions

- **No role or tab stop on the bar**: the icon is still the one keyboard and screen-reader control,
  so nothing is announced twice. A test checks that the bar has no `tabindex` or `role`.
- **Stop on the icon, not a check in the bar**: the bar doesn't need to know what was clicked
  inside it. Each button stops its own click.
- **The bar's click handler is on a plain `div`**: there's no `jsx-a11y` rule in the lint config,
  and none is needed, because the icon covers keyboard use.

### Deviations from Plan

- **Scope added during the test stage (FR-4)**, at the product owner's request: the expand icon now
  comes before remove in both layouts, so remove sits at the edge, and remove's icon is
  `heart.500`. That's the app's existing destructive red, used by the catalog's Remove menu item.
  The request was for a light red. Against the card's `brand.50` (`#F3F5EE`), `heart.500` is
  4.49:1. A mid tint such as `#C46A55` is 3.45:1, still above the 3:1 needed for an icon. A truly
  light tint such as `#D98B79` is 2.41:1, too faint. The existing token was used, and the product
  owner can choose the mid tint. One more test (at 390px and 1280px) checks the order

### Dependencies Added

None.

### Developer Notes

- **The existing tests guard the double toggle.** With the icon's `stopPropagation` removed for a
  moment, 7 of the intent 026 tests failed, because the icon toggled twice and the dinner stayed
  shut. It's back, and the suite passes.
- Results: 881/881 Vitest (up from 872), `tsc -b` clean, `eslint src --max-warnings=0` clean.
  `git diff -- supabase/` is empty.
