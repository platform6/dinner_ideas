---
stage: implement
bolt: 018-kitchen-table-ui
completed: '2026-08-27T14:05:00Z'
---

## Implementation Walkthrough: kitchen-table-ui (Cooking view restyle)

### What changed

`CookingViewPage.tsx` rewritten:

- New local `expandedIds: Set<string>` state, toggled per dinner id — cards expand/collapse
  independently.
- Collapsed row: a clickable `Box as="button"` (full-width, `aria-expanded` +
  `aria-label="Expand/Collapse {name}"`) containing a 44px `paper.sunken` cuisine-icon tile,
  `cardTitle` name, and a `meta`-styled `Clock` + "N min · N step(s)" line, with a
  `ChevronDown`/`ChevronUp` (`uiIcons.expand`/`uiIcons.collapse`) on the right.
- Expanded: the card's background switches to `brand.50` (border to `#E3E7DA`), and steps
  render as `paper.base`-tiled rows — a 30px `paper.subtle` icon circle with
  `stepIcon(instruction)` + the instruction text — replacing the old `OrderedList`/`ListItem`.
- Zero-step fallback message unchanged in copy, now shown only once its card is expanded.
- `useDinnersWithSteps`/gate logic (fewer than 3 picks, loading/error states) untouched.

### Test rewrite required by the new interaction model

The prior `CookingViewPage` had no collapse/expand at all — steps rendered immediately for
every dinner. Introducing collapsed-by-default state changes what's actually visible without
interaction, so the test file needed a genuine rewrite, not just a query tweak:

- Replaced the "shows all 3 dinners with their steps as an ordered, numbered list" test (which
  asserted on `getByRole('list')`/`listitem`, roles this restyle deliberately removes) with a
  "shows each dinner collapsed..." test asserting the cook-time/step-count line and that step
  text is _not_ present pre-expand, plus `aria-expanded="false"`.
- Added a new "expands only the tapped card, independently of the others" test — clicks two
  different cards' toggle buttons and confirms both stay open simultaneously, then collapses
  one and confirms the other survives.
- "shows a fallback note for a dinner with zero steps" now expands all 3 cards first (previously
  the fallback text was visible with no interaction at all).
- "shows the same steps unchanged once the plan is locked" now expands Tacos before asserting
  its step text.

### Verification

- `npx tsc -b`, `npx eslint .`, `npx vitest run` (124/124 passing across 20 files — 6 in
  `CookingViewPage.test.tsx`, +1 net vs. before), and `npx vite build` all pass clean.
- Not live-verified in browser — requires an authenticated session, same gap as bolts 015–017.

### Acceptance criteria

- [x] Collapsed: 44px thumb, Lora title, Clock + cook-time + step-count, `ChevronDown`
- [x] Expanded: `brand.50` fill, `ChevronUp`, steps as 30px icon tiles with `stepIcon`
- [x] Each card's expand state toggles independently of the others
- [x] Zero-step dinner still gets a graceful fallback message, restyled
- [x] `tsc -b`, `eslint`, `vitest run`, `vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 3 (Test)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
