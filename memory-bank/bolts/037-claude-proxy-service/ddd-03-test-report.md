---
stage: test
bolt: 037-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T18:00:00Z'
---

## Test Report: claude-proxy-service (bolt 037)

### Summary

- **pgTAP (`supabase test db`)**: 14 files / **210 tests** pass (was 174; +36 in the new
  `ai_config_and_key_vault_test.sql`). No regression in the 13 prior files.
- **`supabase db reset`**: clean — the migration applies from scratch on top of all prior
  migrations.
- Vault smoke test (pre-implementation): `postgres` can `vault.create_secret` /
  `vault.update_secret` and read `vault.decrypted_secrets`, both directly and from inside a
  `security definer` function with `search_path = ''`. **ADR-4 primary path (Vault) is used;
  the `pgsodium` fallback was not needed.**

### Deliverables

- `supabase/migrations/20260831130000_ai_config_and_key_vault.sql` — `household_ai_config`
  (+ `check`s on `model_override` and `daily_call_limit`), `ai_usage_log`
  (+ `(household_id, created_at desc)` index), column-scoped write grants, RLS, and
  `set_household_ai_key` / `clear_household_ai_key` / `resolve_ai_key`.
- `supabase/tests/database/ai_config_and_key_vault_test.sql` — 36 assertions.

### Acceptance Criteria Validation

**Story 001 — ai-config-and-usage-tables**

- ✅ `household_ai_config` columns / PK / FK / `check` (allowlist, `daily_call_limit >= 0`).
- ✅ `ai_usage_log` columns / PK / FK / `(household_id, created_at)` index.
- ✅ RLS: member `select` on both; owner-only `insert` / `update` on `household_ai_config`;
  **no** `authenticated` `insert` / `update` / `delete` on `ai_usage_log` (policy absent +
  privileges revoked).
- ✅ Missing config row behaves as all-defaults — the Edge Function (bolt 038) will
  `left join` / `coalesce`; documented, not enforced by a trigger.
- ✅ Cross-household isolation: a member of household B gets 0 rows for household A's config and
  usage log; a non-owner member of B cannot write B's config (RLS filters to 0 rows).
- ✅ Allowlist `check` rejects `'gpt-4'`, accepts `null` and allowlisted ids.

**Story 002 — household-key-storage-functions**

- ✅ `set_household_ai_key` (owner) → Vault secret `ai_key:{household_id}` created,
  `household_ai_config.key_secret_id` set; no plaintext in `household_ai_config` (no such
  column); `updated_by` = caller.
- ✅ `set_household_ai_key` by a non-owner member → raises `42501`; by a caller with no
  household → `42501`.
- ✅ `set_household_ai_key('')` / `'   '` → raises `22023`.
- ✅ `resolve_ai_key(hh)` as `service_role` → decrypted key; **`execute` not granted to
  `authenticated` / `anon` / `public`** (asserted via `has_function_privilege`).
- ✅ `resolve_ai_key` → `null` for a household with no key and for an unknown household.
- ✅ `clear_household_ai_key` (owner) → Vault secret deleted, `key_secret_id` null; second call
  is a no-op success.
- ✅ `key_secret_id` **not** writable by `authenticated` (table-level write grants dropped,
  re-granted per-column excluding `key_secret_id`) — `has_column_privilege(... 'INSERT'/'UPDATE')`
  is `false`; covered by ADR-4's "key-swap escalation".
- ✅ `vault.decrypted_secrets` not selectable by `authenticated` / `anon` (Supabase default;
  not re-granted).

### Issues Found

1. **Per-column `REVOKE` is a no-op while the table-level grant stands.** First cut used
   `revoke insert (key_secret_id), update (key_secret_id) … from authenticated`; Postgres still
   reported the privilege because Supabase grants table-level `ALL` on new `public` tables.
   Fixed: `revoke insert, update, delete … from authenticated, anon` then `grant insert/update
(safe columns) … to authenticated`.
2. **`EXECUTE` on `resolve_ai_key` still held by `authenticated`** after `revoke all … from
public` — Supabase's default privileges grant `execute` to `anon` / `authenticated` too.
   Fixed: `revoke execute … from public, anon, authenticated`.
3. **Data-modifying CTE in a sub-select** — a test used `select is((with u as (update …
returning 1) select count(*) from u), 0, …)`; Postgres requires a data-modifying `WITH` to
   be top-level. Rewrote as `lives_ok(update …)` + a post-`reset role` value check.

All three were fixed within this bolt; suite is green.

### Recommendations / follow-ups

- **`database.types.ts` regen** for the two new tables — done in bolt 039 (the frontend
  consumer), per the unit plan.
- **Prod**: the Vault privilege behaviour must be confirmed on the linked project when bolt
  038 deploys (`resolve_ai_key` from the service-role Edge Function). Smoke test locally
  passed; hosted Vault is standard but unverified here.
