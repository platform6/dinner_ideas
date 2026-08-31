---
stage: design
bolt: 038-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T18:15:00Z'
---

## Technical Design: claude-proxy-service (bolt 038)

### Architecture Pattern

A single **Supabase Edge Function** (Deno, `deno_version = 2` per `config.toml`) — the
project's first server-side code. Stateless request handler. No framework; a hand-rolled
pipeline with small pure helpers so the Anthropic client and the Supabase clients are
injectable for the Deno tests.

### Layer Structure

```text
supabase/functions/claude-proxy/
├── index.ts        entry: CORS/OPTIONS, parse, run pipeline, shape response
├── pipeline.ts     handleProxy(req, deps) → { status, body }   (the testable core)
├── anthropic.ts    callAnthropic(key, model, maxTokens, system, messages) → { text, usage } | throws ProxyFailure
├── rates.ts        MODEL_RATES, ALLOWLIST, estCostUsd(), DEFAULTS
├── errors.ts       ProxyFailure(code, message, httpStatus), ERROR_HTTP map
├── cors.ts         corsHeaders(origin)
├── index.test.ts   Deno tests — mocked Anthropic + fake Supabase clients
├── deno.json       import map / lint config for this function
└── README.md       env, allowlist, ceiling, contract, error_code enum, deploy
```

`index.ts` is a thin shell; `pipeline.ts::handleProxy` takes a `deps` object
(`{ getUser, loadConfig, countToday, resolveKey, callAnthropic, insertUsage, now }`) so every
branch is unit-testable without network or a database.

### API Contract (frozen)

```
POST /functions/v1/claude-proxy
Authorization: Bearer <supabase access token>        (required)
Content-Type: application/json

Request:  { feature: string, system?: string,
            messages: { role: 'user'|'assistant', content: string }[],
            model?: 'claude-sonnet-5'|'claude-haiku-4-5'|'claude-opus-5',
            max_tokens?: number }

200:      { text: string, model: string,
            usage: { input_tokens: number, output_tokens: number },
            latency_ms: number }

4xx/5xx:  { error_code: string, message: string }
```

| `error_code`     | HTTP | When                                                                                                                  | Log row?                       |
| ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| _(none)_         | 401  | missing / invalid JWT                                                                                                 | **no**                         |
| `no_household`   | 403  | authenticated but not in a household                                                                                  | no (nothing to scope a row to) |
| `bad_request`    | 400  | bad JSON, missing/oversized `feature`, empty `messages`, `model` not allowlisted, `max_tokens > 4096`, input > ~50 KB | **yes**                        |
| `rate_limited`   | 429  | `count(today) >= daily_call_limit`                                                                                    | **yes**                        |
| `no_api_key`     | 409  | `resolve_ai_key` returned null                                                                                        | **yes**                        |
| `upstream_error` | 502  | Anthropic 4xx/5xx or network error                                                                                    | **yes**                        |
| `timeout`        | 502  | Anthropic call timed out                                                                                              | **yes**                        |

**Metering invariant**: any request that resolves a `household_id` writes exactly one
`ai_usage_log` row. 401 and `no_household` are the only paths with no row.

### Pipeline (`handleProxy`)

1. `OPTIONS` → 204 + CORS. Non-`POST` → 405.
2. Parse JSON body; unparseable → `bad_request` (no household yet → no row; documented
   exception — we log only after household resolution).
3. `deps.getUser(authHeader)` → `profile_id` or 401.
4. Resolve `household_id` from `household_members` (service-role) → none → `403 no_household`.
5. From here every terminal path calls `deps.insertUsage(record)` exactly once (a
   `try/finally`-style `logged` guard).
6. `deps.loadConfig(household_id)` → row or `{ model_override: null, daily_call_limit:
Number(env.AI_DAILY_CALL_LIMIT ?? 25) }`.
7. **Rate limit**: `deps.countToday(household_id)` `>= config.daily_call_limit` →
   `429 rate_limited`.
8. **Validate** (`rates.ts` + `pipeline.ts`): `feature` (1..40 chars), `messages` non-empty &
   each `{role in [user,assistant], content: non-empty string}`, `model` (if present) in
   `ALLOWLIST`, `max_tokens` (if present) `1..4096`, `byteLength(system ?? '') +
Σ byteLength(content) <= 50_000` → else `400 bad_request`.
9. **Resolve key**: `deps.resolveKey(household_id)` → null → `409 no_api_key`.
10. `model = req.model ?? config.model_override ?? env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'`;
    `maxTokens = req.max_tokens ?? 1024`.
11. `deps.callAnthropic(key, model, maxTokens, system, messages)` →
    - success `{ text, usage }` → `est_cost_usd = estCostUsd(model, usage)`; write row
      `ok=true`; return 200.
    - `ProxyFailure('upstream_error' | 'timeout')` → write row `ok=false`; return 502.
12. `latency_ms` = `deps.now() - t0` on every terminal path; included in the row and (on
    success) the response.

### `anthropic.ts`

```ts
import Anthropic from 'npm:@anthropic-ai/sdk@^0.65'; // pinned in deno.json; see README

export async function callAnthropic(key, model, maxTokens, system, messages) {
  const client = new Anthropic({ apiKey: key, maxRetries: 1 });
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    }); // non-streaming (v1 — no streaming, per requirements)
    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return { text, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens } };
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError)
      throw new ProxyFailure('timeout', 'Claude request timed out', 502);
    // RateLimitError, APIError (4xx/5xx), APIConnectionError → upstream_error
    throw new ProxyFailure('upstream_error', 'Claude upstream error', 502);
  }
}
```

- Typed SDK error classes, not string matching (per the `claude-api` skill).
- `stop_reason: 'refusal'` is **not** an error in v1 — a refusal returns 200 with whatever
  `text` (possibly empty) and `ok=true`.
- Non-streaming `messages.create`. `max_tokens` default 1024 keeps a non-streaming call under
  the SDK's HTTP timeout.

### Supabase clients

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
const authed = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
}); // getUser only
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
the Edge runtime. `service` runs `household_members` lookup, `household_ai_config` read,
`ai_usage_log` count + insert, and `rpc('resolve_ai_key', { p_household_id })`.

### Configuration (`env`, Supabase secrets)

| Var                        | Default           | Notes                                                                                      |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `ANTHROPIC_MODEL`          | `claude-sonnet-5` | must be in `ALLOWLIST` or the function 500s at first use with a clear message (documented) |
| `AI_DAILY_CALL_LIMIT`      | `25`              | per-household fallback when `household_ai_config` has no row                               |
| _(no `ANTHROPIC_API_KEY`)_ | —                 | keys are per-household (ADR-4)                                                             |

In-code constants: `ALLOWLIST`, `MODEL_RATES`, `MAX_TOKENS_CEILING = 4096`,
`MAX_INPUT_BYTES = 50_000`, `MAX_FEATURE_LEN = 40`, `DEFAULT_MAX_TOKENS = 1024`.

### Security Design

| Concern                           | Approach                                                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key exposure                      | Key obtained via `resolve_ai_key` (service role), held in a local `const`, passed to the Anthropic client, never logged / returned / put in the `ai_usage_log` row.                                         |
| Caller spoofing another household | `household_id` derived from the verified JWT; request-body `household_id` (if any) ignored.                                                                                                                 |
| Unauthenticated abuse             | 401 before any DB or Anthropic work; no log row.                                                                                                                                                            |
| CORS                              | `Access-Control-Allow-Origin` = the request `Origin` if it matches an allowlist (`http://localhost:*`, the Netlify prod + preview domains); `Authorization, Content-Type` allowed headers; `POST, OPTIONS`. |
| Oversized / malformed input       | `bad_request` before the Anthropic call — bounded `max_tokens`, model allowlist, input byte cap.                                                                                                            |

### NFR Implementation

| Requirement               | Design                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Overhead < ~150 ms        | 1 `getUser` + 1 membership select + 1 config select + 1 count (indexed) + 1 insert; no N+1  |
| Rate-limit count cheap    | uses `idx_ai_usage_log_household_created` (bolt 037)                                        |
| Graceful upstream failure | all Anthropic paths caught → typed `ProxyFailure` → 502 + log row; never an unhandled throw |
| No streaming (v1)         | `messages.create` non-streaming; `DEFAULT_MAX_TOKENS = 1024` avoids HTTP timeouts           |

### Tests — `index.test.ts` (Deno)

`handleProxy` is called directly with a `deps` object of fakes. Cases:

1. no `Authorization` → 401, `insertUsage` **not** called
2. `getUser` returns null → 401
3. authed, no membership row → 403 `no_household`, `insertUsage` not called
4. happy path → 200 `{ text, model, usage, latency_ms }`; **one** `insertUsage` with
   `ok=true`, token counts from the mock, `est_cost_usd` = expected
5. `countToday` >= limit → 429 `rate_limited`; one `insertUsage` `ok=false`,
   `error_code='rate_limited'`; `callAnthropic` **not** called
6. `resolveKey` → null → 409 `no_api_key`; one `insertUsage` `ok=false`
7. bad model → 400 `bad_request`; `max_tokens` 99999 → 400; empty `messages` → 400;
   `feature` '' → 400; input > 50 KB → 400 — each with one `ok=false` log row
8. `callAnthropic` throws `ProxyFailure('upstream_error')` → 502; one `ok=false` row
9. `callAnthropic` throws `ProxyFailure('timeout')` → 502 `timeout`
10. model resolution: req.model → config.model_override → env → `claude-sonnet-5`
11. `estCostUsd` unit test for all three models

**Execution**: `deno test --allow-env supabase/functions/claude-proxy/` — `deno` is **not on
this machine**; the tests are written and committed but not run here (see `ddd-03`). CI / a
local `deno` install runs them. The non-Anthropic branches (1–3, 5–7) are also verifiable via
`supabase functions serve` + `curl` without any API key.

### Integration Points

- **bolt 037**: `resolve_ai_key` (rpc), `household_ai_config` (read), `ai_usage_log`
  (count + insert), `household_members` (read).
- **Anthropic API**: `messages.create` — exercised only with a real household key
  (deploy-time; the project owner adds their key as the acceptance test).
- **bolt 039**: `callClaude` targets this contract.

### Deployment (story 004 / README)

```
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5 AI_DAILY_CALL_LIMIT=25   # --project-ref for prod
supabase functions deploy claude-proxy                                        # --project-ref for prod
```

`supabase functions deploy` is a first for this project — **not run here** (blocked / needs
prod credentials). Listed as a follow-up.

### Deviations from Domain Model

None. `handleProxy(req, deps)` is the "request pipeline aggregate" made testable; the seven
domain services map 1:1 to `deps` members.
