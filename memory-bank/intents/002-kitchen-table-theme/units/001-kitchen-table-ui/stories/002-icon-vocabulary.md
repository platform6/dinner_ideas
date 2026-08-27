---
id: 002-icon-vocabulary
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 002-icon-vocabulary

## User Story

**As a** developer restyling each screen
**I want** one source of truth for every icon choice
**So that** a concept (a cuisine, a category, a cooking step) never gets two different glyphs in two places

## Acceptance Criteria

- [ ] **Given** the handoff's `icons.tsx`, **When** it's placed at `src/shared/components/icons.tsx`, **Then** its maps/helpers (`cuisineIcon`, `categoryIcon`, `stepIcon`, `navItems`, `uiIcons`) are used close to as-written
- [ ] **Given** the 4 post-handoff screens/features, **When** they need an icon not in the original vocabulary, **Then** new entries are added to `icons.tsx`'s existing maps (not imported ad hoc elsewhere) — specifically: week-nav ◀/▶, an "Eaten" indicator, store-config add/reorder/delete actions, and tag add/remove controls
- [ ] **Given** any component in the app, **When** it needs an icon, **Then** it imports from `@/shared/components/icons`, never directly from `lucide-react`

## Technical Notes

- Draft new entries (finalize exact glyph choice during Implement, following the file's existing sizing/stroke-width conventions):
  - Week navigation: `ChevronLeft`/`ChevronRight` (already imported for `back`; add a `next`/`prev` pair to `uiIcons` or a new `weekNav` map)
  - "Eaten" indicator: reuse `CalendarCheck` (already in `metaIcons.lastMade`) rather than adding a new glyph
  - Store config: `ArrowUp`/`ArrowDown` (move), `Trash2` (delete), reuse `Plus` (`uiIcons.add`) for add-row
  - Tag management: reuse `Plus` (add) and `X` (`uiIcons.remove`) for remove — no new glyphs needed
- This story only prepares the vocabulary; wiring it into each screen happens in that screen's own restyle story.

## Dependencies

### Requires

- `001-design-token-foundation` (theme must exist so icon color via `currentColor` resolves to the right token)

### Enables

- Every screen-restyle story (006–012), which pull their icons from this file

## Edge Cases

| Scenario                                                 | Expected Behavior                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A cuisine or category not in the seed data appears later | Falls back to `Utensils`/`categoryIcons.Other` respectively — already handled by the existing helper functions |

## Out of Scope

- Any screen's actual restyle (later stories)
