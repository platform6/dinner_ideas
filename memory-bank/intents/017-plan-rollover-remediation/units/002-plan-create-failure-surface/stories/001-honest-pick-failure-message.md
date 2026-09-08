---
id: 001-honest-pick-failure-message
unit: 002-plan-create-failure-surface
intent: 017-plan-rollover-remediation
status: planned
priority: should
created: '2026-09-08T00:00:00Z'
assigned_bolt: 068-plan-create-failure-surface
implemented: false
---

# Story: 001-honest-pick-failure-message

## User Story

**As a** household member whose pick just failed
**I want** to be told something that is true
**So that** I am not tapping a button that can never work

## Acceptance Criteria

- [ ] **Given** a pick that fails on a database constraint, **When** the error is shown, **Then**
      it does not say "try again" — retrying cannot succeed.
- [ ] **Given** a transient failure (network, timeout), **When** shown, **Then** "try again"
      remains, because there it is true.
- [ ] **Given** the distinction, **When** implemented, **Then** it is made on the error's **code**
      — never by string-matching Postgres's message text, which is not a contract.
- [ ] **Given** any failure, **When** shown, **Then** no raw error object reaches the UI.
- [ ] **Given** the catalog's existing error alert, **When** this lands, **Then** it is reused —
      this changes what is said, not where.

## Technical Notes

- Supabase surfaces `code` on its error object (`23505` here). That is the stable signal.
- The current copy — _"Couldn't save that change, try again."_ — is standards-compliant and
  unhelpful, which is why this is about accuracy rather than about leaking errors.
- Wording should be honest without pretending to diagnose: something closer to "that couldn't be
  saved — this needs looking at" than a guess at the cause the UI cannot actually know.

## Dependencies

### Requires

- Unit 001

### Enables

- None

## Out of Scope

- Any client-side check for an existing draft — that invariant lives in Postgres (ADR-1)
