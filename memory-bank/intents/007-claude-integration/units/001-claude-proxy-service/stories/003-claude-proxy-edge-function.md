---
id: 003-claude-proxy-edge-function
unit: 001-claude-proxy-service
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 038-claude-proxy-service
implemented: true
---

# Story: 003-claude-proxy-edge-function

## User Story

**As a** signed-in household member (through the app)
**I want** a single server endpoint that safely makes a Claude call on my household's behalf
**So that** AI features work without the app ever holding an API key, and every call is
authenticated, capped, and metered

## Acceptance Criteria

- [ ] **Given** `supabase/functions/claude-proxy/`, **When** deployed, **Then** it accepts
      `POST` JSON `{ feature: string, system?: string, messages: {role:'user'|'assistant',
    content:string}[], model?: string, max_tokens?: number }` and requires
      `Authorization: Bearer <supabase access token>`
- [ ] **Given** no / invalid token, **Then** `401`, no Anthropic call, **no** `ai_usage_log`
      row
- [ ] **Given** a valid token for a user with **no household**, **Then** `403`
      `{ error_code: 'no_household' }` (no Anthropic call; a log row is optional here —
      document the choice)
- [ ] **Given** a valid caller, **Then** the pipeline runs in order: verify JWT → resolve
      `profile_id` + `household_id` (server-side, never from the body) → load
      `household_ai_config` (defaults if absent) → **rate-limit**: count `ai_usage_log` rows
      for the household since `date_trunc('day', now() at time zone 'utc')`; if
      `>= daily_call_limit` → `429 { error_code: 'rate_limited' }` + one log row, **no**
      Anthropic call → resolve key: `resolve_ai_key(household_id)`; **null → `409
    { error_code: 'no_api_key' }` + log row**, no Anthropic call (no env-key fallback) →
      validate `model` ∈ allowlist (default
      `ANTHROPIC_MODEL` / `claude-sonnet-5`), `max_tokens` ≤ 4096, combined `system` +
      `messages` size ≤ ~50 KB; any failure → `400 { error_code: 'bad_request' }` + log row →
      `@anthropic-ai/sdk` `messages.create` (non-streaming) → write `ai_usage_log` → respond
- [ ] **Given** a happy path, **Then** `200 { text, model, usage: { input_tokens,
    output_tokens }, latency_ms }` and **exactly one** `ai_usage_log` row with `ok = true`,
      real token counts, and `est_cost_usd` from the in-function per-model rate table
      (`claude-sonnet-5` 2/10, `claude-haiku-4-5` 1/5, `claude-opus-5` 5/25 per MTok)
- [ ] **Given** an Anthropic `5xx` / network error / timeout / `429`, **Then**
      `502 { error_code: 'upstream_error' }` (or `'timeout'`) + one `ai_usage_log` row with
      `ok = false`, the `error_code`, and `latency_ms`
- [ ] **Given** any path, **Then** the response, logs, and `ai_usage_log` **never** contain the
      API key or any prefix of it
- [ ] **Given** `feature`, **Then** it is stored verbatim on the log row (max ~40 chars,
      rejected as `bad_request` if missing/oversized)
- [ ] **Given** Deno tests with a **mocked** Anthropic client, **Then** they cover: happy path,
      `no_household`, `rate_limited` (limit+1), `no_api_key`, `bad_request` (bad model / over
      ceiling / over size), `upstream_error`; and assert the 1:1 log-row invariant on every
      branch

## Technical Notes

- Import the SDK with `import Anthropic from "npm:@anthropic-ai/sdk"`. Non-streaming
  `client.messages.create({ model, max_tokens, system, messages })`. Default `max_tokens`
  when the caller omits it: 1024 (well under the ceiling; callers like Test Connection pass 16).
- Verify the JWT via a Supabase client created with the incoming `Authorization` header, then a
  **separate** service-role client for the config read, the rate-limit count, `resolve_ai_key`,
  and the `ai_usage_log` insert.
- Do the `ai_usage_log` insert in a `finally`-style path so it happens on every outcome
  (success, upstream error, validation error, rate limit). The unauth 401 is the only path
  with no row.
- Map Anthropic SDK errors with the typed classes (`Anthropic.RateLimitError`,
  `Anthropic.APIError`, connection errors) — not string matching (see the `claude-api` skill).
- CORS: allow the app origin(s); handle `OPTIONS`.
- Return shape and `error_code` enum are a **frozen contract** — unit `002-settings-ui` and
  intent `008` both depend on it. Document it at the top of `index.ts` and in the README.

## Dependencies

### Requires

- `001-ai-config-and-usage-tables` — `household_ai_config`, `ai_usage_log`
- `002-household-key-storage-functions` — `resolve_ai_key` (the only key source; no env key)
- Supabase Edge Functions enabled on the project; `ANTHROPIC_MODEL` / `AI_DAILY_CALL_LIMIT`
  secrets (no `ANTHROPIC_API_KEY`)

### Enables

- `004-config-and-standards-docs` — documents this function's env + contract
- Unit `002-settings-ui` — `callClaude` targets this function
- Intent `008-recipe-import` — first real caller

## Edge Cases

| Scenario                                   | Expected Behavior                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Caller passes `household_id` in the body   | Ignored; server-derived id wins                                                         |
| `messages` empty array                     | `bad_request`                                                                           |
| Anthropic returns `stop_reason: 'refusal'` | `200` with `text` (possibly empty) + `ok = true` log row; not treated as an error in v1 |
| `daily_call_limit` changed between calls   | Next call uses the new value (re-read per request)                                      |
| Clock near UTC midnight                    | Window is `date_trunc('day', now() at time zone 'utc')`; document the reset boundary    |
| Very large Anthropic response              | Bounded by `max_tokens` ≤ 4096; no truncation logic needed                              |

## Out of Scope

- Streaming, retries, model fallback, prompt caching, tool use
- Any specific prompt / feature (`connection_test` is just a `feature` tag the caller sets)
- A usage dashboard or aggregate queries
