---
stage: plan
bolt: 077-touch-target-size
created: '2026-09-18T13:18:22Z'
---

## Implementation Plan: touch-target-size

### Objective

Below `md`, every control the household taps is at least 44×44px. At `md` and above nothing moves.

### What the code shows — and one correction to the intent's reading

The theme's `Button.sizes.sm` (34px) is inherited by `Button` and `IconButton`, and **only** those.
`size="sm"` appears on other components too, and they take their height from somewhere else:

| Control                | Today                                        | On a phone     |
| ---------------------- | -------------------------------------------- | -------------- |
| `Button`, `IconButton` | `Button.sizes.sm` → 34px                     | **Too small**  |
| `Select`               | `Select.variants.outline.field` → 38px fixed | **Too small**  |
| `Tabs` (`size="sm"`)   | Chakra's own small tab, ~32px                | **Too small**  |
| `MenuItem`             | theme `py: 2` → ~36px                        | **Too small**  |
| `Input`                | `Input.variants.filled.field` → 50px         | Fine           |
| `Textarea`             | multi-line, tall                             | Fine           |
| Tab bar items          | `minW`/`minH` 44px (`Layout.tsx`)            | Fine           |
| Card pick pill         | a styled `Checkbox`, pill-sized              | To be measured |

So the intent's "one line of theme" is really **four theme entries**. All four are still the theme,
and none of them is a per-screen edit.

### Deliverables

1. **`Button.sizes.sm`**: `h` and `minW` become 44px below `md`, 34px at `md`+. Font size, padding,
   `md` (44px) and `lg` (52px) unchanged.
2. **`Select.variants.outline.field.h`**: 44px below `md`, 38px at `md`+.
3. **`Tabs`**: a theme entry giving the `sm` tab a 44px minimum height below `md`, unchanged above.
4. **`Menu.baseStyle.item`**: a 44px minimum height below `md`, unchanged above. The card's "Not
   interested" and "Remove…" are menu items.
5. **The comment above the sizes** stops claiming what wasn't true and says what is: 44px below
   `md`, denser above.
6. **Tests** (Stage 3): the theme values themselves, read from the built theme object, for each of
   the four entries and for the sizes that must not change.
7. **A browser sweep** (Stage 3), the real proof: at phone width and at 1024px, measure **every**
   interactive control on each screen and list anything under 44px.

### Dependencies

- None. No new package, no data, no schema (NFR-1). Bolts 078 and 079 wait on this.

### Technical Approach

- **Responsive values in the theme.** Chakra resolves arrays in component styles against the
  breakpoints, so `h: ['44px', null, '34px']` is "44 at base, 34 from `md`". One entry carries both,
  with no component-level overrides and no `useBreakpointValue` in render paths.
- **Why not raise `xs` too**: the three 24px cooking-step buttons are bolt 078's story, which also
  moves the destructive one. Raising them here would leave them crowded at a bigger size.
- **The sweep, not a checklist.** Rather than eyeballing the controls FR-1 names, collect every
  `button`, `a`, `input`, `select`, `[role="tab"]`, `[role="menuitem"]` and `[role="checkbox"]` on
  each screen, measure it, and report everything under 44×44. That finds what a list would miss,
  including anything this bolt doesn't fix.
- **Screens for the sweep**: catalog (with a card menu open), `/plan`, `/shopping-list` (with the
  aisle sheet open), `/store-config`, `/settings`, `/dinners/new` (both tabs).
- **Expect some misses.** Anything the four theme entries don't reach (a hand-sized control, a
  checkbox, an icon inside a row) gets listed at the Stage 2 checkpoint with a recommendation:
  fix here, hand to bolt 078, or leave with a reason.

### Acceptance Criteria

- [ ] Below `md`: `sm` buttons and icon buttons 44px, selects 44px, `sm` tabs 44px, menu items 44px
- [ ] At 1024px: 34px, 38px, and today's tab and menu heights, unchanged
- [ ] `md` (44px) and `lg` (52px) buttons unchanged at every width
- [ ] Text inside a control does not change size
- [ ] Browser sweep at phone width on all six screens: every remaining control under 44×44 is listed
      and accounted for
- [ ] Browser check at 1024px: no screen has moved
- [ ] The shopping list's footer still clears a focused item (bolt 076 measures that footer, and a
      taller Copy button changes its height)
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
