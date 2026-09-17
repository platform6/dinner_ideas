---
stage: implement
bolt: 076-mobile-overlap-fixes
created: '2026-09-17T17:34:33Z'
---

## Implementation Walkthrough: mobile-overlap-fixes

### Summary

The shopping list's phone footer now tells the browser how much of the bottom of the screen it
covers, so a focused item is scrolled clear of it. A catalog card's action menu now opens below the
card's whole header block, or above the button when there's no room, so a wrapped title is never
covered.

### Structure Overview

The phone footer became a small shared component that owns both its sticky styling and the
document's bottom scroll padding for as long as it is mounted. The shopping list uses it in place
of its inline footer. The tab bar's height moved to its own module, so the footer can clear it
without importing the app shell and its auth. The card menu keeps Chakra's `Menu` and gains a
Popper offset computed at positioning time. The distance rule is a pure function in its own module;
the card supplies the two measured elements.

### Completed Work

- [x] `src/shared/components/tab-bar.ts` - the phone tab bar's height, shared
- [x] `src/shared/components/Layout.tsx` - reads the tab bar height from the shared module (value
      unchanged)
- [x] `src/shared/components/StickyPhoneFooter.tsx` - sticky footer above the tab bar; sets the
      document's bottom scroll padding to tab bar + measured footer height + 8px, re-measures as
      its content changes, removes it on unmount
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` - uses the shared footer on
      phones; the md+ header layout is untouched
- [x] `src/features/dinners/components/card-menu-offset.ts` - the distance rule: below the header
      block for bottom placements, the normal gap for top placements or when unmeasured
- [x] `src/features/dinners/components/DinnerCard.tsx` - measures the header and the menu button,
      and passes the offset to the menu through Chakra's `modifiers` prop

### Key Decisions

- **A component rather than a hook for the footer**: the shopping list returns early for loading
  and empty states before its footer branch, so mount and unmount of the footer itself is the
  honest lifecycle for the padding.
- **Measured, not a fixed number**: the lock nudge inside the footer comes and goes, changing its
  height.
- **An offset function, not a new menu**: one menu at every width, with the dinner's name always
  readable. Chakra applies custom modifiers after its own, so this is the documented override.
- **Tab bar height in its own module**: importing it from `Layout.tsx` would pull auth and the
  Supabase client into the footer and its tests.

### Deviations from Plan

The tab bar constant lives in `tab-bar.ts` rather than being exported from `Layout.tsx`, for the
import reason above. Otherwise none.

### Dependencies Added

None.

### Developer Notes

- `tsc -b`, `eslint src --max-warnings=0` and all 765 existing tests pass; no existing test changed.
- **Checked in the browser before this checkpoint**, as the plan required for the menu approach.
  Local dev server, the household's catalog, signed in by the product owner; no menu item chosen,
  no data changed:
  - phone width, card menu (Popper's computed positions): 4-line title near the top, menu below at
    205px under a title ending at 180px; 7-line title, menu at 325px under 300px; same card near
    the bottom, flipped above the button (menu ends 558px, button starts 566px); no overlap in any
    case
  - 3 columns: 7-line title, menu below at 347px under 322px, and flipped above near the bottom;
    no overlap
  - shopping list at phone width: padding 176px (70 + 98 + 8); focusing an item under the footer
    scrolled the page 310px and cleared it; end of list unchanged (last item 479px, footer
    511–609px, tab bar 610px); padding removed after navigating away
- Browser screenshots of this tab timed out partway through, so the menu checks read Popper's
  positions directly instead of screenshots. The frame, tab and dev server were removed afterwards.
