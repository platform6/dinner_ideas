---
id: 001-no-default-aisle
unit: 002-ingredient-aisle-default
intent: 019-ui-correctness-fixes
status: planned
priority: must
created: '2026-09-17T15:57:07Z'
assigned_bolt: null
implemented: false
---

# Story: 001-no-default-aisle

## User Story

**As a** household member typing in a dinner
**I want** a new ingredient line to start with no aisle, and to be asked for one before saving
**So that** chicken thighs never end up under Produce because I didn't look

## Acceptance Criteria

- [ ] **Given** I add an ingredient line in manual entry, **Then** its aisle control shows "Choose aisle", not Produce
- [ ] **Given** any line has no aisle, **When** I save, **Then** nothing is written and that line shows "Choose an aisle"
- [ ] **Given** every line has an aisle, **Then** saving behaves exactly as today
- [ ] The "Choose aisle" placeholder cannot be re-selected once an aisle is chosen, and is never sent to the database
- [ ] The error is linked to its control the way existing line errors are, so screen readers announce it (NFR-3)
- [ ] **Given** an imported draft, **Then** its lines keep the extracted aisle and are not reset to "Choose aisle"

## Technical Notes

- `draft.ts:43` types `category` as required; `draft.ts:71` defaults it to `'Produce'`. The draft shape is an interface shared with import (`draft.ts:7`).
- `draft.ts:187` already validates category at save; reuse that path so the error appears like other line problems
- `fn_create_dinner` is unchanged: validation guarantees a real category on every line before the call

## Dependencies

- None
