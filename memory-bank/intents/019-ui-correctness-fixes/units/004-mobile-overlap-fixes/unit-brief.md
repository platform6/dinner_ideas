---
unit: 004-mobile-overlap-fixes
intent: 019-ui-correctness-fixes
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-09-17T16:01:11Z'
updated: '2026-09-17T16:01:11Z'
---

# Unit Brief: Mobile Overlap Fixes

## Purpose

On a phone, nothing the cook needs to read sits permanently under something else.

## Scope

### In Scope

- The shopping list's sticky phone footer: the end of the list is reachable above it, and focus never lands beneath it
- The catalog card's "More actions" menu: it never covers the card's title

### Out of Scope

- Touch-target sizes, including the footer's buttons and the menu button (intent 024)
- Mid-scroll content passing beneath the sticky footer, which is how a sticky footer works
- The md+ layouts, beyond confirming they don't regress

## Notes

Added after Checkpoint 3 from the product owner's mobile review (`mobile.md`). The review said the
footer is "fixed" with "no bottom padding reserved". It is `position: sticky` (`ShoppingListPage.tsx:429`),
which already reserves its own space at the end of the flow, so the requirement targets what can
actually go wrong: the end of the list and focused controls.

The menu is `placement="bottom-end"` (`DinnerCard.tsx:274`). A phone-width title wraps under the
button's row, which is where the menu lands.

## Stories

- `001-footer-never-hides-content`: The phone footer never hides content for good (Should)
- `002-card-menu-clears-title`: A card's action menu never covers its title (Should)
