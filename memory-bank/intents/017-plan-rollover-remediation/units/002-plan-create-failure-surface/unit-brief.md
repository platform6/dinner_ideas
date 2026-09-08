---
unit: 002-plan-create-failure-surface
intent: 017-plan-rollover-remediation
phase: inception
status: ready
created: '2026-09-08T00:00:00Z'
updated: '2026-09-08T00:00:00Z'
---

# Unit Brief: Plan Create Failure Surface

## Purpose

Stop telling people to retry something that cannot succeed.

## Scope

### In Scope

- Distinguishing a permanent failure to create a plan from a transient one
- The catalog's pick-failure message

### Out of Scope

- The index fix (unit 001)
- Any client-side pre-check for an existing draft — that is an invariant, and it lives in Postgres

---

## Assigned Requirements

| FR   | Title                                        | Priority |
| ---- | -------------------------------------------- | -------- |
| FR-3 | A permanent failure does not advise retrying | Should   |

## Key Constraints

- **Do not string-match Postgres's message text.** It is not a contract and can be reworded
  between versions. Use the error code.
- **Raw error objects still never reach the UI** — the coding standard is unchanged. The current
  message is compliant; it is simply wrong advice.
- The catalog already renders `toggleSelection.isError` as _"Couldn't save that change, try
  again."_ — this unit changes what is said, not where it is said.

## Why it is cuttable

Once unit 001 ships, this specific failure is unreachable. The unit earns its place by covering
the **next** unforeseen constraint failure, not this one — so if it is cut, nothing regresses.

## Dependencies

**Requires**: `001-plan-uniqueness-scope`

**Enables**: none

## Definition of Done

- A pick failing on a constraint violation says something true, not "try again"
- A genuinely transient failure still says "try again"
- The distinction is made on the error code, never on message text
- `tsc -b`, `eslint`, `vitest` all green
