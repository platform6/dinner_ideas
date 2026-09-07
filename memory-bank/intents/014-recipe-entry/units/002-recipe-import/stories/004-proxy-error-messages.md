---
id: 004-proxy-error-messages
unit: 002-recipe-import
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 062-import-review-and-tests
implemented: false
---

# Story: 004-proxy-error-messages

## User Story

**As a** household member whose import just failed
**I want** to know which thing went wrong and what to do about it
**So that** I am not left guessing whether to retry, wait, or go set something up

## Acceptance Criteria

- [ ] **Given** `no_api_key`, **When** surfaced, **Then** the message says Claude is not set up for
      this household and points at `/settings` — this is a setup problem, not a failure.
- [ ] **Given** `rate_limited`, **When** surfaced, **Then** the message says today's limit is
      reached, distinguishing it from a transient error the user might retry immediately.
- [ ] **Given** `upstream_error` or `timeout`, **When** surfaced, **Then** each says something went
      wrong reaching Claude and that retrying is reasonable.
- [ ] **Given** `bad_request`, **When** surfaced, **Then** it is treated as a bug in this caller,
      not as user error — sizing is handled in 001 and should make it unreachable.
- [ ] **Given** any of these, **When** surfaced, **Then** the pasted text is preserved and manual
      entry remains available.
- [ ] **Given** any of these, **When** surfaced, **Then** no raw error object or error code string
      reaches the interface.

## Technical Notes

- The full set reachable from this caller: `no_api_key` (409), `rate_limited` (429),
  `upstream_error` (502), `timeout` (502), `bad_request` (400). A 401 means the session is gone and
  is the app's existing concern, not this story's.
- A household without a key is a **normal** state, not an error — it is how every household starts.
  The message should read that way.

## Dependencies

### Requires

- 003-response-parsing

### Enables

- None

## Out of Scope

- Changing any proxy behaviour or error code
- Surfacing token usage or cost — `ai_usage_log` already records it
