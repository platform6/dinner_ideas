---
id: 006-login-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 006-login-restyle

## User Story

**As a** wife opening the app
**I want** the login screen to feel warm and simple, not like a generic admin login
**So that** the very first thing I see sets the tone for the rest of the app

## Acceptance Criteria

- [ ] **Given** `LoginForm.tsx`, **When** rendered, **Then** it shows a centered column: a 60×60 `brand.100` tile with a 30px `CookingPot` icon, "Dinner Ideas" in Lora 32, and "Three dinners, one shopping list." in Outfit 14 `ink.400`
- [ ] **Given** the Email/Password fields, **When** rendered, **Then** they're filled inputs with leading icons (`Mail`, `Lock`) and a trailing `Eye` reveal toggle on Password
- [ ] **Given** the submit action, **When** rendered, **Then** it's a full-width 52px olive button labeled "Log in" with a trailing `ArrowRight`
- [ ] **Given** a sign-in error, **When** shown, **Then** it renders as the `notice` layer style (heart.50/heart.200/heart.700) with an `Info` icon, same copy as today
- [ ] **Given** `useAuth`'s existing behavior, **When** this story lands, **Then** sign-in/error logic is completely unchanged — only markup/styling

## Technical Notes

- All 3 existing `LoginForm.test.tsx` tests must keep passing unmodified in behavior (selectors may need updating if they target removed classes/text, but assertions on sign-in behavior stay the same).

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- None

## Edge Cases

| Scenario                | Expected Behavior                                                  |
| ----------------------- | ------------------------------------------------------------------ |
| Password reveal toggled | Same show/hide behavior as before, just restyled `Eye`/reveal icon |

## Out of Scope

- Any other screen
