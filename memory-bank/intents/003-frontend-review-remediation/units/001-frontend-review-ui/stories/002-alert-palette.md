---
id: 002-alert-palette
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: should
created: '2026-08-28T17:10:00Z'
assigned_bolt: 023-frontend-review-ui
implemented: true
---

# Story: 002-alert-palette

## User Story

**As a** household member
**I want** error and success messages to look like they belong to the app
**So that** a saturated blue-red or bright green doesn't jump off the warm olive page

## Acceptance Criteria

- [ ] **Given** `src/shared/theme/index.ts`, **When** the `Alert` entry is replaced per `theme-patch.ts` §4, **Then** `components.Alert` has the `subtle` variant status map and `defaultProps.variant = 'subtle'`
- [ ] **Given** `status="error"`, **When** an Alert renders, **Then** it uses `heart.50` bg / `heart.200` border / `heart.700` text (matching `layerStyles.notice` on the login form)
- [ ] **Given** `status="success"`, **When** an Alert renders, **Then** it uses `brand.50` bg / `line.brandSubtle` border / `brand.600` text
- [ ] **Given** all Alert call sites (11 per the review), **When** the app renders, **Then** none shows stock Chakra red / green / blue, and **no call site was edited** — they still pass only `status=...`
- [ ] **Given** `status="info"` / `status="warning"` (unused today), **When** rendered, **Then** they resolve to the neutral paper / heart treatment from §4, not Chakra blue

## Technical Notes

- `theme-patch.ts` §4 is a drop-in `Alert` block; the `subtle` variant is a function of
  `props.status`. Keep `baseStyle` (radius, font, padding) as given.
- `line.brandSubtle` (story `005`) is referenced by the success border — order `005` before or with
  this story inside bolt `023`.
- Grep for `<Alert` to enumerate the call sites and eyeball each in the running app.

## Dependencies

### Requires

- `005-name-brand-subtle-hairline` (success border uses `line.brandSubtle`) — same bolt

### Enables

- None

## Edge Cases

| Scenario                                    | Expected Behavior                         |
| ------------------------------------------- | ----------------------------------------- |
| An Alert passes a custom `variant`          | Respected — only the default path changes |
| A test asserts Chakra's default Alert class | Update to assert the themed tokens        |

## Out of Scope

- Editing any `<Alert>` call site
- Toast styling (not an `Alert`)
