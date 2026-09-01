---
id: 002-ai-config-write-provenance
unit: 002-settings-ai-remediation
intent: 008-claude-proxy-review-remediation
status: complete
priority: should
created: '2026-08-31T21:00:00Z'
assigned_bolt: 042-settings-ai-remediation
implemented: true
---

# Story: 002-ai-config-write-provenance

> **Post-deploy amendment (2026-09-01, `ec41f22`).** The provenance trigger below shipped and
> works. But keeping `updateAiConfig` on a `.upsert()` (this story's "no switch to `.rpc`,
> OQ-2") `42501`'d on prod — `household_ai_config` has column-only grants (ADR-4) and
> `ON CONFLICT DO UPDATE` needs table-level `UPDATE`. Fixed by migration `20260901120000`:
> model/limit writes now go through `security definer` RPCs (`set_ai_model_override` /
> `set_ai_daily_call_limit`). See ADR-6 and `../../../deployment/deployment-plan.md`.

## User Story

**As** a household owner (and anyone later auditing config changes)
**I want** model / daily-limit edits to record who made them and when, server-side
**So that** the `updated_by` / `updated_at` columns are trustworthy, like they are for the API key

## Context

`updateAiConfig` (`src/features/settings/api.ts:50`) upserts `household_ai_config` with a
**client-supplied** `updated_at: new Date().toISOString()` and never sets `updated_by`. Model
/ limit edits leave `updated_by` NULL and trust the browser clock — unlike
`set_household_ai_key`, which records `auth.uid()` server-side. (Review finding 9.)

## Acceptance Criteria

- [ ] **Given** an owner changes `model_override` or `daily_call_limit` on `/settings`,
      **When** the write completes, **Then** the row has `updated_by = <the owner's profile
  id>` and `updated_at` within a few seconds of server `now()`.
- [ ] **Given** `updateAiConfig`, **When** it issues the write, **Then** it no longer sends
      `updated_at` (and does not send `updated_by`); it keeps using
      `supabase.from('household_ai_config').upsert(..., { onConflict: 'household_id' })`.
- [ ] **Given** the new `BEFORE INSERT OR UPDATE` trigger on `household_ai_config`, **When**
      any insert or update occurs, **Then** it sets `NEW.updated_by = auth.uid()` and
      `NEW.updated_at = now()` unconditionally (ignoring any client-provided values).
- [ ] **Given** a non-owner attempts to write `household_ai_config`, **When** the write is
      issued, **Then** RLS still rejects it exactly as today — the trigger does not widen or
      narrow write authorization.
- [ ] **Given** `007`'s settings tests for model / limit writes, **When** re-run, **Then**
      they pass with the only change being the absent `updated_at` in the `.upsert` payload.
- [ ] **Given** the auto-create-on-first-write behaviour from `007` FR-1, **When** the first
      write for a household inserts the row, **Then** `updated_by` / `updated_at` are stamped
      by the trigger on that INSERT too.

## Technical Notes

- **Migration** (`supabase/migrations/<ts>_ai_config_provenance.sql`, append-only):
  ```sql
  create or replace function stamp_household_ai_config_provenance()
  returns trigger language plpgsql security definer set search_path = '' as $$
  begin
    new.updated_by := auth.uid();
    new.updated_at := now();
    return new;
  end $$;

  create trigger trg_household_ai_config_provenance
    before insert or update on public.household_ai_config
    for each row execute function stamp_household_ai_config_provenance();
  ```
  (Confirm `auth.uid()` resolves under the trigger — it does for a PostgREST call carrying the
  user's JWT. Match the `security definer` / `search_path` conventions of `007`'s key
  functions.)
- **Client**: remove `updated_at: new Date().toISOString()` from the `updateAiConfig` upsert
  payload. Nothing else changes — no switch to `.rpc` (OQ-2).

## Dependencies

### Requires

- Shares `settings/api.ts` and the migration folder with story 001's bolt; same bolt (042).

### Enables

- Any future "config change history" or admin view has a real actor + timestamp to show.

## Edge Cases

| Scenario                                                  | Expected Behaviour                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A service-role / migration write to `household_ai_config` | `auth.uid()` is NULL ⇒ `updated_by` NULL for that write; acceptable (not a user edit) |
| Client still sends `updated_at` (old bundle cached)       | Trigger overwrites it with `now()` — no harm                                          |
| `key_secret_id` write attempt via this path               | Still column-revoked per `007`; unchanged                                             |

## Out of Scope

- A `security definer` `update_household_ai_config` RPC (OQ-2 chose the trigger).
- Backfilling `updated_by` for rows already written by the deployed client.
- A config-change audit log table.
