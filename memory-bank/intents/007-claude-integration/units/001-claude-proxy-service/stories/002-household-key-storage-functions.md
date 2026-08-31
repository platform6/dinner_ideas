---
id: 002-household-key-storage-functions
unit: 001-claude-proxy-service
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 037-claude-proxy-service
implemented: true
---

# Story: 002-household-key-storage-functions

## User Story

**As a** household owner (via the settings UI) and the `claude-proxy` function
**I want** to store an optional per-household Anthropic key encrypted, and resolve it at call
time
**So that** a household can use its own key without the key ever touching the browser, a
regular table column, or any API response

## Acceptance Criteria

- [ ] **Given** `public.set_household_ai_key(p_key text)` (`security definer`), **When**
      called by a household **owner**, **Then** it: creates or updates a Supabase **Vault**
      secret holding `p_key`, sets `household_ai_config.key_secret_id` to that secret's id
      (first-touching the config row if absent), sets `updated_by = auth.uid()`, and returns
      **only** a boolean / void — never the key
- [ ] **Given** `set_household_ai_key` called by a **non-owner** member (or a user with no
      household), **Then** it raises / returns a permission error and writes nothing
- [ ] **Given** `public.clear_household_ai_key()` (`security definer`), **When** called by an
      owner, **Then** it deletes the Vault secret and sets `key_secret_id = null`; calling it
      with no key set is a no-op success
- [ ] **Given** `public.resolve_ai_key(p_household_id uuid)` (`security definer`), **Then** it
      returns the decrypted per-household key if `key_secret_id` is set, else `null`; and
      **`execute` is granted to the service role only** — `authenticated` / `anon` cannot call
      it
- [ ] **Given** any client role, **Then** `vault.decrypted_secrets` (and any other decrypted
      view) is **not** selectable; `household_ai_config.key_secret_id` is a bare uuid that
      discloses nothing
- [ ] **Given** the set → clear → set sequence, **Then** no orphan Vault secret remains (the
      old secret is removed or reused on update)
- [ ] **Given** the pgTAP suite, **Then** cases cover: owner set/clear happy path; non-owner
      rejected; `resolve_ai_key` returns the set value for the service role and errors for
      `authenticated`; the key never appears in any client-selectable relation

## Technical Notes

- Use `vault.create_secret` / `vault.update_secret` / (delete via the vault API) — name the
  secret deterministically, e.g. `ai_key:{household_id}`, so set-after-set updates in place.
- `set_household_ai_key` should run in one transaction: Vault write + `household_ai_config`
  upsert; on failure, nothing is committed.
- Owner check: `exists (select 1 from household_members where profile_id = auth.uid() and
household_id = <target> and role = 'owner')`. The target household is
  `current_user_household_id()` — callers do not pass a household id to the set/clear
  functions.
- `resolve_ai_key` takes an explicit `p_household_id` because the function calls it with a
  server-derived id, not `auth.uid()`.
- **Fallback if Vault is unavailable on the project**: a `pgsodium`-encrypted
  `household_ai_config.encrypted_api_key bytea` column with the same three-function external
  contract; decide in the bolt after a Vault smoke test.

## Dependencies

### Requires

- `001-ai-config-and-usage-tables` — `household_ai_config.key_secret_id`
- Supabase Vault enabled on the project (or the `pgsodium` fallback)

### Enables

- `003-claude-proxy-edge-function` — calls `resolve_ai_key`
- Unit `002-settings-ui` story `003-owner-ai-controls` — calls `set/clear` via `supabase.rpc`

## Edge Cases

| Scenario                                         | Expected Behavior                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `set_household_ai_key('')`                       | Reject as `bad_request` (empty key)                                                                       |
| Vault write succeeds, config upsert fails        | Whole transaction rolls back; no dangling secret                                                          |
| Household with a key is deleted                  | Cascade removes the config row; a follow-up prunes the Vault secret (or document it as acceptable orphan) |
| `resolve_ai_key` for a household with no key set | Returns `null` → the function returns `no_api_key` (there is no env-key fallback)                         |

## Out of Scope

- The UI that calls `set/clear` → unit `002-settings-ui`
- The `no_api_key` response when `resolve_ai_key` returns null (that lives in the function) →
  story 003. There is no env-key fallback.
- Key rotation reminders / expiry
