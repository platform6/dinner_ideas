---
id: 008-tag-editor
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: complete
priority: must
created: '2026-09-07T03:20:00Z'
assigned_bolt: 059-recipe-draft-form
implemented: true
---

# Story: 008-tag-editor

## User Story

**As a** household member adding a dinner
**I want** to tag it the way our other dinners are tagged
**So that** it turns up when we filter the catalog, instead of being invisible to every filter

## Acceptance Criteria

- [ ] **Given** the form, **When** the tag section renders, **Then** the household's existing tags
      are offered, so the shared vocabulary is reused rather than re-typed.
- [ ] **Given** an offered tag, **When** selected, **Then** it is attached to the draft; selecting
      it again detaches it.
- [ ] **Given** a tag that does not exist yet, **When** typed, **Then** it can be created — the
      vocabulary is open and user-managed by design.
- [ ] **Given** a typed tag, **When** it is normalized, **Then** `normalizeTagName` is reused, not
      re-implemented. `tags.name` carries `check (name = lower(name))`, and the client normalizes
      too so the UI shows the final value rather than surprising the user after a refetch.
- [ ] **Given** a typed tag that differs from an existing one only by case or surrounding space,
      **When** normalized, **Then** it resolves to the existing tag — no near-duplicate is created.
- [ ] **Given** a dinner with no tags, **When** saved, **Then** it saves. Tags are optional; the
      consequence (invisible to tag filters) is the user's to accept.
- [ ] **Given** an imported draft, **When** it arrives with inferred tags, **Then** they appear here
      as ordinary attached tags and can be removed or added to like any other.

## Technical Notes

- `tags` is a **shared, open vocabulary** with no seed — every tag in it was created by a user.
  There is no fixed list to choose from, so the editor reads what exists rather than hardcoding.
- `normalizeTagName` and `ROSIE_APPROVED_TAG` already live in `src/features/dinners/tags.ts`.
- `rosie-approved` drives the catalog's heart via `isRosieApproved`. A person may absolutely attach
  it by hand here — that is a family member recording an opinion, which is exactly what it is for.
  What must never happen is a _machine_ applying it; that constraint belongs to unit 002 (FR-10).
- `dinner_tags` is `(dinner_id, tag_id)` with `unique (dinner_id, tag_id)`; attaching the same tag
  twice must be impossible from the UI, not merely rejected by the database.

## Dependencies

### Requires

- 001-recipe-entry-route

### Enables

- 005-atomic-save (which writes `dinner_tags`)
- Unit 002's inferred tags, which land in this editor

## Edge Cases

| Scenario                                    | Expected Behavior                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A household with no tags at all             | The section renders with nothing offered; a tag can still be created                                                                                                         |
| "Quick Meal" typed when `quick-meal` exists | Normalization is lowercase and trimmed only — it does not hyphenate, so these stay distinct. Offer the existing vocabulary prominently so the user picks rather than retypes |
| The same tag selected twice                 | Detaches, rather than attaching a duplicate                                                                                                                                  |
| A tag typed as only whitespace              | Refused; `normalizeTagName` yields an empty string                                                                                                                           |

## Out of Scope

- Renaming or deleting tags from the shared vocabulary — this story attaches and creates only
- Inferring tags (unit 002, FR-10)
