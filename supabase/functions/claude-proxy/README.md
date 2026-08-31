# `claude-proxy` Edge Function

The app's **only** path to the Anthropic (Claude) API. The SPA never holds an API key — it
POSTs here with the caller's Supabase session token; this function authenticates, resolves the
caller's household, enforces a per-household daily call cap, resolves that household's **own**
Anthropic key from Supabase Vault, calls Claude, meters the attempt in `ai_usage_log`, and
returns a typed result.

Intent `007-claude-integration`, bolt `038-claude-proxy-service`. See
`memory-bank/bolts/037-…` / `038-…` and `adr-004-per-household-anthropic-key-in-vault.md`.

## Contract (frozen — bolt 039 and intent 008 build against it)

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
| `rate_limited`   | 429  | `count(today) >= daily_call_limit`                                                                                               | yes                 |
| `no_api_key`     | 409  | the household has no key set (`/settings` → Claude / AI)                                                                         | yes                 |
| `upstream_error` | 502  | Anthropic 4xx/5xx or network error                                                                                               | yes                 |
| `timeout`        | 502  | Anthropic call timed out                                                                                                         | yes                 |

**Metering invariant:** every request that resolves a `household_id` writes exactly one
`ai_usage_log` row. Only 401 and `no_household` write nothing.

Input size is bounded (`max_tokens ≤ 4096`, model allowlist, `system + messages ≤ 50 KB`,
`feature ≤ 40`). Non-streaming only in v1. A `stop_reason: "refusal"` is **not** an error — it
returns 200 with whatever `text`.

## Configuration

Set as Supabase secrets (local: `supabase/functions/.env`; prod: `supabase secrets set … --project-ref <ref>`):

| Var                   | Default           | Notes                                                        |
| --------------------- | ----------------- | ------------------------------------------------------------ |
| `ANTHROPIC_MODEL`     | `claude-sonnet-5` | must be in the allowlist below                               |
| `AI_DAILY_CALL_LIMIT` | `25`              | per-household fallback when `household_ai_config` has no row |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by the Edge
runtime automatically.

**There is no `ANTHROPIC_API_KEY`.** Keys are per-household: an owner sets one on `/settings`,
stored in Supabase Vault, read only by `resolve_ai_key(uuid)` (service role). See ADR-4. A
household with no key set gets `no_api_key`.

In-code constants (`rates.ts`): allowlist `claude-sonnet-5` / `claude-haiku-4-5` /
`claude-opus-5`; per-model cost rates (2/10, 1/5, 5/25 USD per 1e6 tok); `MAX_TOKENS_CEILING
= 4096`; `DEFAULT_MAX_TOKENS = 1024`; `MAX_INPUT_BYTES = 50_000`; `MAX_FEATURE_LEN = 40`.
If `ANTHROPIC_MODEL` is set to a non-allowlisted value, the resolved model is passed to
Anthropic as-is and will come back as `upstream_error` — keep it in the allowlist.

## Depends on (migration `20260831130000_ai_config_and_key_vault.sql`, bolt 037)

- `resolve_ai_key(uuid)` — `service_role` only; the single decrypt path.
- `household_ai_config` (`model_override`, `daily_call_limit`) — read.
- `ai_usage_log` — `count` (via `idx_ai_usage_log_household_created`) + `insert`.
- `household_members` — household resolution.

## Files

| File            | Role                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `index.ts`      | HTTP entry — CORS, `Deno.serve`, builds the real `Deps` (Supabase clients, `callAnthropic`), calls `handleProxy` |
| `pipeline.ts`   | `handleProxy(rawBody, authHeader, deps)` — the testable pipeline; pure over `Deps`                               |
| `anthropic.ts`  | `callAnthropic(...)` — one non-streaming `messages.create`; maps SDK errors to `ProxyFailure`                    |
| `rates.ts`      | allowlist, cost rates, limits, `estCostUsd`                                                                      |
| `errors.ts`     | `ProxyFailure` + the `ErrorCode` union                                                                           |
| `cors.ts`       | `corsHeaders(origin)` — localhost / `*.netlify.app` / prod                                                       |
| `index.test.ts` | Deno tests — mocked Anthropic + fake Supabase; covers every branch + the metering invariant                      |
| `deno.json`     | pins `@anthropic-ai/sdk` + `@supabase/supabase-js`; `deno task test`                                             |

## Test

```
cd supabase/functions/claude-proxy && deno task test        # 13 tests, no network / DB
deno check index.ts                                          # full type-check
```

The non-Anthropic branches (401, `no_household`, `rate_limited`, `no_api_key`, `bad_request`)
can also be exercised end-to-end with `supabase functions serve claude-proxy` + `curl` and a
test household — no real API key needed.

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
