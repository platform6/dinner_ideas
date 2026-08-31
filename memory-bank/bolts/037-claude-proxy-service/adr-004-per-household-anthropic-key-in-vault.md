---
bolt: 037-claude-proxy-service
created: '2026-08-31T17:40:00Z'
status: accepted
superseded_by:
---

# ADR-4: Per-Household Anthropic Key in Supabase Vault, Resolved Only by a Service-Role Function

## Context

Intent 007 introduces Claude API access. The app is a static SPA + Supabase with no application
server, so an API key cannot live in the browser bundle. At Checkpoint 3 the team decided there
is **no shared/project key** — each household's owner supplies their own Anthropic key, and
Claude is unavailable for a household until they do.

That key is a long-lived credential that, if leaked, lets an attacker spend the household's
Anthropic balance. It must be:

- writable by a household **owner** (from the `/settings` UI),
- readable at call time by the `claude-proxy` Edge Function (bolt 038) running as the service
  role,
- **never** readable by any browser client — not in a column, a view, an API response, or the
  bundle,
- not swappable between households (an owner of household A must not be able to make the proxy
  use household B's key).

Supabase provides **Vault** (`vault.secrets` + the `vault.decrypted_secrets` view +
`vault.create_secret` / `vault.update_secret`), built for exactly this. The project has not
used it before, and `standards/` says nothing about credential storage.

## Decision

Store each household's Anthropic key as a **Supabase Vault secret**, named deterministically
`ai_key:{household_id}`. `household_ai_config` holds only the opaque `key_secret_id uuid`.

Three `security definer` functions (owned by `postgres`, pinned `search_path`) are the _only_
code that touches key material:

- `set_household_ai_key(text)` / `clear_household_ai_key()` — `execute` granted to
  `authenticated`; each derives the household from `current_user_household_id()` and checks
  `household_members.role = 'owner'` inline, so a caller can only ever affect their own
  household's key.
- `resolve_ai_key(uuid)` — `execute` granted to **`service_role` only** (revoked from
  `public` / `authenticated` / `anon`); returns the decrypted key or `null`. This is the one
  decrypt path in the system, and it is called only by the Edge Function.

`household_ai_config.key_secret_id` is made **non-writable by `authenticated`** at the column
level (`revoke insert (key_secret_id), update (key_secret_id) … from authenticated, anon`), so
even though owners can `update` the row for `model_override` / `daily_call_limit`, they cannot
point it at another household's secret.

## Rationale

The forces are: keep the secret out of every client-reachable surface; keep the write path
owner-scoped; keep the read path service-role-scoped; and don't invent crypto.

Vault does the encryption-at-rest and key management. `security definer` functions are this
project's established mechanism for "an operation that must cross an RLS/privilege boundary"
(`ADR-1`, `current_user_household_id()`), so reusing that shape keeps the codebase consistent.
Splitting `resolve` from `set`/`clear` and granting it to `service_role` only means the decrypt
capability is auditable in one place and unreachable from a JWT.

### Alternatives Considered

| Alternative                                                         | Pros                             | Cons                                                                                                                                                                                        | Why Rejected                                                                                                  |
| ------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pgsodium`-encrypted `bytea` column on `household_ai_config`        | No new schema concept; one table | We manage the key id / rotation; `pgsodium` raw API is lower-level and easy to misuse; the encrypted column still sits on a table with owner `update` — needs the same column-revoke anyway | Kept as the **fallback** if `postgres` can't use Vault from a definer function on this project; not preferred |
| Store the key as a Supabase **secret / env var**, one per household | Familiar                         | Secrets are per-project, not per-row; hundreds of households = hundreds of env vars, no RLS story, no owner self-service                                                                    | Doesn't model per-tenant data                                                                                 |
| Keep the key in the browser, call Anthropic directly                | No server surface                | The key ships in the bundle / lives in `localStorage`; trivially exfiltrated; CORS aside, this is the thing the whole intent exists to avoid                                                | Rejected outright                                                                                             |
| A single shared project key                                         | Zero per-household setup         | Explicitly rejected at Checkpoint 3 — the founding account would carry every household's spend                                                                                              | Out of scope by decision                                                                                      |

## Consequences

### Positive

- The key is never on a client-reachable surface; `household_ai_config` is safe to expose to
  members (it only says _whether_ a key is set).
- One audited decrypt path (`resolve_ai_key`, `service_role` only).
- Owner self-service (set / rotate / clear) with no project-level secret management.
- The deterministic secret name makes `set` idempotent and `clear` leak-proof (delete by name).

### Negative

- New moving part (Vault) the team must understand; a first for this project.
- `set` / `clear` do a Vault op _and_ a table write in one function body — correct, but the
  two-system transaction is a place bugs could orphan a secret (mitigated: delete-by-name).
- Rotation is manual (owner re-enters the key). No expiry tracking in v1.

### Risks

- **`postgres` may lack privilege to call `vault.*` or read `vault.decrypted_secrets` from a
  `security definer` function on this project.** Mitigation: bolt 037's first implementation
  step is a `vault.create_secret` + decrypt round-trip smoke test; if it fails, take the
  `pgsodium` fallback (same three function signatures) and note it in `system-architecture.md`
  / `tech-stack.md`.
- **Key-swap escalation** if `key_secret_id` were client-writable. Mitigation: the column-level
  `revoke` above; covered by a pgTAP case.

## Related

- **Stories**: `007-claude-integration/001-claude-proxy-service/002-household-key-storage-functions`,
  `.../001-ai-config-and-usage-tables`; consumed by `.../003-claude-proxy-edge-function` and
  `007-claude-integration/002-settings-ui/003-owner-ai-controls`.
- **Standards**: if a second per-tenant secret ever appears, promote this pattern into
  `standards/system-architecture.md` (a "per-tenant secrets" section).
- **Previous ADRs**: `ADR-1` (definer functions for boundary-crossing operations) — this is
  `ADR-1`'s pattern applied to credential storage.
