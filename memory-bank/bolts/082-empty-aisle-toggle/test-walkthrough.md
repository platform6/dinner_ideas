---
stage: test
bolt: 082-empty-aisle-toggle
created: '2026-10-18T19:54:34Z'
---

## Test Report: empty-aisle-toggle

### Summary

- **Tests**: 848/848 passed, 51 files (835 after bolt 081; 13 new). `tsc -b`, `eslint src --max-warnings=0` and Prettier are clean
- **Coverage**: no formal target. Every behaviour in the story and both details added during implementation are pinned by a test that a mutant was shown to break
- **Browser** (read-only, signed-in app, the household's store "My Store", 388px viewport): 4 of 9 stops hidden behind "Show 4 empty aisles". The toggle is 44px, the page doesn't scroll sideways, and revealing then hiding restores the same 5 stops

### Test Files

- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` - New "empty aisles tucked away" block (13 tests) with its own five-stop fixture: two empty aisles, one of them at the very end, and one holding only a category. It covers:
  - what's hidden and what's shown
  - nothing hidden while placements load
  - singular and plural labels, and no toggle at 0
  - reveal in path order, then hide again
  - starting hidden on every visit
  - an aisle added this visit, and the first-run stop
  - an aisle that empties during the visit
  - move earlier and move later past a hidden aisle
  - the ends of the path as shown on screen
  - rename, reorder and remove with the toggle on
  - the "Where do you find it" sheet listing every aisle

  The existing 37 tests in the file pass unchanged.

### Mutation Check

Each edit was confirmed applied (the script refuses if the text isn't found exactly once), the file's tests run, and the source restored byte-identical:

- ✅ **Nothing hidden**: 8 tests fail
- ✅ **Category-only aisle counted empty**: 15 fail
- ✅ **`isLast` from the full path**: 1 fails
- ✅ **Move targets the full path's neighbour**: 2 fail
- ✅ **Added stop not kept** (add row and first run): 2 fail
- ✅ **Emptied stop not kept**: 1 fails
- ✅ **No loading guard**: 1 fails
- ✅ **Toggle shown at 0**: 3 fail
- ✅ **Announcement uses the absolute position**: 1 fails
- ✅ **Toggle starts revealed**: 10 fail

### Acceptance Criteria Validation

- ✅ **An aisle with no items and no category placement is hidden by default**
- ✅ **An aisle holding only a category is shown**
- ✅ **"Show N empty aisles" at the end of the path reveals them in their normal position; absent at N = 0**
- ✅ **The toggle starts hidden on each visit**
- ✅ **An aisle added during this visit stays visible while it's empty**
- ✅ **"Move earlier" lands before the previous visible aisle, not swapped with a hidden one** (and "move later" the same way)
- ✅ **With the toggle on, rename, reorder and delete work as today**
- ✅ **The "Where do you find it" sheet still lists every aisle**
- ✅ **The toggle is 44px on a phone** (measured in the browser at 388px)

### Issues Found

None in the code. Two tooling issues:

- **The window wouldn't resize.** The browser window's resize didn't change the page's viewport, which stayed 1920px. The phone check instead loaded the page in a 390px same-origin frame, which has its own viewport, so the phone breakpoint applied.
- **The dev server outlived its session again.** The session ended mid-check, and Vite stayed on port 5199. The check ran against it, since it serves the current files, and it was then stopped by PID with the port confirmed free. Bolt 080 hit the same thing.

### Notes

- **The household's empty stops**: Aisle 1, Bakery, "Garmantasdf" and Aisle 2. "Garmantasdf" looks like a test entry; it's tucked away now, and deleting it is the household's call.
- **The end-of-path case is real**: Garmantasdf and Aisle 2 sit after Protein, so "move Protein later" is disabled on screen, as the plan intended.
- **Nothing reordered on real data**: moves were checked by the page tests only. The browser check revealed and hid the empties and changed nothing.
