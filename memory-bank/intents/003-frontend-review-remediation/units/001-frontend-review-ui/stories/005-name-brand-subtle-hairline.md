---
id: 005-name-brand-subtle-hairline
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: could
created: '2026-08-28T17:10:00Z'
assigned_bolt: 023-frontend-review-ui
implemented: true
---

# Story: 005-name-brand-subtle-hairline

## User Story

**As a** developer maintaining the theme
**I want** the olive-tinted hairline to be a named token, not a hex pasted around the codebase
**So that** it can't drift and there's one place to change it

## Acceptance Criteria

- [ ] **Given** `src/shared/theme/index.ts`, **When** the `line` block is replaced per `theme-patch.ts` §2, **Then** it gains `brandSubtle: '#E3E7DA'` alongside the existing keys
- [ ] **Given** the raw literal `#E3E7DA`, **When** the codebase is grepped afterwards, **Then** it appears nowhere in `src/` — replaced at `theme/index.ts` `layerStyles.cardSelected`, `theme/index.ts` `Input.variants.filled`, and `CookingViewPage.tsx`
- [ ] **Given** the three replaced sites, **When** the app renders, **Then** the rendered border colour is visually identical to before
- [ ] **Given** the change, **When** the suite runs, **Then** it stays green (no behavioural change)

## Technical Notes

- The review says "four places" — `DinnerCard.tsx` already uses a token (`line.brand`), so it's
  three literal replacements plus the `cardSelected` layerStyle the card inherits.
- `CookingViewPage.tsx` uses the hex inline as `borderColor={isExpanded ? '#E3E7DA' : 'line.subtle'}`
  — swap the literal for `'line.brandSubtle'`.
- Land this before (or with) stories `002` and `003` in bolt `023` — both reference
  `line.brandSubtle`.
- Consider a lint/CI grep-guard for `#E3E7DA` so it can't come back.

## Dependencies

### Requires

- None

### Enables

- `002-alert-palette` (success border), `003-menu-textarea-closebutton-theme` (Textarea border)

## Edge Cases

| Scenario                             | Expected Behavior                                                |
| ------------------------------------ | ---------------------------------------------------------------- |
| A `#e3e7da` lowercase variant exists | Also replace it — grep case-insensitively                        |
| The hex appears in a test fixture    | Replace with the token name or the resolved value as appropriate |

## Out of Scope

- Renaming or consolidating any other `line.*` token
