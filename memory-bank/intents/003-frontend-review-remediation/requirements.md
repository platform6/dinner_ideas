---
intent: 003-frontend-review-remediation
phase: inception
status: complete
created: '2026-08-28T16:30:00Z'
updated: '2026-08-28T17:10:00Z'
---

# Requirements: Frontend Review Remediation

## Intent Overview

A front-end review of the shipped Kitchen Table implementation (`design_handoff_desktop_and_review/`)
raised twelve findings against the current code. This intent applies the subset that does **not**
require the desktop layout — the theme corrections, the unthemed-component gaps, the global focus
ring, one functional fix (cuisine filter), and three consistency clean-ups. The separate desktop
layout (left rail, measure caps, responsive screen reshapes, app-name treatment, pointer/hover
states) is intent `004-desktop-layout`, which depends on this one.

The work is centralised: most of it is `theme-patch.ts` applied to `src/shared/theme/index.ts` —
one file, every screen — with small call-site edits in six components. It is remediation, not a
rebuild; the screens are correct.

**Source**: `Design system for mom-friendly project/design_handoff_desktop_and_review/` —
`README.md` (self-sufficient), `theme-patch.ts` (exact blocks to apply, values final). The corrected
`theme.ts` in the sibling `design_handoff_dinner_ideas_theme/` is the fastest diff for FR-1.

## Business Goals

| Goal                                                                    | Success Metric                                                                                   | Priority |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| Body copy that currently fails WCAG AA passes it                        | `ink.400/300/200` at the corrected values; the five `textStyle="faint"` screens re-checked       | Must     |
| Every surface the user touches is themed, not stock Chakra              | Menu, Textarea, CloseButton, and all `<Alert>`s render Kitchen Table tokens — no default blue    | Must     |
| Keyboard users get the olive focus ring everywhere, not just on buttons | Focus ring promoted to `styles.global`; rail links, accordion headers, pick checkbox all covered | Must     |
| The cuisine filter does what its control promises                       | Multi-select cuisine, OR semantics, mirroring how Tags already works                             | Should   |
| Remove the sources of visual drift the review named                     | `#E3E7DA` named `line.brandSubtle`; Plan/Suppressed/Cooking use the `card` layerStyle            | Should   |

---

## Functional Requirements

### FR-1: Ink Ramp WCAG AA Correction

- **Description**: The theme ships the pre-correction greys. Replace the `ink` block in `colors` with
  the corrected values from `theme-patch.ts` §1. These are not decorative — `textStyle="faint"`
  resolves to `ink.300` and carries body copy on five screens; `ink.400` is the `eyebrow` colour
  above every page title.
- **Acceptance Criteria**:
  - `src/shared/theme/index.ts` `ink` block matches `theme-patch.ts` §1 exactly: `400 #726C5B`
    (5.1:1), `300 #757060` (4.9:1), `200 #8A8272` (4.5:1); `900 #232019`, `700 #5C5749`,
    `500 #7E7869` unchanged.
  - `textStyle="faint"` body copy re-checked on: `PlanPage` empty states, `SuppressedPage`
    metadata, `StoreConfigPage` help text, the `ShoppingListPage` prompt, every dinner card's
    "last made" line.
  - `eyebrow` text (`ink.400`) re-checked above every page title.
  - No other token or usage changes.
- **Priority**: Must (review blocker 1)
- **Related Stories**: _(to be created)_

### FR-2: Shopping List Action Bar — Clear the Tab Bar, Relocate at md+

- **Description**: The lock checkbox and "Copy shopping list" button sit in a
  `position="sticky" bottom={0}` container, pinned under the 70px fixed tab bar on phone; bottom
  padding is also compensated twice (`pb={20}` on the page `Stack` on top of `Layout`'s `pb="70px"`).
  Fix the phone collision, and at md+ move the two controls into the page header (sticky footers are
  a phone affordance).
- **Acceptance Criteria**:
  - Sticky container: `bottom={{ base: '70px', md: 0 }}`; the local `pb={20}` on the page `Stack`
    is removed.
  - On a phone viewport, the lock checkbox and Copy button are fully visible above the tab bar; no
    content clipped; bottom padding applied once.
  - At ≥768px the sticky footer is gone; the lock checkbox and Copy button render as a
    right-aligned `HStack` in the page header, opposite the "Shopping list" title. Lock-on-copy and
    disabled-when-locked behaviour unchanged.
  - `ShoppingListPage` tests updated for the relocated controls; copy/lock logic untouched.
- **Out of scope**: the md+ two-column category-group flow — that is intent `004`. FR-2 is
  self-contained to `ShoppingListPage.tsx`.
- **Priority**: Should (review "should fix" 3)
- **Related Stories**: _(to be created)_

### FR-3: Alert Palette

- **Description**: The theme's `Alert` entry styles radius and font only, so all eleven `<Alert>`s
  render in stock Chakra red/green on a warm olive page. Replace the entry per `theme-patch.ts` §4:
  map `error` → `heart`, `success` → `brand`, `info`/`warning` → neutral paper — the same treatment
  `layerStyles.notice` already uses on the login form.
- **Acceptance Criteria**:
  - `components.Alert` matches `theme-patch.ts` §4, `defaultProps.variant = 'subtle'`.
  - All 11 `<Alert>` call sites render Kitchen Table tokens; no stock red/green/blue anywhere.
  - Call sites unchanged — they keep passing `status="error"` / `status="success"`.
  - Error = `heart.50` bg / `heart.200` border / `heart.700` text; success = `brand.50` /
    `line.brandSubtle` / `brand.600`.
- **Priority**: Should (review "should fix" 4)
- **Related Stories**: _(to be created)_

### FR-4: Theme Entries for Menu, Textarea, CloseButton

- **Description**: Three surfaces the user touches constantly have no theme entry and render Chakra
  defaults (white panel, default radius, blue focus). Add the entries from `theme-patch.ts` §3.
- **Acceptance Criteria**:
  - The dinner-card overflow menu, the Cuisine dropdown, and the Tags dropdown render `paper.base`
    panel, `line.subtle` hairline, `card` radius, `raised` shadow, olive focus — not Chakra
    default white/blue.
  - `Textarea` (the shopping-list clipboard fallback) uses the `filled` variant by default:
    `paper.subtle` bg, `line.brandSubtle` border, `field` radius.
  - `CloseButton` (tag chips in the card Details panel): `ink.400` → `ink.700` hover, `chip`
    radius, `sm` size = 16px.
- **Priority**: Must
- **Related Stories**: _(to be created)_

### FR-5: Cuisine Filter Becomes Multi-Select

- **Description**: Cuisine is a `CheckboxGroup` whose `onChange` keeps only the last value
  (`values[values.length - 1]`), so ticking a second box silently unticks the first. Make it
  genuinely multi-select, mirroring how Tags already works. Filter state is in-memory only (no URL
  or `localStorage` today).
- **Acceptance Criteria**:
  - `CatalogFilterState.cuisine`: `string | null` → `string[]`.
  - `filters.ts`: cuisine match is OR across the selected list; empty list = no cuisine filter —
    same shape as `filters.tags`.
  - `CatalogFilters.tsx`: the `CheckboxGroup` keeps all ticked values; the active-filter chip row
    renders one chip per selected cuisine.
  - `CatalogPage.tsx`: initial state `cuisine: []`.
  - Ticking two cuisines shows dinners of either; unticking one leaves the other active; "All" /
    clear resets to `[]`.
  - `filters.test.ts`, `CatalogFilters.test.tsx`, and any `CatalogPage` filter test updated to the
    array shape.
- **Priority**: Should (review "should fix" 7 — product decision made: multi-select)
- **Related Stories**: _(to be created)_

### FR-6: Name the Olive Hairline `line.brandSubtle`

- **Description**: `#E3E7DA` — the olive-tinted hairline — is pasted as a raw hex. Add it to the
  `line` block as `brandSubtle` per `theme-patch.ts` §2 and replace the literals.
- **Acceptance Criteria**:
  - `line` block gains `brandSubtle: '#E3E7DA'`.
  - The raw hex is replaced at: `theme/index.ts` `layerStyles.cardSelected`, `theme/index.ts`
    `Input.variants.filled`, `CookingViewPage.tsx` (L97).
  - No `#E3E7DA` literal remains anywhere in `src/`; rendered colour is unchanged.
  - Note: `DinnerCard.tsx` already uses a token — the README's "four places" is these three
    literals plus the `cardSelected` layerStyle the card inherits.
- **Priority**: Could (review "polish" 8)
- **Related Stories**: _(to be created)_

### FR-7: Use `card` layerStyles on Plan, Suppressed, Cooking

- **Description**: `PlanPage.tsx`, `SuppressedPage.tsx` and `CookingViewPage.tsx` each rebuild a
  card by hand (`bg` + `borderRadius="card"` + `p={3}`) instead of using the `card` / `cardSelected`
  layerStyles that exist for exactly this. `StoreConfigPage.tsx` already uses `layerStyle="card"` —
  follow it.
- **Acceptance Criteria**:
  - The three screens use `layerStyle="card"` / `"cardSelected"`; no hand-rolled card definitions
    remain in those files.
  - Minor padding/radius shifts from today's rendering are acceptable — the layerStyle is adopted
    as-is (decision), not tuned to pixel-match.
- **Priority**: Could (review "polish" 9)
- **Related Stories**: _(to be created)_

### FR-8: Filter Chips — Lucide Glyph and Own Hit Area

- **Description**: `CatalogFilters.tsx` renders active filters as `{label} ✕` where the whole chip
  is the remove button. Replace the text `✕` with `uiIcons.x` (already exported) and give the
  remove action its own hit target inside the chip, so a chip's label is readable without also
  being a button.
- **Acceptance Criteria**:
  - Each active-filter chip renders its label plus a distinct `uiIcons.x` button.
  - Clicking the label does nothing; clicking the ✕ removes that one filter.
  - Applies to the cuisine chips (now potentially several, per FR-5) and any tag chips rendered in
    this row.
- **Priority**: Could (review "polish" 10)
- **Related Stories**: _(to be created)_

### FR-9: Global Focus Ring

- **Description**: The olive focus ring is defined on `Button` only, so keyboard users get Chakra
  blue on the cooking accordion headers, the dinner-card pick checkbox, and (once `004` lands) the
  rail links. Promote it to `styles.global` per `theme-patch.ts` §5; `Button` drops its private
  copy.
- **Acceptance Criteria**:
  - `styles.global` gains the `:focus-visible` rule from `theme-patch.ts` §5 (3px
    `rgba(74,103,65,0.28)`, `control` radius) covering `a`, `button`, `[role="button"]`, `input`,
    `select`, `textarea`, `[tabindex]`.
  - The cooking accordion headers and the dinner-card pick checkbox show the olive ring on keyboard
    focus, not Chakra blue.
  - `Button` still shows the same ring (via global now); no double ring.
- **Priority**: Must (accessibility; ships in the same one-file patch)
- **Related Stories**: _(to be created)_

---

## Non-Functional Requirements

### Accessibility

| Requirement      | Metric             | Target                                                                                                                               |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Text contrast    | WCAG AA (informal) | Corrected `ink` tokens meet AA against `paper.base` (ratios in `theme-patch.ts` §1); spot-check, no formal audit (per `ux-guide.md`) |
| Focus visibility | Focus ring         | 3px olive ring on every interactive control, not just `Button`                                                                       |

### Compatibility

| Requirement       | Notes                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| Component library | Chakra UI v2 only — no Tailwind, consistent with `ux-guide.md`             |
| Color mode        | Light mode only (`initialColorMode: 'light'`, `useSystemColorMode: false`) |
| New tokens        | Exactly one — `line.brandSubtle`. No new colours or type sizes otherwise.  |

### Regression

| Requirement    | Target                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Existing suite | Stays green. Assertions change only for FR-2 (relocated controls), FR-5 (array shape), FR-8 (chip markup) |

---

## Constraints

### Technical Constraints

- `theme-patch.ts` values are final — apply exactly, do not round or adjust. Diff section-by-section
  against the current `src/shared/theme/index.ts` before applying.
- No desktop rail, measure caps, or responsive screen reshapes here (intent `004`). The single
  md-breakpoint change in this intent is FR-2's control relocation, self-contained to
  `ShoppingListPage.tsx`.
- Finding 11 (app-name treatment) is bundled into `Layout.reference.tsx` → intent `004`.
- Finding 12 (dinner-card photo slot) is confirmed to ship as the cuisine icon — no work, no schema
  change.
- FR-5 is the only data-model touch: `CatalogFilterState.cuisine` `string | null` → `string[]`,
  plus OR semantics in `filters.ts`.

### Business Constraints

- Household project — same single-family scope as `001` / `002`.

---

## Assumptions

| Assumption                                                                 | Risk if Invalid                      | Mitigation                                                |
| -------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| Cuisine filter state is in-memory only, no persistence layer               | A URL/storage layer exists unnoticed | Verified from source — none exists                        |
| Three `#E3E7DA` literal sites (theme ×2, CookingViewPage ×1)               | A fourth literal lurks elsewhere     | `grep` confirms three; CI grep-guard in the story         |
| `theme-patch.ts` blocks apply cleanly against the current theme file       | Theme file drifted since the handoff | Diff before applying, per constraint                      |
| Adopting the `card` layerStyle on FR-7's three screens is acceptable as-is | A screen visibly regresses           | Decision recorded: adopt as-is; revisit only if egregious |

---

## Open Questions

None outstanding — the two from the draft were resolved from source (cuisine state is in-memory;
three literal `#E3E7DA` sites).
