# `claude-proxy` Edge Function

The app's **only** path to the Anthropic (Claude) API. The SPA never holds an API key — it
POSTs here with the caller's Supabase session token; this function authenticates, resolves the
caller's household, enforces a per-household daily call cap, resolves that household's **own**
Anthropic key from Supabase Vault, calls Claude, meters the attempt in `ai_usage_log`, and
returns a typed result.

Intent `007-claude-integration`, bolt `038-claude-proxy-service`. See
`memory-bank/bolts/037-…` / `038-…` and `adr-004-per-household-anthropic-key-in-vault.md`.
Hardened in intent `008-claude-proxy-review-remediation`, bolts `040`–`041` (fail-closed cap,
atomic `ai_call_counter`, surfaced resolver errors, reachable `timeout`, metering isolation —
see "Hardening" below).

## Contract (frozen — bolt 039 and intent 009 recipe-import build against it)

```
POST /functions/v1/claude-proxy
Authorization: Bearer <supabase access token>          (required)
Content-Type: application/json

body  { feature: string,                                // ≤ 40 chars, e.g. "connection_test"
        system?: string,
        messages: { role: "user"|"assistant", content: string }[],   // non-empty
        model?: "claude-sonnet-5"|"claude-haiku-4-5"|"claude-opus-5",
        max_tokens?: number }                            // 1..4096

200   { text: string, model: string,
        usage: { input_tokens: number, output_tokens: number },
        latency_ms: number }

4xx/5xx { error_code: string, message: string }
```

| `error_code`     | HTTP | Meaning                                                                                                                          | `ai_usage_log` row? |
| ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| _(none)_         | 401  | missing / invalid session token                                                                                                  | **no**              |
| `no_household`   | 403  | authenticated but not in a household                                                                                             | no                  |
| `bad_request`    | 400  | bad JSON, bad/oversized `feature`, empty/invalid `messages`, `model` not allowlisted, `max_tokens` out of 1..4096, input > 50 KB | yes                 |
| `rate_limited`   | 429  | today's reserved calls ≥ `daily_call_limit` (atomic `ai_call_counter` via `reserve_ai_call`)                                     | yes                 |
| `no_api_key`     | 409  | the household has no key set (`/settings` → Claude / AI)                                                                         | yes                 |
| `upstream_error` | 502  | Anthropic 4xx/5xx or network error **— or** a backend-side lookup (household / config / key / cap reserve) failed: fail closed   | yes¹                |
| `timeout`        | 502  | Anthropic call timed out                                                                                                         | yes                 |

**Metering invariant:** every request that resolves a `household_id` writes exactly one
`ai_usage_log` row. Only 401 and `no_household` write nothing.
¹ Exception: a `household_id` that never resolves because `resolveHousehold` itself _errored_
returns `upstream_error` with **no** row (the error is before household resolution, same as
`no_household`).

Input size is bounded (`max_tokens ≤ 4096`, model allowlist, `system + messages ≤ 50 KB`,
`feature ≤ 40`). Non-streaming only in v1. A `stop_reason: "refusal"` is **not** an error — it
returns 200 with whatever `text`.

## Configuration

Set as Supabase secrets (local: `supabase/functions/.env`; prod: `supabase secrets set … --project-ref <ref>`):

| Var                   | Default           | Notes                                                                                                                                                                                                          |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_MODEL`     | `claude-sonnet-5` | must be in the allowlist below                                                                                                                                                                                 |
| `AI_DAILY_CALL_LIMIT` | `25`              | per-household fallback when `household_ai_config` has no row. Must be a positive integer — a missing or non-numeric value (`"25/day"`, `""`) is ignored and the default `25` is used (never `NaN` / "no cap"). |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by the Edge
runtime automatically.

**There is no `ANTHROPIC_API_KEY`.** Keys are per-household: an owner sets one on `/settings`,
stored in Supabase Vault, read only by `resolve_ai_key(uuid)` (service role). See ADR-4. A
household with no key set gets `no_api_key`.

In-code constants (`rates.ts`): allowlist `claude-sonnet-5` / `claude-haiku-4-5` /
`claude-opus-5`; per-model cost rates (2/10, 1/5, 5/25 USD per 1e6 tok); `MAX_TOKENS_CEILING
= 4096`; `DEFAULT_MAX_TOKENS = 1024`; `MAX_INPUT_BYTES = 50_000`; `MAX_FEATURE_LEN = 40`.
`anthropic.ts`: `ANTHROPIC_TIMEOUT_MS = 45_000` and `maxRetries: 0` on the SDK client — one
attempt, hard 45 s ceiling. It **must** stay below the Supabase Edge Function wall-clock limit
(~150 s at time of writing) so a slow call surfaces as `timeout` (502) with its
`ai_usage_log` row before the platform kills the function; re-check against the project's plan
at deploy and drop to ≈ ⅓ of the real limit if it is lower. Retries stay off because the SDK
retries timeouts by default, which would stack multiples of the ceiling onto the wall clock.
If `ANTHROPIC_MODEL` is set to a non-allowlisted value, the resolved model is passed to
Anthropic as-is and will come back as `upstream_error` — keep it in the allowlist.

## Depends on

Migration `20260831130000_ai_config_and_key_vault.sql` (bolt 037):

- `resolve_ai_key(uuid)` — `service_role` only; the single decrypt path.
- `household_ai_config` (`model_override`, `daily_call_limit`) — read.
- `ai_usage_log` — `insert` only (append-only audit; the cap no longer counts it).
- `household_members` — household resolution.

Migration `20260831213000_ai_call_counter.sql` (bolt 040):

- `ai_call_counter (household_id, day, n)` — one row per household per UTC day.
- `reserve_ai_call(uuid, integer)` — `service_role` only; atomically bumps the day's counter
  iff `n < limit`, returns the new count or `NULL` (at/over limit). This is the daily cap.

## Files

| File                | Role                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`          | HTTP entry — CORS, `Deno.serve`, builds the real `Deps` (Supabase clients, `callAnthropic`), calls `handleProxy`                               |
| `pipeline.ts`       | `handleProxy(rawBody, authHeader, deps)` — the testable pipeline; pure over `Deps`                                                             |
| `anthropic.ts`      | `callAnthropic(...)` — one non-streaming `messages.create` (45 s timeout, no retries); `mapAnthropicError()` maps SDK errors to `ProxyFailure` |
| `rates.ts`          | allowlist, cost rates, limits, `estCostUsd`, `parsePositiveInt`                                                                                |
| `errors.ts`         | `ProxyFailure` + the `ErrorCode` union                                                                                                         |
| `cors.ts`           | `corsHeaders(origin)` — localhost / `*.netlify.app` / prod                                                                                     |
| `index.test.ts`     | Deno tests — pipeline over stubbed `Deps`; every branch + the metering invariant                                                               |
| `anthropic.test.ts` | Deno tests — `mapAnthropicError` (the `timeout` branch)                                                                                        |
| `deno.json`         | pins `@anthropic-ai/sdk` + `@supabase/supabase-js`; `deno task test`                                                                           |

## Test

```
cd supabase/functions/claude-proxy && deno task test        # 33 tests, no network / DB
deno check index.ts                                          # full type-check
supabase test db                                             # pgTAP incl. ai_call_counter_test.sql
```

The non-Anthropic branches (401, `no_household`, `rate_limited`, `no_api_key`, `bad_request`)
can also be exercised end-to-end with `supabase functions serve claude-proxy` + `curl` and a
test household — no real API key needed.

## Hardening (intent 008, bolts 040–041)

Corrections to the `007` implementation, from a code review. No contract change.

- **Fail closed.** A failed usage/household/config/key lookup, or a non-numeric
  `AI_DAILY_CALL_LIMIT`, now returns `upstream_error` (502) instead of silently proceeding as
  "0 calls used" / "no cap" / "no household" / "no key". The `Deps` lookups return
  `{ data, error }` and `handleProxy` checks `error` first.
- **Atomic cap.** The cap was `count(*) ai_usage_log < limit` then insert-much-later — not
  atomic (concurrent requests all passed) and every logged row counted (invalid-request
  floods consumed it). Replaced by `reserve_ai_call()` — a single `INSERT … ON CONFLICT DO
UPDATE … WHERE n < limit` against `ai_call_counter`. The counter is bumped only immediately
  before a real Anthropic attempt, so `bad_request` / `no_api_key` / `rate_limited` never
  consume it.
- **Ordering.** The key check runs before the cap reserve, so a `no_api_key` attempt never
  advances the counter. Consequence: over-limit _and_ no key ⇒ `409 no_api_key` (was `429`).
- If the function dies between `reserve_ai_call` and the Anthropic call, the household loses
  one slot for the day. Fail-safe (never overspends); not compensated in v1.
- **Reachable `timeout`** (bolt 041). The SDK client had no `timeout`, so the ~10-min default
  outlived the Edge Function budget and `timeout` was never returned (and no row written).
  Now `ANTHROPIC_TIMEOUT_MS = 45_000` + `maxRetries: 0`; the SDK-error → `ProxyFailure`
  mapping is the pure, tested `mapAnthropicError()`.
- **Metering isolation** (bolt 041). The success-path `ai_usage_log` write was inside the
  `catch`-to-`upstream_error` scope, so a metering failure after a billed call returned `502`
  with no row. It is now in its own `try/catch` — a failure is `console.error`-logged and the
  call still returns `200`. This is the one documented exception to the one-row invariant.

## Deploy

```
# local
cp supabase/functions/.env.example supabase/functions/.env      # ANTHROPIC_MODEL, AI_DAILY_CALL_LIMIT
supabase functions serve claude-proxy

# prod
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5 AI_DAILY_CALL_LIMIT=25 --project-ref <ref>
supabase functions deploy claude-proxy --project-ref <ref>
```

Real Claude calls are exercised only once a household sets a key on `/settings`. Bump
`@anthropic-ai/sdk` in `deno.json` deliberately (check `messages.create` shape stability).
