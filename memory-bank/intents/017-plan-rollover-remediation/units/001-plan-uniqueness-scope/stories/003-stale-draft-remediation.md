---
id: 003-stale-draft-remediation
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
status: complete
priority: must
created: '2026-09-08T00:00:00Z'
assigned_bolt: 067-plan-uniqueness-scope
implemented: true
---

# Story: 003-stale-draft-remediation

> **⚡ ALREADY PERFORMED 2026-09-08, ahead of the bolt.** Production was blocked, so the product
> owner chose **lock** ("still in active development and don't need solid records yet") and it was
> executed via `select lock_weekly_plan('bf0206d0-…')`. Verified: `unlocked_plans = 0`; picking
> works again.
>
> Side effect, accepted: the week of 2026-08-30 already had a locked plan (`06485677…`), so it now
> carries **6** `meal_history` rows rather than 3. The bolt's job for this story is to **record**
> the decision, not repeat the action.

## User Story

**As a** product owner
**I want** the draft that caused this outage dealt with deliberately
**So that** the week it represents is either kept honestly or discarded knowingly

## Acceptance Criteria

- [ ] **Given** the production row `bf0206d0-4239-48c5-9db5-eca5a5b4e71f` (week 2026-08-30, 3
      picks, never locked), **When** this story completes, **Then** it has been either locked or
      deleted by explicit decision.
- [ ] **Given** the choice, **When** made, **Then** it is recorded with its reasoning — locking
      writes 3 `meal_history` rows dated 2026-08-30 and is only correct if those dinners were
      actually eaten; deleting cascades the 3 selections and keeps history honest at the cost of
      the record.
- [ ] **Given** either action, **When** taken, **Then** it is performed by or with the explicit
      approval of the product owner. This is production data.
- [ ] **Given** story 001 has shipped, **When** the row is still present, **Then** picking still
      works — this story affects that week's history, not the block.

## Technical Notes

- Lock: `select lock_weekly_plan('bf0206d0-4239-48c5-9db5-eca5a5b4e71f');` — the intended path;
  the require-three trigger passes (3 picks) and the meal-history trigger fires.
- Delete: `delete from weekly_plans where id = 'bf0206d0-4239-48c5-9db5-eca5a5b4e71f';` — children
  cascade.
- Confirmed live 2026-09-08 via `supabase db query --linked`. Note that this session's Supabase
  **MCP** connection is a different account and cannot see this project; the CLI can.

## Dependencies

### Requires

- 001-scope-index-to-week (not technically, but the block should be gone before touching data)

### Enables

- None

## Out of Scope

- Any automated cleanup of stale drafts, now or on rollover
