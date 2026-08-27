---
intent: 002-kitchen-table-theme
phase: inception
status: inception-complete
created: '2026-08-27T09:00:00Z'
updated: '2026-08-27T09:35:00Z'
---

# Requirements: Kitchen Table Theme

## Intent Overview

Dinner Ideas is today a stock-Chakra app: default fonts, default blues/grays, no theme file, a
top nav that doesn't fit a phone. This intent gives it a warm, calm, phone-first visual identity
("Kitchen Table" — olive on near-white, Lora serif headings, Outfit sans UI) and a single Lucide
icon vocabulary, across every screen — the original 6 (Login, Catalog, This Week, Shopping List,
Cooking, Suppressed) plus the 4 added in the most recent enhancement round (tag management,
expandable catalog card details, week navigation, grocery store configuration).

Sourced from a design handoff bundle (`theme.ts`, `icons.tsx`, and a detailed README) provided as
finished, high-fidelity design references — not from scratch. Nothing about the data model,
queries, or business logic changes; this is a presentation-layer intent plus three structural
navigation changes the handoff calls out as a cohesive set.

## Business Goals

| Goal                                                                      | Success Metric                                                                                                      | Priority |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| Replace the stock-Chakra look with a warm, calm, "Kitchen Table" identity | Every screen matches the handoff's token spec (colors, type, spacing, radii)                                        | Must     |
| Make the app comfortable to use one-handed on a phone                     | Bottom tab bar; every tappable target ≥ 44×44px                                                                     | Must     |
| Preserve all existing behavior — this is presentation-only                | Existing 98 tests keep passing with no logic changes, only new/updated snapshot-free assertions for restyled markup | Must     |
| One icon vocabulary, so a concept never gets two different glyphs         | All icon usage routes through `icons.tsx`'s maps/helpers, no ad-hoc lucide imports elsewhere                        | Should   |

---

## Functional Requirements

### FR-1: Design Token Foundation

- **Description**: Adopt the provided Chakra theme (`theme.ts`) as the app's single source of design tokens — colors, fonts, font sizes, radii, shadows, text styles, layer styles, and component base-style overrides.
- **Acceptance Criteria**:
  - `theme.ts` lands at `src/shared/theme/index.ts`, used close to as-written.
  - `lucide-react` added as a dependency.
  - Google Fonts (Lora, Outfit) linked in `index.html`'s `<head>`, per the handoff's exact `<link>` tags.
  - `src/main.tsx` wraps the app in `<ChakraProvider theme={theme}>` importing from `@/shared/theme`.
  - `public/icon.svg` (a hand-written 3-circle SVG) and `scripts/generate-pwa-icons.mjs`'s generated PNGs (`icon-192.png`, `icon-512.png`) both reissued in `brand.500` (#4A6741) / a darker shade — both files confirmed to exist, using hardcoded teal RGB literals that need swapping to the new brand colors.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-2: Icon Vocabulary

- **Description**: Adopt the provided icon vocabulary (`icons.tsx`) as the single source of icon choices, extended with new entries for the 4 post-handoff screens/features (week navigation, store config, tag management) following the same conventions (maps + helper functions, `currentColor`, documented sizing/stroke-width per context).
- **Acceptance Criteria**:
  - `icons.tsx` lands at `src/shared/components/icons.tsx`, used close to as-written.
  - New icon entries added for: week-navigation ◀/▶ controls, an "Eaten" indicator, the store-config page's add/reorder/delete actions, and the tag-management "+"/remove controls — each added to the existing maps/objects (`uiIcons`, or a new small map) rather than imported ad hoc in a component.
  - No component outside `icons.tsx` imports directly from `lucide-react`.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-3: Bottom Tab Bar Navigation

- **Description**: Replace the top nav's five text links with a bottom tab bar (4 icon+label tabs, from `icons.tsx`'s `navItems`), phone-first. Log out moves out of the tab bar.
- **Acceptance Criteria**:
  - `Layout.tsx` renders `navItems` as 4 icon+label tabs in a bottom bar (`10px 12px 30px` padding, top hairline, `justify-content: space-around`, 21px icons), active tab in `brand.500`.
  - Existing routes (`/`, `/plan`, `/shopping-list`, `/cooking`) are unchanged — only the nav chrome changes.
  - The `/store-config` route (added in the prior enhancement round, not in the original handoff) gets a reachable entry point — reasonable per the "extrapolate the theme" decision: a small icon-button in the Catalog header (mirroring the Suppressed view's reachability pattern in FR-4), not a 5th tab.
  - Log out is reachable from the Catalog header or a small account sheet, not the tab bar.
  - At `md` breakpoint and up, the tab bar returns to a top bar (responsive, per the handoff).
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-4: Filter Chips & Dedicated Suppressed Route

- **Description**: Replace the Catalog's cuisine `<Select>` and the tag `<CheckboxGroup>` (added in the prior round) with a single filter-chip row; replace the "Show suppressed" `<Switch>` with its own route, reached from a link in the Catalog header.
- **Acceptance Criteria**:
  - Filter row renders as chips: an active chip is olive-filled, others are 1px `line.DEFAULT` outlines with a leading icon (`Utensils` All, `Clock` Quickest inline; the tag filter and full cuisine list move behind a `SlidersHorizontal` overflow chip — Chakra `Menu` or `Drawer`).
  - The "rosie-approved" special case (FR-7) does **not** get its own dedicated filter chip — filtering by any tag, including `rosie-approved`, happens through the same overflow tag-filter surface as any other tag.
  - `CatalogPage.tsx` no longer branches on `showSuppressed` — suppressed dinners are their own page/route, removing that conditional entirely.
  - The suppressed route matches the handoff's spec: title "Not interested", subtitle copy, `paper.subtle` rows with a 38px `EyeOff` tile, a "Bring back" outline pill with `RotateCcw`, and a dashed end-of-list card.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-5: "Not Interested" Moved Off the Card Face

- **Description**: Move the "Not interested" (suppress) action off the primary card face — it's a rare, destructive-feeling action that shouldn't sit next to the primary pick action.
- **Acceptance Criteria**:
  - The suppress action is reachable via an overflow menu on the card (Chakra `Menu`), not a persistent visible button — chosen over a swipe gesture so the action works identically on touch and desktop/mouse (per `ux-guide.md`'s "remain usable on desktop" responsive note).
  - The action still calls the existing `useSetDinnerActive({ isActive: false })` — no behavior change, only where the control lives.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-6: Login Screen Restyle

- **Description**: Restyle `LoginForm.tsx` per the handoff: centered column, 60×60 `brand.100` tile with a `CookingPot` icon, Lora page title, Outfit tagline, filled inputs with leading icons (`Mail`, `Lock` + `Eye` reveal), full-width 52px olive CTA with a trailing `ArrowRight`.
- **Acceptance Criteria**: Matches the handoff's Login section token-for-token (colors, type, spacing); existing error-message copy and `useAuth` behavior unchanged, only restyled via the `notice` layer style.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-7: Catalog & Dinner Card Restyle

- **Description**: Restyle `CatalogPage.tsx`, `DinnerCard.tsx` (incl. its expandable details section from the prior round), and `CatalogFilters.tsx` per the handoff, including the "rosie-approved" tag's special heart treatment.
- **Acceptance Criteria**:
  - Header: eyebrow "THIS WEEK", title "Dinner catalog", a count chip (`Badge variant="count"` → `"countFull"` at 3/3).
  - Dinner card: 76px photo-placeholder tile, Lora title, cuisine icon (`cuisineIcon`) + cook-time metadata, last-chosen footer (`CalendarOff`/`CalendarCheck`), pick control as a pill (outline "Pick" → olive filled "Picked" → `paper.sunken` "Full" lock state at the 3-pick cap, card at 55% opacity).
  - **Rosie-approved special case**: a dinner with a tag literally named `rosie-approved` (same lowercase normalization as any tag, per `009-dinner-catalog`'s schema) shows a filled terracotta `Heart` at the card's top-right. This is a _display_ rule only — `rosie-approved` is not a distinct data concept, just an ordinary tag whose presence triggers this one visual treatment. Every other tag the dinner has still shows as a plain badge in the expandable details section, `rosie-approved` included.
  - Expandable details section (steps/ingredients/tags, from `011-catalog-card-expandable-details`/`012-tag-management-ui`): ingredient rows get a leading `categoryIcon`; step rows get a leading `stepIcon`; the tag list/add/remove controls restyle to the chip/badge conventions, with icons drawn from FR-2's vocabulary.
  - At the 3-pick cap, the inline terracotta notice ("Three picked — remove one to swap in something else") replaces the current tooltip.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-8: This Week (Plan) Restyle, Including Week Navigation

- **Description**: Restyle `PlanPage.tsx` per the handoff, extending its spec to cover the week-navigation controls added in the prior round (not in the original handoff).
- **Acceptance Criteria**:
  - Eyebrow shows the week's date range, title "This week's plan".
  - Each selection: `brand.50` row, 34px olive numbered tile (1/2/3), name + metadata, 36px outline icon button with `X` to remove.
  - All-3-picked state: dashed card, `Sparkles` icon, "All three picked. Your shopping list is ready.", olive "See shopping list" button with `ShoppingBasket`.
  - **Week navigation (extrapolated)**: ◀/▶ controls added to FR-2's icon vocabulary render at the header; a past, locked week shows an "Eaten" badge (reusing an existing icon like `CalendarCheck`, per FR-2); a skipped week's empty state uses the same dashed-card convention as the existing empty/locked states.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-9: Shopping List Restyle

- **Description**: Restyle `ShoppingListPage.tsx` per the handoff, including local (non-persisted) item checkboxes.
- **Acceptance Criteria**:
  - Eyebrow "N DINNERS · N ITEMS", title "Shopping list", 40px `brand.100` `Copy` tile.
  - Each category group: `categoryIcon` + uppercase `sectionLabel` + a `line.subtle` rule.
  - Items: 19px checkbox + quantity/unit (56px min-width column) + name; checking an item (new local-only state, not persisted) turns it `ink.200` with strikethrough.
  - Sticky footer keeps the existing "lock on copy" checkbox and copy action, restyled as a 52px olive button with `Copy`.
  - Group order still comes from `004-grocery-store-config`'s reorder logic — this FR only restyles presentation, not ordering.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-10: Cooking View Restyle

- **Description**: Restyle `CookingViewPage.tsx` as collapsible per-dinner cards per the handoff.
- **Acceptance Criteria**: Collapsed: 44px photo-placeholder thumb, Lora title, `Clock` + cook-time + step-count, `ChevronDown`. Expanded: `brand.50` fill, `ChevronUp`, steps rendered as 30px `paper.base` tiles with a leading `stepIcon` beside the instruction text (replacing the plain `OrderedList`). Several cards may be expanded at once; only the tapped card toggles.
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-11: Suppressed ("Not Interested") View Restyle

- **Description**: Restyle the suppressed-dinners view as its own route (per FR-4), matching the handoff's spec.
- **Acceptance Criteria**: Title "Not interested", subtitle "Hidden from the catalog. Bring one back any time."; rows on `paper.subtle` with a 38px `EyeOff` tile, `ink.700` title, `ink.300` metadata, outline "Bring back" pill with `RotateCcw`; dashed end-of-list card with a live count ("N dinners still in the catalog").
- **Priority**: Must
- **Related Stories**: _(new — to be created)_

### FR-12: Grocery Store Config Page Restyle (Extrapolated)

- **Description**: Style the store-config page (`011`/`013`'s feature, not in the original handoff) following the same card/chip/button/icon conventions established elsewhere.
- **Acceptance Criteria**: Row list uses the same card/list-row convention as other screens (e.g. This Week's rows); up/down/delete controls use icons from FR-2's extended vocabulary; the add-row input matches the filled-input convention from FR-1; category-assignment selects match the `Select` component override.
- **Priority**: Should — lower priority than the 6 originally-designed screens, since it has no pixel reference to match against, only tokens/patterns to follow.
- **Related Stories**: _(new — to be created)_

---

## Non-Functional Requirements

### Performance

| Requirement  | Metric                        | Target                                                                                                                   |
| ------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Font loading | Google Fonts via CDN `<link>` | No blocking-render regression beyond what the `<link>` tags themselves cause — no additional font-loading infrastructure |

### Accessibility

| Requirement      | Metric             | Target                                                                                                                                                                            |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap targets      | Minimum size       | ≥ 44×44px on every interactive control (icon buttons visually 36–40px, padded to 44)                                                                                              |
| Focus visibility | Focus ring         | 3px `rgba(74,103,65,0.28)` ring on every control, per the theme's `Button` base style                                                                                             |
| Color contrast   | WCAG AA (informal) | Spot-check `ink`/`paper` text-on-background pairs during implementation; no formal audit (per `ux-guide.md`'s existing "no formal WCAG audit" scope for this household-scale app) |

### Compatibility

| Requirement       | Notes                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Component library | Chakra UI v2 only — no Tailwind, consistent with `ux-guide.md`                                           |
| Color mode        | Light mode only (`initialColorMode: 'light'`, `useSystemColorMode: false`) — no dark mode in this intent |

### Reliability / Scalability

Not applicable — same household-scale reasoning as `001-weekly-dinner-planner`.

---

## Constraints

### Technical Constraints

- No data model, query, or business-logic changes — this intent is presentation-layer only, plus the 3 structural navigation changes in FR-3/FR-4/FR-5.
- `theme.ts` and `icons.tsx` are used close to as-written (per the handoff's own framing as high-fidelity, final tokens) — extended only where a post-handoff screen needs an icon/pattern the original 6 screens didn't.
- Photos: no `photo_url` column exists; every photo slot ships as the `paper.sunken` placeholder tile. Adding real photos is explicitly future work, not this intent.
- Shopping-list item checkboxes are new **local-only** UI state — not persisted to any table.

### Business Constraints

- Household project — same single-family scope as `001-weekly-dinner-planner`.

---

## Assumptions

| Assumption                                                                                                | Risk if Invalid                                          | Mitigation                                                                 |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| All 3 structural changes (bottom tab bar, chips + suppressed route, suppress-off-card-face) ship together | User explicitly confirmed "all three"                    | None needed — confirmed                                                    |
| The 4 post-handoff screens/features get the theme extrapolated rather than fresh mockups                  | User explicitly confirmed "extrapolate"                  | None needed — confirmed                                                    |
| A tag literally named `rosie-approved` is the trigger for the heart icon, not a schema field              | User explicitly confirmed this reconciliation            | None needed — confirmed                                                    |
| Suppress action moves to an overflow menu, not a swipe gesture                                            | Swipe may feel more "native" on phone once actually used | Low-risk, reversible UI-only choice; revisit if it feels wrong in practice |

---

## Open Questions

| Question                                                                                | Owner            | Due Date             | Resolution                                                                              |
| --------------------------------------------------------------------------------------- | ---------------- | -------------------- | --------------------------------------------------------------------------------------- |
| Exact new icon choices for week-nav ◀/▶, "Eaten" badge, and store-config actions (FR-2) | User + Assistant | During units/stories | Open — draft choices proposed in FR-2/FR-8/FR-12, to be finalized during story creation |
