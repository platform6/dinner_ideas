---
id: 008-card-layerstyles-three-screens
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: could
created: '2026-08-28T17:10:00Z'
assigned_bolt: 025-frontend-review-ui
implemented: true
---

# Story: 008-card-layerstyles-three-screens

## User Story

**As a** developer maintaining the screens
**I want** Plan, Suppressed and Cooking to use the shared `card` layerStyles
**So that** three hand-rolled near-copies of a card don't drift apart over time

## Acceptance Criteria

- [ ] **Given** `PlanPage.tsx`, `SuppressedPage.tsx` and `CookingViewPage.tsx`, **When** each hand-rolled card (`bg` + `borderRadius="card"` + `p={3}` and similar) is replaced, **Then** it uses `layerStyle="card"` (or `"cardSelected"` where a selected/active state applies), following `StoreConfigPage.tsx`
- [ ] **Given** the three screens, **When** they render, **Then** no hand-rolled card definition remains in those files
- [ ] **Given** the switch, **When** compared to today, **Then** minor padding/radius differences are accepted as-is (recorded decision) — the layerStyle is not re-tuned to pixel-match
- [ ] **Given** the change, **When** the suite runs, **Then** tests that asserted the old inline card props are updated to the layerStyle; behaviour assertions are unchanged

## Technical Notes

- `StoreConfigPage.tsx` is the reference — it already does `layerStyle="card"`.
- `CookingViewPage.tsx` also carries the `#E3E7DA` literal (story `005`) — if bolt ordering lands
  `005` first, this story just consumes `line.brandSubtle`; otherwise coordinate the two edits.
- Keep any screen-specific spacing that isn't part of "the card" (e.g. `Stack gap`) as-is.

## Dependencies

### Requires

- `005-name-brand-subtle-hairline` (CookingViewPage shares the file) — landed in bolt `023`, before this bolt

### Enables

- None

## Edge Cases

| Scenario                                                  | Expected Behavior                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| A card had an extra prop not in the layerStyle            | Keep it as an explicit prop alongside `layerStyle` if it's genuinely needed |
| `cardSelected` doesn't quite match a screen's active look | Use it anyway (decision: adopt as-is); flag if egregious                    |

## Out of Scope

- Desktop reshapes of these screens (intent `004`)
- Introducing new layerStyles
