---
id: 010-update-standards-docs
unit: 001-household-data-model
intent: 004-account-model
status: planned
priority: should
created: '2026-08-28T00:00:00Z'
assigned_bolt: 030-household-data-model
---

# Story: 010-update-standards-docs

## User Story

**As a** future contributor (human or agent) reading the project standards
**I want** the architecture and tech-stack docs to describe the real account model
**So that** I don't build on the stale "single shared login, no per-user accounts" assumption

## Acceptance Criteria

- [ ] **Given** `memory-bank/standards/system-architecture.md`, **When** updated, **Then** the
      RLS section no longer says "All authenticated household sessions share the same access
      level" and instead describes: `auth.users` → `profiles` → `households` /
      `household_members`, `household_id` on every domain table, `current_user_household_id()`
      as the universal RLS predicate, and `handle_new_user()` provisioning
- [ ] **Given** `memory-bank/standards/tech-stack.md`, **When** updated, **Then** the
      Authentication section no longer says "Single shared login ... not per-user accounts ...
      No public signup flow" and instead describes public email/password registration, one
      household per user, and invite-based joining
- [ ] **Given** `memory-bank/standards/coding-standards.md`, **When** updated, **Then** the
      `auth/ # shared household login` file-tree comment is corrected
- [ ] **Given** `memory-bank/standards/decision-index.md`, **When** updated, **Then** it has a
      dated entry for "adopt three-tier household account model (intent 004)" pointing at this
      intent
- [ ] **Given** the docs, **Then** they note what is still deferred (registration UI → 007-auth-flows,
      settings → 008-account-settings, multi-household → future)

## Technical Notes

- Docs-only story; no code. Grouped with the founding migration in bolt `030` because both are
  "finalize the intent" work.
- Keep the edits surgical — replace the outdated claims, don't rewrite whole documents.
- Cross-check `ux-guide.md` line about "two-person household app" — leave it (still true for the
  founding household) unless it directly contradicts the new model.

## Dependencies

### Requires

- Conceptually the whole unit — write these once the schema shape is final (after stories
  `001`–`009`)

### Enables

- `007-auth-flows`, `008-account-settings` — future intents read these docs as ground truth

## Edge Cases

| Scenario                                 | Expected Behavior                                               |
| ---------------------------------------- | --------------------------------------------------------------- |
| A doc section is already partly accurate | Edit only the inaccurate sentences                              |
| `decision-index.md` doesn't exist yet    | Create it from `templates/standards/decision-index-template.md` |

## Out of Scope

- Rewriting `data-stack.md` (database engine choice is unchanged)
- Documenting 006/007 designs (those intents own their own docs)
