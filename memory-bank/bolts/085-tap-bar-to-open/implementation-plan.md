---
stage: plan
bolt: 085-tap-bar-to-open
created: '2026-10-19T11:12:05Z'
---

## Implementation Plan: tap-bar-to-open

### Objective

On This week, a click on a picked dinner's bar opens or closes it, as the expand icon does. The
icon and remove do only their own job, and taps inside the open details don't toggle.

### Deliverables

- `PlanPage.tsx`: a click handler on the phone row's bar and on the desktop card's top part, the
  icon and remove stopping propagation, and the pointer cursor and hover border
- `PlanPage.test.tsx`: new tests in the intent 026 describe, or a new intent 027 describe that
  reuses the same fixtures and `renderAt(width)`

### Dependencies

- Intent 026's open state: `toggleRow(id)` for phone, `setAllExpanded` for desktop
- The Cook tab's hover: `_hover={isExpanded ? undefined : { borderColor: 'line.brand' }}` and
  `transition="border-color 0.12s ease"`

### Technical Approach

**One toggle per dinner.** Inside the `selections.map`, a `toggle` function is
`threeAcross ? setAllExpanded((open) => !open) : toggleRow(selection.id)`. The bar and the expand
icon both call it.

**Bubbling.**

- **Expand icon**: `onClick={(e) => { e.stopPropagation(); toggle(); }}`. Without the stop, the
  bar would toggle again and undo it. The existing intent 026 tests click the icon and check the
  result, so they'd catch a double toggle.
- **Remove**: `e.stopPropagation()` before `toggleSelection.mutate(...)`, so a removal never
  opens the row.

**Where the handler goes.**

- **Phone**: on the existing `HStack justify="space-between"` (badge, name and meta, buttons).
  The details sit below it in `Box mt={3}`, outside, so taps there don't toggle.
- **Desktop**: today the card `Stack` holds four siblings. The first three (the badge row, the
  photo slot and the name and meta) move into one inner `Stack gap={2.5}` with the handler. The
  card `Stack` keeps its `gap={2.5}`, so the spacing doesn't change, and the details stay its last
  child, outside the handler.

**Look.** The clickable element gets `cursor="pointer"`. The card (the phone `Box`, the desktop
`Stack`) gets the Cook tab's `transition` and collapsed-only `_hover` border.

**Accessibility.** The handler is on a plain `div` (`HStack` or `Stack`), with no `role` or
`tabIndex`, so there's no extra tab stop and nothing extra for a screen reader. The icon stays the
keyboard control, unchanged. `jsx-a11y` isn't in the lint config, so there's no
`click-events-have-key-events` rule to satisfy. The icon covers that need.

**Text selection.** A click that ends a drag-select on the bar would also toggle. That's the same
as the Cook tab's whole-row button, so it's left as is.

### Acceptance Criteria

- [ ] Phone (390px): clicking a dinner's name opens that row only, and clicking it again closes it
- [ ] Desktop (1280px): clicking any card's name opens all three, and clicking again closes them
- [ ] The expand icon still toggles exactly once (the existing intent 026 tests pass unedited)
- [ ] Remove removes and leaves every row collapsed
- [ ] Clicking an ingredient or step in an open dinner leaves it open, on phone and on desktop
- [ ] A past week's dinner opens from its bar
- [ ] The icon's `aria-expanded` and label are unchanged, and the bar has no `tabIndex` or `role`
- [ ] `eslint`, `tsc -b` and the full Vitest suite pass. `git diff -- supabase/` is empty
- [ ] Browser check (cursor, hover border and tap target at 390px and desktop width): in the
      release smoke test
