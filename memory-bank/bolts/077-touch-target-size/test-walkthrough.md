---
stage: test
bolt: 077-touch-target-size
created: '2026-09-18T14:00:10Z'
---

## Test Report: touch-target-size

### Summary

- **Tests**: 786/786 passed across 49 files (777 before this bolt; +9, one new file)
- **Coverage**: not measured; no formal target. Each size is pinned by a test shown to fail when it
  is reverted, and the sizes as rendered were measured in a browser.
- `tsc -b` and `eslint src --max-warnings=0` pass; every changed and new file passes Prettier.

### Test Files

- [x] `src/shared/theme/touch-targets.test.ts` (new) - reads the built theme: the small button is
      44px below `md` and 34px above, with its font size and padding untouched; medium (44px) and
      large (52px) are unchanged; a select is 44px then 38px; a tab and a menu item have a 44px
      minimum below `md` and none above; a tag has a 44px minimum height **and width** below `md`
- [x] `src/features/dinners/components/DinnerCard.test.tsx` - the pick pill computes to 44px at
      phone width, and its generated CSS keeps 34px behind the `min-width: 48em` query

### What jsdom can and cannot show

jsdom has no layout (NFR-3), and two things about it shaped these tests:

- **Rendered without `ChakraProvider`, a responsive value collapses.** The first draft of the pill
  test asserted a computed height on a card rendered the way the rest of that file renders it — no
  provider — and Emotion emitted `height:44px;height:34px` in one rule, last-wins. It would have
  passed while proving nothing. The pill test now renders with the theme.
- **With the provider, jsdom applies the base rule and ignores the `min-width` query**, so a
  computed height is the _phone_ value. The md+ value is therefore read from the generated CSS
  rather than computed. Both are stated in the test's comments so the next reader doesn't re-learn
  it.

### Regression proof

Each value was reverted in turn and restored:

- **Small button back to a flat 34px**: 1 test failed.
- **Tag chips lose their minimum width**: 1 test failed — the case the browser sweep added after a
  three-letter tag measured 38px wide.
- **Pick pill back to a flat 34px**: 2 tests failed.

### Browser sweep (recorded in full in the walkthrough)

Every `button`, `a[href]`, `input`, `select`, `textarea`, tab, menu item and switch was measured at
386px, with a Chakra checkbox measured by its label:

| Screen          | Controls | Under 44×44 after this bolt             |
| --------------- | -------- | --------------------------------------- |
| `/` (catalog)   | 298      | **0**                                   |
| `/store-config` | 82       | **0**                                   |
| `/settings`     | 16       | **0**                                   |
| `/dinners/new`  | 38       | 3 — the cooking-step buttons (bolt 078) |

At 1018px: Details 84×34, suppressed icon 34×34, select 38px, tab 31px, Store setup move 34×34 —
unchanged (NFR-2).

### Acceptance Criteria Validation

- ✅ **Below `md`**: small buttons and icon buttons, selects, tabs, menu items, tags and the pick
  pill all at least 44px (theme tests; browser sweep)
- ✅ **At `md`+**: 34px, 38px and today's tab, menu and tag heights (theme tests; browser at 1018px)
- ✅ **Medium and large buttons unchanged** (theme test)
- ✅ **Text inside a control unchanged** (theme test asserts font size and padding)
- ✅ **Sweep at phone width**: every remaining control under 44×44 is listed and accounted for
- ✅ **No screen moved at 1018px**
- ⚠️ **`/plan` and `/shopping-list` not measured**: both are in their empty states while this
  planning week has no picks. The product owner chose to verify them in the release smoke test.
  The shopping list's footer clearance (bolt 076) is part of that check, since a taller Copy button
  changes the footer's height.
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

None in this bolt's scope. Three cooking-step buttons remain at 24×24 by decision; they are bolt
078's story.

### Notes

- The theme tests resolve `Select`'s variant and `Tabs`' base style by calling them: Chakra keeps
  some component styles as functions of the render props once themes are merged.
