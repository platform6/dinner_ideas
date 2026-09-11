---
id: 006-duplicate-name-handling
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: complete
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 060-recipe-save
implemented: true
---

# Story: 006-duplicate-name-handling

## User Story

**As a** household member adding a dinner we might already have
**I want** to be told plainly that the name is taken
**So that** I rename it and move on, instead of meeting a database error

## Acceptance Criteria

- [ ] **Given** a name that already exists, **When** save is attempted, **Then** the user is told
      in plain language that a dinner with that name already exists.
- [ ] **Given** that clash, **When** it is reported, **Then** no raw Postgres text — no
      `duplicate key value violates unique constraint "dinners_name_key"` — reaches the interface.
- [ ] **Given** the clash, **When** it is reported, **Then** the rest of the draft is preserved
      intact: the user changes the name and saves, without re-entering ingredients or steps.
- [ ] **Given** a clash detected before submission, **When** the user is still typing the name,
      **Then** warning early is acceptable, but the save path must still handle the constraint —
      a check-then-insert race is not a correctness argument.

## Technical Notes

- **Corrected 2026-09-08 (bolt 060):** `dinners.name` is `unique` **per household**, not globally.
  Intent 004 rescoped it on 2026-08-28 to `dinners_household_id_name_key unique nulls not distinct
(household_id, name)`, verified against production. Open question 3 was therefore already
  answered before this intent was written.
- The constraint is per household, so a clash means _this household_ already has that name — which
  is exactly what the message says. Nothing about the mitigation changes.
- Per the coding standards, Supabase errors are caught and mapped to short user-facing messages;
  raw error objects are never shown.

## Dependencies

### Requires

- 005-atomic-save

### Enables

- None

## Edge Cases

| Scenario                                       | Expected Behavior                                             |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Names differing only by case or trailing space | Postgres treats them as distinct; no extra rule is added here |
| The clash appears only at insert time          | Handled at the save path, not only by an early check          |

## Out of Scope

- Offering to open or edit the existing dinner — editing is out of scope for the intent
