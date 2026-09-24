---
stage: test
bolt: 078-dense-row-layouts
created: '2026-09-18T14:48:12Z'
---

## Test Report: dense-row-layouts

### Summary

- **Tests**: 794/794 passed across 50 files (786 before this bolt; +8, one new file)
- **Coverage**: not measured; no formal target. Each rule is pinned by a test shown to fail when it
  is undone, and both rows were measured in a browser at two widths.
- `tsc -b` and `eslint src --max-warnings=0` pass; every changed and new file passes Prettier.

### Test Files

- [x] `src/features/recipe-entry/components/CookingStepsEditor.test.tsx` (new) - remove is outside
      the reorder pair's group and after it in the document; all three controls compute to 44px at
      phone width; each control still names its step; removing still drops that step and leaves the
      others in order; reordering still works and the end arrows are still disabled
- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` - a stop row stacks on a
      phone and stays one row from `md` up (the media query read from the generated CSS); the aisle
      name has no line clamp on a phone while the preview keeps one; the count, three buttons and
      chevron stay grouped, and the name is not inside that group

### Regression proof

Each change was undone in turn and restored:

- **Remove back between the arrows**: 1 test failed.
- **Step buttons back to the undefined `xs` size**: 1 test failed.
- **Store setup row back to a single row at every width**: 1 test failed.
- **Aisle name clamped to one line on a phone again**: 1 test failed.

### Browser verification

Local dev server against the household's data, signed in by the product owner. Measured, not eyeballed.

**Phone (384px)**

| Check                                                            | Result                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Store setup row direction                                        | `column` — name above the controls                                              |
| Store setup buttons                                              | 44×44 each                                                                      |
| Aisle name with a long name (set in the DOM only, nothing saved) | wraps to 48px tall, from 24px; no clamp                                         |
| Step controls                                                    | below the textarea; up 44×44 at x=44, down 44×44 at x=96, remove 44×44 at x=309 |
| Gap between the arrows and remove                                | 169px                                                                           |

**Desktop (1018px)**

| Check                     | Result                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Store setup row direction | `row`, name beside the controls, buttons 34×34, name clamped to one line |
| Step controls             | beside the textarea, stacked vertically, 34×34                           |

### A deviation the browser caught

The first implementation nested the two arrows in a horizontal group at **every** width, so at
1018px they sat side by side rather than stacked, and the remove button stretched to 76px wide to
fill the column. Tests did not catch it: they assert grouping and order, which were correct, and
jsdom has no layout. The inner group is now responsive too — a row on a phone, a column from `md`
up — and the re-measurement shows 34×34 buttons in the original vertical arrangement.

### Acceptance Criteria Validation

- ✅ **Phone: up, down and remove at least 44×44, remove separated by position** (browser; tests)
- ✅ **Phone: a long aisle name is not cut short; the preview keeps one line** (browser; tests)
- ✅ **Phone: count, buttons and chevron on their own line** (browser; test)
- ✅ **Tapping a row still expands it; tapping a button still does not** (existing tests, unchanged)
- ✅ **Renaming in place still works** (existing test, unchanged)
- ✅ **Removing a step renumbers with no gap, and the label names the step** (tests)
- ✅ **`md`+ keeps today's arrangement**, with step buttons at 34px rather than 24px, the deviation
  the product owner approved at the Stage 1 checkpoint
- ✅ **Browser check at phone width and 1018px on both screens**
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

None outstanding. The desktop arrow layout above was found and fixed within this stage.

### Notes

- The long-aisle-name check replaced the text of a rendered node in the browser and put it back; no
  rename was saved, and nothing was written to the household's data.
