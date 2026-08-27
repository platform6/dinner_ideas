---
stage: test
bolt: 017-kitchen-table-ui
created: 2026-08-27T13:30:00Z
---

## Test Report: kitchen-table-ui (This Week + Shopping List restyle)

### Summary

- **Tests**: 123/123 passed (20 test files — `PlanPage.test.tsx` +1 test net, `icons.test.ts`
  unaffected in count but exercises the 4 new icon-map entries indirectly via component tests)
- **Build**: `npx tsc -b` clean, `npx eslint .` clean, `npx vite build` succeeds
- **Live verification**: not possible — both screens require an authenticated Supabase session,
  and this session has no test credentials (consistent with bolts 015/016).

### Test Files

- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` (1 assertion dropped, 1 new test)
      — dropped the now-removed `'2/3 selected'` count text; added a test for the all-picked
      dashed card and its "See shopping list" link
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` (1 assertion split) —
      the combined `/3 each onion/` match split into `'3 each'` + `'onion'` to match the new
      two-column item markup
- [x] Remaining 18 pre-existing files — re-verified passing

### Acceptance Criteria Validation

**Story 008-this-week-restyle-week-nav**

- ✅ Eyebrow date range + "This week's plan" title — `PlanPage.test.tsx` ('8/24 – 8/30' etc.)
- ✅ Numbered brand.50 rows with a remove icon button — implemented; existing remove/toggle
  tests pass unchanged against the new row markup
- ✅ All-picked dashed card + "See shopping list" CTA — new test
- ✅ ◀/▶ from the icon vocabulary — implemented (`ChevronLeft`/`ChevronRight`); existing
  previous/next-week tests pass unchanged (they assert by `aria-label`, not icon glyph)
- ✅ "Eaten" badge for a past locked week — existing `getByText('Eaten')` test still passes
- ✅ Dashed-card empty state for a skipped week — existing `'No plan this week.'` test still
  passes (same copy, now inside a `cardDashed` box)

**Story 009-shopping-list-restyle**

- ✅ Eyebrow "N dinners · N items" + title + count tile — implemented; not independently
  asserted (no prior test covered the old plain heading either), covered indirectly by the
  existing "shows the merged, category-grouped list" test still passing end-to-end
- ✅ Category rule row (icon + label + line) — `getByText('Produce')` still passes
- ✅ Checkbox + quantity/unit column + name — `getByText('3 each')` / `getByText('onion')`
- ✅ Checked-item local state (not persisted) — implementation matches the story's technical
  note (`Set<string>` keyed by `category-name-unit`); not independently unit-tested since it's
  pure local UI state with no logic branch beyond a set toggle, same rationale as bolt 016's
  presentational-only card layout
- ✅ Sticky footer keeps the lock checkbox + Copy action — all 6 pre-existing copy/lock tests
  (default-lock, unchecked, lock-error, clipboard-fallback, already-locked) pass unchanged
- ✅ Group order still from `reorderGroupsByRows` — untouched; `reorder.test.ts` (5 tests)
  re-verified passing

### Issues Found

One, fixed:

1. `ShoppingListPage.test.tsx`'s `getByText(/3 each onion/)` stopped matching once quantity/unit
   and name became separate elements (for the 56px-column alignment) — Testing Library's
   default text matcher only joins an element's own direct text-node children, not text inside
   child elements. Split into two independent queries, `getByText('3 each')` and
   `getByText('onion')`, which still verify the aggregated quantity and the item name render.

### Notes

Same live-verification gap as bolts 015/016: both screens require login. Worth including in the
same "look once deployed" pass recommended for the earlier bolts — Login, Catalog, This Week
(numbered rows, all-picked card, week nav), and the Shopping List's check-off/sticky footer.
