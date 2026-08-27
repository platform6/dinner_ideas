---
id: 007-catalog-dinner-card-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 007-catalog-dinner-card-restyle

## User Story

**As a** wife browsing dinners
**I want** cards that are calm and easy to scan, with a heart for the ones Rosie loves
**So that** picking dinners feels less like reading a spreadsheet

## Acceptance Criteria

- [ ] **Given** `CatalogPage.tsx`'s header, **When** rendered, **Then** it shows eyebrow "THIS WEEK", title "Dinner catalog", and a count chip (`Badge variant="count"` with `CheckCheck` + "N of 3", switching to `variant="countFull"` at 3 of 3)
- [ ] **Given** `DinnerCard.tsx`, **When** rendered, **Then** it shows a 76px photo-placeholder tile left, Lora 16.5/500 title, cuisine icon (`cuisineIcon`) + cook-time metadata (both `ink.500` 12.5), and a last-chosen footer (`CalendarOff`/`CalendarCheck` + text, `ink.300` 11.5)
- [ ] **Given** the pick control, **When** rendered, **Then** it's a pill: outline `Plus` "Pick" when unselected → olive-filled `Check` "Picked" when selected → `paper.sunken` `Lock` "Full" (card at 55% opacity) when the 3-pick cap blocks it
- [ ] **Given** a selected card, **When** rendered, **Then** it has `brand.50` fill and `#E3E7DA` border
- [ ] **Given** a dinner tagged literally `rosie-approved` (lowercase-normalized, same as any tag), **When** its card renders, **Then** a filled terracotta `Heart` shows at the card's top-right; **Given** any other tag, **Then** it does NOT get this treatment — it only ever shows as a plain badge in the expandable details section
- [ ] **Given** the 3-pick cap is reached, **When** another card is viewed, **Then** an inline terracotta notice ("Three picked — remove one to swap in something else") replaces today's tooltip
- [ ] **Given** the card's expandable details section (steps/ingredients/tags), **When** expanded, **Then** ingredient rows show a leading `categoryIcon`, step rows show a leading `stepIcon`, and the tag list/add/remove controls use icons from `002-icon-vocabulary`

## Technical Notes

- The `rosie-approved` tag check is a pure display-layer derivation from `dinner.tags` (already fetched for `CatalogDinner`) — no new query, no schema change. Suggested: a small helper (e.g. `isRosieApproved(tags: string[])`) co-located with `DinnerCard.tsx` or in `dinners/tags.ts`, unit-tested alongside `normalizeTagName`.
- This story's card restyle and `005-suppress-off-card-face`'s overflow-menu addition touch the same file — sequence them within the same bolt.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`, `004-filter-chips-suppressed-route` (chip row above the grid)

### Enables

- `005-suppress-off-card-face` (same card component)

## Edge Cases

| Scenario                                          | Expected Behavior                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A dinner has both `rosie-approved` and other tags | Heart shows once (top-right); `rosie-approved` still also appears as a plain badge among the other tags in the expanded section — no special hiding |
| Case variation on tag input (`Rosie-Approved`)    | Already normalized to lowercase at write time (`009-dinner-catalog`'s schema) — the display check only ever sees `rosie-approved`                   |

## Out of Scope

- The suppress overflow menu itself (→ `005-suppress-off-card-face`)
- Filter chip row content (→ `004-filter-chips-suppressed-route`)
