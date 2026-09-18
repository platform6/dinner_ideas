---
stage: implement
bolt: 077-touch-target-size
created: '2026-09-18T13:49:31Z'
---

## Implementation Walkthrough: touch-target-size

### Summary

Four theme entries now give controls a 44px minimum below `md`, and leave them denser from `md` up.
A browser sweep of every interactive control on four screens confirms Store setup and Settings are
now entirely clear, and lists what the theme could not reach.

### Structure Overview

All four changes are in the theme, expressed as responsive values (`['44px', null, '34px']`), so no
component overrides a size and no render path calls a breakpoint hook. Nothing outside
`theme/index.ts` changed.

### Completed Work

- [x] `src/shared/theme/index.ts` - `Button.sizes.sm` 44px below `md` (34px above); `Select`'s
      outline field 44px below `md` (38px above); a new `Tabs` entry giving a tab a 44px minimum
      below `md`; `Menu` items a 44px minimum below `md`, centred; a new `Tag` entry with a 44px
      minimum height and width below `md`; the stale comment replaced
- [x] `src/features/dinners/components/DinnerCard.tsx` - the pick pill's hard-coded 34px height
      becomes 44px below `md`

### Key Decisions

- **Four entries, not one.** `Button.sizes.sm` reaches only `Button` and `IconButton`. A select's
  height comes from its variant, a tab's from Chakra's own size, a menu item's from theme padding.
  The plan named all four before any code changed.
- **Responsive values in the theme**, so the breakpoint lives in one place.
- **`minH`, not `h`, for tabs and menu items**, which grow with their content.

### Deviations from Plan

None in what was changed. The plan predicted leftovers; there are three, listed below.

### Dependencies Added

None.

### Developer Notes

- `tsc -b`, `eslint src --max-warnings=0` and all 777 tests pass, unchanged.

#### Browser sweep at phone width (384px)

Every `button`, `a[href]`, `input`, `select`, `textarea`, tab, menu item and switch was measured;
a Chakra checkbox's hidden 1×1 input was measured by its label, which is the real target.

| Screen          | Controls | Under 44×44                                                    |
| --------------- | -------- | -------------------------------------------------------------- |
| `/store-config` | 82       | **0**                                                          |
| `/settings`     | 16       | **0**                                                          |
| `/` (catalog)   | 298      | 53 — all of them the pick pill, 77×34                          |
| `/dinners/new`  | 38       | 10 — three step buttons at 24×24, seven tag chips at 24px tall |

#### Leftovers, and what the product owner decided

Three controls the four theme entries could not reach were taken to the Stage 2 checkpoint:

1. **The catalog's pick pill, 77×34** — hard-coded in `DinnerCard`'s `PickPill`, the catalog's
   primary action. **Fixed here**, at the product owner's direction.
2. **The tag chips in Add a dinner, 24px tall** — Chakra `Tag` with an `onClick` (`TagEditor.tsx`,
   the only place `Tag` is used). **Fixed here**, through a `Tag` theme entry. A first pass set only
   the height, and the re-sweep caught a three-letter tag at 38px wide, so the entry sets a minimum
   width too.
3. **The three cooking-step buttons, 24×24** — left for bolt 078, which also moves the destructive
   one away from the reorder arrows.

#### Re-sweep after those fixes (386px)

| Screen         | Controls | Under 44×44                            |
| -------------- | -------- | -------------------------------------- |
| `/` (catalog)  | 298      | **0**                                  |
| `/dinners/new` | 38       | 3 — the cooking-step buttons, bolt 078 |

#### Not measurable today

`/plan` and `/shopping-list` are both in their empty states: this planning week has no picks, so
the plan page shows "no plan yet" and the shopping list shows its gate. That leaves the week arrows,
"Lock in this week", the per-dinner remove buttons, the move-to-aisle buttons and the Copy footer
unmeasured — several of them named in FR-1. Picking dinners would write to the household's plan, so
it was not done. **Product owner's decision: verify those two screens at release**, in the smoke
test, when the week has picks. They are recorded as unverified until then.

#### Desktop unchanged (1018px)

Catalog Details 84×34 and the suppressed icon 34×34; the entry form's select 38px, tab 31px, tag
chip 24px, step button 24×24; Store setup's move button 34×34. All as before.

#### Inline text links

`/plan` and `/shopping-list` each contain one inline link inside a sentence ("Browse the catalog",
"the catalog"), 15px tall. A link inside running text cannot be 44px without breaking the sentence,
and the guidance is about controls, not prose. Left alone.
