---
id: 002-dinner-fields-form
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 059-recipe-draft-form
implemented: false
---

# Story: 002-dinner-fields-form

## User Story

**As a** household member adding a dinner
**I want** to give it a name, a cuisine, a cook time and the one-line summary
**So that** it sits in the catalog looking like every other dinner there

## Acceptance Criteria

- [ ] **Given** the form, **When** it renders, **Then** it captures name, cuisine type, cook time
      and the summary line, and nothing else at the dinner level.
- [ ] **Given** the cook time, **When** a value of zero or less is entered, **Then** it is refused
      before submission — the database's `check (cook_time_minutes > 0)` is never reached.
- [ ] **Given** the cuisine field, **When** the user types, **Then** the cuisines already in the
      catalog are offered as suggestions, **and** a new one can still be entered freely. The
      column is deliberately not an enum; suggestions converge the vocabulary without a migration.
- [ ] **Given** the summary field, **When** it renders, **Then** the form says what it is for —
      the single line shown on the catalog card — so the user does not mistake it for the method.
- [ ] **Given** a missing required field, **When** save is attempted, **Then** the specific field
      is identified, not a generic "form invalid".

## Technical Notes

- The 10 cuisines currently in the catalog: American, Asian, Chinese, Hawaiian, Indian, Italian,
  Japanese, Mediterranean, Mexican, Thai. Read them from the catalog rather than hardcoding, so
  the list stays true as dinners are added.
- The founding summary lines average ~86 characters. That is guidance for a placeholder or hint,
  not a validation rule — a longer one is not wrong.

## Dependencies

### Requires

- 001-recipe-entry-route

### Enables

- 005-atomic-save

## Edge Cases

| Scenario                          | Expected Behavior                                         |
| --------------------------------- | --------------------------------------------------------- |
| A cuisine not in the existing set | Accepted — free text is the schema's deliberate choice    |
| A very long name                  | Accepted; the database has no length limit                |
| Cook time entered as a decimal    | Refused or rounded to an integer; the column is `integer` |

## Out of Scope

- Tags — captured, but by their own story (008-tag-editor)
- `rosie_approved` — that column was dropped in the tags migration and does not exist
