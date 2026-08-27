---
id: 005-suppress-off-card-face
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: planned
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: false
---

# Story: 005-suppress-off-card-face

## User Story

**As a** wife browsing the catalog
**I want** "Not interested" tucked away from the main pick action
**So that** I don't mis-tap a destructive-feeling action while trying to pick a dinner

## Acceptance Criteria

- [ ] **Given** an active-catalog `DinnerCard`, **When** rendered, **Then** "Not interested" is no longer a persistently visible button on the card face
- [ ] **Given** the card, **When** the user opens its overflow menu (Chakra `Menu`), **Then** "Not interested" is one of its actions
- [ ] **Given** the suppress action is triggered from the menu, **When** it runs, **Then** it still calls `useSetDinnerActive({ isActive: false })` exactly as before — no behavior change
- [ ] **Given** the same card on desktop (mouse, no touch), **When** interacting with the overflow menu, **Then** it works identically — no swipe-only affordance

## Technical Notes

- Chosen over a swipe gesture specifically for desktop/mouse parity (per `ux-guide.md`'s "must remain usable on desktop" responsive note) — see `inception-log.md` Decision Log.
- The Suppressed view's "Bring back" action (un-suppress) is a separate, already-visible pill per the handoff (FR-11) — this story only concerns the _active_ catalog's suppress action, not un-suppress.

## Dependencies

### Requires

- `007-catalog-dinner-card-restyle` (same card component — sequence within the same bolt/PR is fine, but this story's menu addition should land alongside or after the card's structural restyle, not before)

### Enables

- None

## Edge Cases

| Scenario                       | Expected Behavior                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Suppress mutation is in flight | Menu item shows a loading state, same `isMutating` pattern already used elsewhere in this card |

## Out of Scope

- The Suppressed page itself (→ `011-suppressed-view-restyle`)
