---
id: 006-duplicate-name-handling
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 060-recipe-save
implemented: false
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

- `dinners.name` is `unique` **globally**, not per household — an artifact of the pre-account-model
  schema (intent 001 predates intent 004). With one founding household this cannot bite in
  practice, but the code must not assume that stays true.
- Open question 3 asks whether to scope the constraint to household in this intent. If the answer
  is yes, it belongs with 005's migration, not here. If no, this story is the whole mitigation.
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
