---
unit: 001-claude-proxy-service
intent: 007-claude-integration
phase: inception
status: complete
created: '2026-08-31T16:35:00Z'
updated: '2026-08-31T16:35:00Z'
unit_type: backend
default_bolt_type: ddd-construction-bolt
---

# Unit Brief: Claude Proxy Service

## Purpose

Deliver the secured server-side path to the Anthropic API that all future AI features build on:
two backing tables, Vault-backed per-household key storage, and the `claude-proxy` Supabase
Edge Function that authenticates, rate-limits, meters, and proxies every Claude call. After
this unit, adding an AI feature means writing a prompt and calling the function — not
re-solving auth, secrets, limits, or logging.

## Scope

### In Scope

- `household_ai_config` table — per-household non-secret settings (`model_override`,
  `daily_call_limit`, `key_secret_id`) + RLS (owner-only writes, member reads) (FR-1)
- `ai_usage_log` table — append-only per-attempt audit + RLS (member reads; **no** client
  writes) + index (FR-3)
- `set_household_ai_key(text)` / `clear_household_ai_key()` — `security definer`, owner-checked,
  write the plaintext key to Supabase Vault, keep only `key_secret_id` in
  `household_ai_config`; never return the key (FR-2)
- `resolve_ai_key(uuid)` — `security definer`, **service-role only**, returns the decrypted
  per-household key or `null`; `null` → the function returns `no_api_key` (there is no env-key
  fallback) (FR-2)
- `claude-proxy` Edge Function (Deno/TS): JWT verify → resolve `profile_id` + `household_id`
  → load config (defaults if row absent) → daily rate-limit count + 429 → `resolve_ai_key`
  (`null` → `no_api_key`) → validate model allowlist + `max_tokens`
  ceiling + input size → `@anthropic-ai/sdk` `messages.create` (non-streaming, default
  `claude-sonnet-5`) → write `ai_usage_log` on every path → typed `{text, usage, model,
latency_ms}` or `{error_code, message}` (FR-4, FR-5, FR-6)
- Per-model cost rate table in the function; `est_cost_usd` per call (FR-6)
- Config: `ANTHROPIC_MODEL` (default `claude-sonnet-5`), `AI_DAILY_CALL_LIMIT` (default 25);
  in-code allowlist + ceiling + input cap; **no `ANTHROPIC_API_KEY`**; `claude-proxy/README.md`
  (FR-9)
- Standards updates: `system-architecture.md` (2nd backend surface), `tech-stack.md` (new
  deps), `decision-index.md` (the decision entry) (FR-10)
- Tests: pgTAP for the new RLS + key-function gating + "key not client-readable"; Deno tests
  for the function against a mocked Anthropic client

### Out of Scope

- The `callClaude` frontend client and the `/settings` UI → unit `002-settings-ui`
- Any concrete AI feature / prompt (recipe import etc.) → intent `008-recipe-import`
- Streaming, prompt caching, tool use, structured-output enforcement, retries, model fallback
- A cross-household usage/cost dashboard
- A shared / founding `ANTHROPIC_API_KEY` and any fallback to one

---

## Assigned Requirements

| FR    | Requirement                           | Priority |
| ----- | ------------------------------------- | -------- |
| FR-1  | `household_ai_config` table           | Must     |
| FR-2  | Per-household API key storage (Vault) | Must     |
| FR-3  | `ai_usage_log` table                  | Must     |
| FR-4  | `claude-proxy` Edge Function          | Must     |
| FR-5  | Per-household daily rate limit        | Must     |
| FR-6  | Usage + cost logging                  | Must     |
| FR-9  | Configuration & limits                | Must     |
| FR-10 | Standards & decision docs             | Must     |

---

## Domain Concepts

### Key Entities

| Entity              | Description                                  | Attributes                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Household AI config | Per-household, non-secret AI settings        | `household_id` (PK), `model_override` (null = default; allowlisted when set), `daily_call_limit` (default 25), `key_secret_id` (Vault ref; null = no key → AI off for the household), `updated_at`, `updated_by` |
| AI usage log entry  | One immutable record per Claude call attempt | `id`, `household_id`, `profile_id`, `created_at`, `feature`, `model`, `input_tokens`, `output_tokens`, `est_cost_usd`, `ok`, `error_code`, `latency_ms`                                                          |
| Household API key   | An owner-supplied Anthropic key              | plaintext lives only in Supabase Vault; referenced by `household_ai_config.key_secret_id`                                                                                                                        |

### Key Operations

| Operation                 | Description                                 | Inputs                                                      | Outputs                                                                                        |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Resolve key               | Get the household's own key                 | `household_id` (server-derived)                             | per-household key (Vault), or `null` → `no_api_key`                                            |
| Rate-limit check          | Count today's attempts for the household    | `household_id`, `daily_call_limit`                          | proceed, or 429 `rate_limited` (+ a log row)                                                   |
| Proxy a Claude call       | Validate, call Anthropic, meter             | `{feature, system?, messages[], model?, max_tokens?}` + JWT | `{text, usage, model, latency_ms}` or `{error_code, message}` + one `ai_usage_log` row         |
| Set / clear household key | Owner stores or removes a per-household key | plaintext key (RPC), `auth.uid()`                           | Vault secret created/updated/removed; `key_secret_id` set/nulled; boolean state only to client |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 4     |
| Must Have     | 4     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                            | Title                                                                                                         | Priority | Status  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| 001-ai-config-and-usage-tables      | `household_ai_config` + `ai_usage_log` + RLS + indexes                                                        | Must     | Planned |
| 002-household-key-storage-functions | Vault-backed `set` / `clear` / `resolve` key functions                                                        | Must     | Planned |
| 003-claude-proxy-edge-function      | The Deno function: auth, rate limit, key resolve, validate, Anthropic call, per-attempt logging, typed errors | Must     | Planned |
| 004-config-and-standards-docs       | Function README + secret setup; architecture / tech-stack / decision-index updates                            | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                           | Reason                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `004-account-model` (complete) | `households` / `profiles` / `household_members`, `current_user_household_id()` — household resolution and the owner check |

### Depended By

| Unit                              | Reason                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `002-settings-ui` (this intent)   | Needs the deployed function, the `set/clear key` RPCs, and `household_ai_config` |
| `008-recipe-import` (next intent) | First real consumer of `claude-proxy` — adds a `feature` tag + prompt only       |

### External Dependencies

| System                  | Purpose                                                  | Risk                                                                                                           |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Supabase Edge Functions | Runtime for `claude-proxy`                               | Medium — first use in this project; verify deploy works early                                                  |
| Supabase Vault          | Encrypted per-household key store (the only enable path) | Medium — first use; only fallback is a `pgsodium`-encrypted column (same contract). No shared-key-only option. |
| Anthropic API           | The Claude calls themselves                              | Low — well-documented; `@anthropic-ai/sdk` via `npm:` in Deno                                                  |
| Supabase secrets        | `ANTHROPIC_MODEL`, `AI_DAILY_CALL_LIMIT`                 | Low — standard `supabase secrets set` (no API key here)                                                        |

---

## Technical Context

### Suggested Technology

Deno + `@anthropic-ai/sdk` (via `npm:@anthropic-ai/sdk`) for the function; standard
`supabase/migrations` SQL for the tables/functions; pgTAP for DB tests (per
`standards/data-stack.md`); Deno's built-in test runner for the function. Default model
`claude-sonnet-5`, non-streaming `messages.create`. Follow the `claude-api` skill guidance:
official SDK (not raw fetch), typed errors, don't lowball `max_tokens`.

### Integration Points

| Integration                          | Type | Protocol                                                                                   |
| ------------------------------------ | ---- | ------------------------------------------------------------------------------------------ |
| SPA → `claude-proxy`                 | API  | HTTPS POST (JSON) + Bearer JWT                                                             |
| `claude-proxy` → GoTrue              | Auth | JWT verification (Supabase client / JWKS)                                                  |
| `claude-proxy` → Postgres            | DB   | service-role Supabase client (config read, count, `ai_usage_log` insert, `resolve_ai_key`) |
| `claude-proxy` → Vault               | DB   | via `resolve_ai_key` (service role)                                                        |
| `claude-proxy` → Anthropic           | API  | `messages.create` (non-streaming)                                                          |
| Owner → `set/clear_household_ai_key` | RPC  | `supabase.rpc` over the existing client                                                    |

### Data Storage

| Data                  | Type                    | Volume                                                          | Retention                           |
| --------------------- | ----------------------- | --------------------------------------------------------------- | ----------------------------------- |
| `household_ai_config` | SQL (1 row / household) | tiny                                                            | lifetime of the household           |
| `ai_usage_log`        | SQL, append-only        | ~ (calls/household/day) × households; capped by the daily limit | keep-all for v1 (OQ-4: prune later) |
| Per-household key     | Supabase Vault          | 1 secret / opted-in household                                   | until owner clears it               |

---

## Constraints

- The API key is never returned to a client, never stored in a regular column, never logged.
- `household_id` is derived from the verified JWT inside the function — never read from the
  request body.
- `supabase/migrations/` is append-only.
- `@anthropic-ai/sdk` is a Deno-only dependency; the frontend must not gain it.
- Non-streaming only in v1.
- The function must fail _typed_ on every expected error (`no_api_key`, `rate_limited`,
  `bad_request`, `upstream_error`, `timeout`, `no_household`) — no unhandled 500s.

## Success Criteria

### Functional

- [ ] `household_ai_config` + `ai_usage_log` exist with RLS: owner-only config writes, member
      reads, **no** client insert/update/delete on `ai_usage_log`
- [ ] An owner can set and clear a per-household key; the value never appears in any table
      column, view the client can read, RPC return, or function response/log
- [ ] `claude-proxy`: unauth → 401 (no call, no log); no household → 403; happy path → 200 with
      real `usage` + exactly one `ok=true` log row
- [ ] With `daily_call_limit = N`, call N+1 in a UTC day → 429 `rate_limited` + exactly one
      log row; a changed limit takes effect next call with no deploy
- [ ] Bad model / oversized `max_tokens` / oversized input → 400 `bad_request` (logged);
      Anthropic 5xx / network / 429 → 502 `upstream_error` (logged)
- [ ] `est_cost_usd` on a success row matches `(in/1e6)·rate_in + (out/1e6)·rate_out` for the
      model used

### Non-Functional

- [ ] Function overhead (excluding the Anthropic call) < ~150 ms
- [ ] `vault.decrypted_secrets` not selectable by `authenticated` / `anon`
- [ ] pgTAP + Deno function tests green; no secret in any test fixture or log

### Quality

- [ ] `supabase db reset` + `supabase test db` clean; Deno tests pass
- [ ] `claude-proxy/README.md` documents every env var, the allowlist, and the ceiling
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                     | Type | Stories  | Objective                                                                                                                                                                   |
| ------------------------ | ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 037-claude-proxy-service | DDD  | 001, 002 | DB layer: the two tables + RLS + indexes, and the Vault-backed set/clear/resolve key functions, with pgTAP                                                                  |
| 038-claude-proxy-service | DDD  | 003, 004 | The `claude-proxy` Edge Function (auth, rate limit, key resolve, validate, Anthropic call, per-attempt logging, typed errors) + Deno tests + README + standards-doc updates |

Sequence: 037 → 038.

---

## Notes

- First Edge Function and first Vault use in the project — bolt 038 should start by proving
  `supabase functions deploy` and a `vault.create_secret` round-trip work on this project
  before building the pipeline. If Vault is unavailable, story 002 falls back to a
  `pgsodium`-encrypted `bytea` column with the same three-function contract — there is **no**
  shared-key-only fallback (per-household key is the only enable path).
- `resolve_ai_key` is deliberately separate from the config table so the decrypt path is
  service-role-only and easy to audit.
- The rate-limit check and the `ai_usage_log` insert are the same table — the 429 path still
  inserts a row, so hammering is itself visible and self-limiting.
