---
id: 037-claude-proxy-service
unit: 001-claude-proxy-service
intent: 007-claude-integration
type: ddd-construction-bolt
status: complete
created: '2026-08-31T16:35:00Z'
started: '2026-08-31T17:30:00Z'
completed: '2026-08-31T18:00:00Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-31T17:32:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-31T17:38:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-08-31T17:40:00Z'
    artifact: adr-004-per-household-anthropic-key-in-vault.md
  - name: implement
    completed: '2026-08-31T17:55:00Z'
    artifact: 'supabase/migrations/20260831130000_ai_config_and_key_vault.sql'
  - name: test
    completed: '2026-08-31T18:00:00Z'
    artifact: ddd-03-test-report.md
stories:
  - 001-ai-config-and-usage-tables
  - 002-household-key-storage-functions
requires_bolts: []
enables_bolts:
  - 038-claude-proxy-service
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 3
---

# Bolt: 037-claude-proxy-service

## Objective

Build the database layer of the Claude integration: two new tables with strict household-scoped
RLS, and the Vault-backed functions for storing / clearing / resolving a per-household Anthropic
key. Nothing here calls Anthropic — this is the foundation bolt 038 sits on.

## Stories Included

- [ ] **001-ai-config-and-usage-tables**: `household_ai_config` (per-household `model_override`
      / `daily_call_limit` / `key_secret_id`, owner-only writes) and `ai_usage_log` (append-only
      per-attempt audit, member reads, **no** client writes), with the allowlist check and the
      `(household_id, created_at)` index — Priority: Must
- [ ] **002-household-key-storage-functions**: `set_household_ai_key(text)` /
      `clear_household_ai_key()` (owner-checked `security definer`, plaintext → Supabase Vault,
      only `key_secret_id` in the table, key never returned) and `resolve_ai_key(uuid)`
      (service-role-only decrypt) — Priority: **Must** (no shared key exists; this is the only
      way any household gets a key)

## Expected Outputs

- New migration(s) under `supabase/migrations/` (append-only): the two tables, their RLS
  policies + indexes, the allowlist constraint, and the three key functions
- `supabase/tests/database/*.sql` — pgTAP: cross-household isolation on both tables for every
  verb; non-owner cannot write `household_ai_config`; no client write path to `ai_usage_log`;
  owner set/clear happy path; `resolve_ai_key` returns the key for the service role and errors
  for `authenticated`; the key never appears in any client-selectable relation
- `implementation-plan.md`, `implementation-walkthrough.md` (DDD: domain model + technical
  design), `test-walkthrough.md` / `ddd-03-test-report.md`

## Dependencies

### Bolt Dependencies (within intent)

- None — this is the first bolt of intent 007

### Unit Dependencies (cross-unit)

- **004-account-model** (complete): `households` / `profiles` / `household_members`,
  `current_user_household_id()` for the owner predicate

### External

- **Supabase Vault** must be enabled on the project. **First task of this bolt**: a
  `vault.create_secret` / decrypt round-trip smoke test. If Vault is unavailable, story 002
  falls back to a `pgsodium`-encrypted `bytea` column with the same three-function contract —
  record the decision in `implementation-plan.md`.

### Enables

- **038-claude-proxy-service** — the Edge Function reads `household_ai_config`, writes
  `ai_usage_log`, and calls `resolve_ai_key`

## Success Criteria

- [ ] `supabase db reset` clean; `supabase test db` green including all new pgTAP cases
- [ ] `household_ai_config`: member `select`, **owner-only** `insert`/`update`, no `delete`;
      allowlist constraint rejects a non-allowlisted `model_override`, allows `null`
- [ ] `ai_usage_log`: member `select` only; **no** `authenticated` `insert`/`update`/`delete`
      policy exists
- [ ] Owner can set + clear a per-household key; the value is absent from every table column,
      client-readable view, RPC return, and the pgTAP fixtures
- [ ] `resolve_ai_key` callable by the service role, rejected for `authenticated` / `anon`
- [ ] `vault.decrypted_secrets` not selectable by `authenticated` / `anon`
- [ ] Code reviewed

## Notes

DDD bolt because there is real domain modelling (the config entity, the immutable usage-log
entity, and the key-resolution operation with its security boundary). Keep `resolve_ai_key`
separate from the config table so the decrypt path is a single small service-role-only
function that is easy to audit. The 429 path in bolt 038 will still `insert` an `ai_usage_log`
row, so design the RLS/grants with a service-role writer in mind.
