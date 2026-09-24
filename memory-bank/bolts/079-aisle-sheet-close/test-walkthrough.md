---
stage: test
bolt: 079-aisle-sheet-close
created: '2026-09-18T20:07:46Z'
---

## Test Report: aisle-sheet-close

### Summary

- **Tests**: 798/798 passed across 50 files (794 before this bolt; +4)
- **Coverage**: not measured; no formal target. The close control is pinned by tests shown to fail
  without it, and the sheet was measured in a browser at 390×667.
- `tsc -b` and `eslint src --max-warnings=0` pass; both changed files pass Prettier.

### Test Files

- [x] `src/features/store-config/components/AssignSheet.test.tsx` - the close control exists, is
      labelled "Close" and computes to 44px at phone width; pressing it closes the sheet; focus
      returns to the control that opened it; the sheet's own actions ("Take it off the path", the
      picker rows) are undisturbed. The existing Escape, focus-trap and focus-return cases still
      pass unchanged.

### Regression proof

- **Close control removed**: 3 tests failed.
- **Close control at the theme's 16px size**: 1 test failed (the 44px case).

Source restored after each.

### Browser verification, and what it caught

Local dev server against the household's own store (9 stops, 143 groceries), signed in by the
product owner, in a 390×667 frame.

**The padding alone did not satisfy FR-4.** With an explicitly placed item (avocado), the picker
lists every stop, so the sheet's content is taller than the sheet. "Take it off the path" was the
last thing in the scroll and measured **70px below the visible area** — reachable only by scrolling
the sheet, which is what the story ruled out. Extra bottom padding cannot fix that, because the
content, not the padding, is what overflows.

**Fix, made in this stage**: that action is now pinned to the bottom of the sheet (sticky), full
width, with the list still scrolling behind it. Re-measured:

|                                  | Unscrolled | Scrolled to the end |
| -------------------------------- | ---------- | ------------------- |
| Gap below "Take it off the path" | 24px       | 24px                |
| Inside the sheet                 | yes        | yes                 |

Also measured: the close control at 44×44, and pressing it closed the sheet (`closedByButton`).
The body's bottom padding resolves to 24px on a desktop browser, where the safe-area inset is 0.

### Acceptance Criteria Validation

- ✅ **A labelled close control, at least 44×44 on a phone** (test; browser)
- ✅ **Pressing it closes the sheet and returns focus to the opener** (tests; browser for the close)
- ✅ **Escape, the overlay tap and the focus trap still work** (existing tests, unchanged)
- ✅ **At 390×667 with the household's full walking path, the last action is fully visible without
  scrolling** — now true, via the sticky footer; it was not true with padding alone
- ✅ **The two screens that open the sheet are otherwise unaffected** (their suites pass unchanged)
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

The overflow described above, found in the browser and fixed within this stage. Nothing outstanding.

### Notes

- The iframe harness reports a Chakra drawer's fixed position oddly — the dialog's top read as a
  full viewport below the frame — so the measurements above are taken **relative to the sheet's own
  body**, not the viewport. That is the right frame of reference for "is it inside the sheet"
  anyway.
- Nothing was written to the household's data: the sheet was opened and closed, and no placement
  was chosen or removed.
