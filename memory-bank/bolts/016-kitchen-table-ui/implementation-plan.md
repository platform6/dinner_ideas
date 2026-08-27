---
stage: plan
bolt: 016-kitchen-table-ui
created: 2026-08-27T11:25:00Z
---

## Implementation Plan: kitchen-table-ui (login + catalog/card restyle)

### Objective

Restyle the Login screen and the Catalog/DinnerCard screen per the handoff, including the `rosie-approved` heart display rule and the expandable-details section's icons.

### Deliverables

**Login (`006-login-restyle`)**

- `src/features/auth/LoginForm.tsx`: centered column; 60×60 `brand.100` tile with a 30px `CookingPot`; "Dinner Ideas" at 32px Lora (`textStyle="pageTitle"` + `fontSize` override, since Login's title is explicitly 32px vs. the token's 30px); tagline "Three dinners, one shopping list." (14px, `ink.400`); `InputGroup`/`InputLeftElement` for the `Mail`/`Lock` leading icons; `InputRightElement` password-reveal toggle (`Eye`/`EyeOff`, new local `showPassword` state); full-width `size="lg"` (52px per the theme) olive button with a trailing `ArrowRight`; error `Alert` restyled via the `notice` layerStyle with an `Info` icon.

**Catalog & Dinner Card (`007-catalog-dinner-card-restyle`)**

- `src/features/dinners/components/CatalogPage.tsx`: eyebrow "THIS WEEK" + title "Dinner catalog"; count chip — `Badge variant="count"` with `CheckCheck` + "N of 3", switching to `variant="countFull"` at 3/3 (replaces the current plain `Text`).
- `src/features/dinners/components/DinnerCard.tsx`:
  - 76px `paper.sunken` photo-placeholder tile.
  - `rosie-approved` heart: a new small helper (`isRosieApproved(tags)` in `dinners/tags.ts`, unit-tested) checks for a tag literally named `rosie-approved`; when true, a filled terracotta `Heart` renders at the card's top-right (alongside the existing overflow menu, not replacing it).
  - Metadata row restyled with `cuisineIcon`/`Clock` + `textStyle="meta"`; footer restyled with `CalendarOff`/`CalendarCheck` + `textStyle="faint"`.
  - Pick control becomes a pill: outline `Plus` "Pick" → solid `Check` "Picked" → `paper.sunken` `Lock` "Full" (card at 55% opacity) at the 3-pick cap — replacing the current plain `Checkbox`.
  - Selected card: `layerStyle="cardSelected"` (brand.50 fill, `#E3E7DA` border) vs. `layerStyle="card"` otherwise.
  - At-cap inline terracotta notice (`notice` layerStyle) replaces the current `Tooltip`.
  - Expandable details: ingredient rows get a leading `categoryIcon`; step rows get a leading `stepIcon`; tag badges/add-control restyle to the chip conventions already established in bolt `015`.

### Dependencies

- `001-design-token-foundation`, `002-icon-vocabulary` (bolt `014`, complete)
- `004-filter-chips-suppressed-route` (bolt `015`, complete) — the chip row this story's header sits above

### Technical Approach

- **Pick control changes shape, not behavior**: still the same `Checkbox`-backed `onToggleSelect`/`isSelected`/`selectionDisabled` contract from `CatalogPage`, just rendered as three pill states instead of a plain checkbox. Existing tests assert on `getByRole('checkbox', ...)` — need to keep the underlying input as a real checkbox (visually hidden/styled as a pill via Chakra's `Checkbox` custom styling, or a `useCheckbox` hook composition) so those tests and the `aria-label` contract keep working unchanged.
- **`isRosieApproved` is presentation-only** — reads `dinner.tags` (already fetched), no new query.

### Acceptance Criteria

Directly from stories `006` and `007` (see those files for the full Given/When/Then list); summarized:

- [ ] Login matches the handoff's spec token-for-token; existing `useAuth`/error behavior unchanged
- [ ] Catalog header shows eyebrow/title/count chip
- [ ] Card shows photo-placeholder, restyled metadata/footer, pill pick control (3 states), selected-card fill, at-cap notice
- [ ] `rosie-approved` heart renders only for that exact tag name; every other tag still a plain badge
- [ ] Expandable details section gets category/step icons
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass; existing pick/selection tests keep passing against the new pill markup

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?
