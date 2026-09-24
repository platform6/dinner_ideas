---
stage: plan
bolt: 079-aisle-sheet-close
created: '2026-09-18T17:58:01Z'
---

## Implementation Plan: aisle-sheet-close

### Objective

The "Where do you find it" sheet can be closed by a control you can see, and its last action is
never flush with the bottom of the screen.

### What the code shows

- **`AssignSheet.tsx:97-206`** is a Chakra `Drawer`, `placement="bottom"`, with an overlay and
  `finalFocusRef`. Escape, the outside tap, the focus trap and focus return to the trigger already
  work — the component's own comment says that is why a drawer was chosen. What it has never had is
  anything visible to press.
- **Its header is three lines of text**: the eyebrow "Where do you find it", the item name, and the
  resolution line. There is no header row, so a close control has somewhere obvious to go.
- **The body is `px={4} py={4}`** inside a `maxH="85vh"` sheet. The last thing in it is "Take it off
  the path", shown only for an explicitly placed item, so its 16px of padding is all that separates
  it from the bottom edge of the screen.
- **`CloseButton` in this theme is 16×16px** at `size="sm"`, which is why the obvious component is
  the wrong one here (FR-1 wants 44px).
- **`uiIcons.remove` is the X** already used for "remove" and "not like this" elsewhere.
- Two screens open this sheet: `/store-config` and `/shopping-list`. Both pass `onClose`.

### Deliverables

1. **A close control** in a new header row: the eyebrow, name and resolution line on the left, an
   `IconButton` at the top right, `size="sm"` (so 44px on a phone, 34px at md+, from bolt 077),
   `variant="ghost"`, `aria-label="Close"`, icon `uiIcons.remove`, calling the existing `onClose`.
2. **Bottom clearance**: the body's bottom padding grows on a phone, and adds the device's own
   safe-area inset, so the last action clears both the screen edge and a home indicator.
3. **Tests** (Stage 3): the control exists, is labelled, closes the sheet, and Escape still closes
   it; the control is 44px at phone width; focus returns to the trigger either way.
4. **Browser check** (Stage 3) at 390×667 with the longest list the household's data produces:
   the last action fully visible without scrolling the sheet, and the close control measured.

### Dependencies

- **Bolt 077** (complete) for the 44px size.
- No new package, no data, no schema (NFR-1).

### Technical Approach

- **`IconButton`, not `DrawerCloseButton`**: Chakra's built-in renders a `CloseButton`, which this
  theme sizes at 16px. Overriding that component's theme for one use would change the two places
  `CloseButton` is already used (a dinner card and a shopping-list alert).
- **`onClose` unchanged**: the drawer already routes Escape and the overlay tap through it, so the
  new control is a third trigger for the same path, and focus return keeps working for free.
- **Safe area**: `paddingBottom: calc(<space> + env(safe-area-inset-bottom))`. On a desktop browser
  the inset is 0, so nothing changes there.
- **The sheet's own scrolling is untouched**: a long list still scrolls. The requirement is that
  the _last action_ is not clipped at the bottom, not that the sheet never scrolls.

### Acceptance Criteria

- [ ] The sheet shows a close control, labelled for screen readers, at least 44×44 on a phone
- [ ] Pressing it closes the sheet and returns focus to whatever opened it
- [ ] Escape, the overlay tap and the focus trap still work
- [ ] At 390×667 with the longest suggestion list the data produces, "Take it off the path" is
      fully visible without scrolling the sheet
- [ ] The two screens that open the sheet (`/store-config`, `/shopping-list`) are unaffected
      otherwise
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
