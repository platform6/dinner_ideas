---
stage: model
bolt: 038-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T18:10:00Z'
---

## Static Model: claude-proxy-service (bolt 038 — the proxy pipeline)

**Second bolt of unit `001-claude-proxy-service`.** Bolt 037 modelled the persistent domain
(config, usage log, key vault). Bolt 038 is the **application / integration layer** — a single
Supabase Edge Function (`claude-proxy`) that turns a browser request into a metered, key-safe
Anthropic call. The rich domain objects it uses (`HouseholdAiConfig`, `AiUsageLogEntry`,
`resolve_ai_key`) are bolt 037's; this model captures the **contract, the pipeline, and the
error taxonomy** that are 038's ubiquitous language.

### Bounded Context

Still the **AI Access** context. 038 owns the _behaviour_ at the edge: authenticate → resolve
household → rate-limit → resolve key → validate → call Anthropic → meter → respond. It holds
the API key only in memory, only for the duration of one request.

### Entities / Data Shapes

| Shape                         | Fields                                                                                                                                   | Notes                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **ProxyRequest**              | `feature: string`, `system?: string`, `messages: {role:'user'\|'assistant', content:string}[]`, `model?: ModelId`, `max_tokens?: number` | The POST body. `household_id` is **never** in it — derived server-side. Frozen contract (bolt 039 + intent 008 depend on it). |
| **ProxySuccess** (HTTP 200)   | `text: string`, `model: string`, `usage: {input_tokens:number, output_tokens:number}`, `latency_ms: number`                              |                                                                                                                               |
| **ProxyError** (HTTP 4xx/5xx) | `error_code: ErrorCode`, `message: string`                                                                                               |                                                                                                                               |
| **CallContext**               | `profile_id`, `household_id`, `config: HouseholdAiConfig` (or defaults)                                                                  | Built by the pipeline before any Anthropic call.                                                                              |
| **UsageRecord**               | a row for `ai_usage_log` (bolt 037)                                                                                                      | Written on **every** attempt except unauthenticated 401.                                                                      |

### Value Objects

| Value Object         | Representation                                                                                       | Constraints                                                                                                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ErrorCode**        | `'no_household' \| 'no_api_key' \| 'rate_limited' \| 'bad_request' \| 'upstream_error' \| 'timeout'` | Closed set, enforced here (bolt 037's `ai_usage_log.error_code` is loose text). Maps to HTTP: `no_household`→403, `no_api_key`→409, `rate_limited`→429, `bad_request`→400, `upstream_error`/`timeout`→502. Unauthenticated → 401 with no `error_code` body and **no** log row. |
| **ModelId**          | `'claude-sonnet-5' \| 'claude-haiku-4-5' \| 'claude-opus-5'`                                         | The allowlist. Default (caller omits `model`, or config `model_override` is null) = `ANTHROPIC_MODEL` env, itself defaulting to `claude-sonnet-5`. A non-allowlisted `model` → `bad_request`.                                                                                  |
| **CostRate**         | `{ input: number, output: number }` USD per 1e6 tokens, keyed by `ModelId`                           | `sonnet-5`: 2 / 10 · `haiku-4-5`: 1 / 5 · `opus-5`: 5 / 25. `est_cost_usd = round(in/1e6·rate.input + out/1e6·rate.output, 6)`.                                                                                                                                                |
| **DailyWindow**      | `>= date_trunc('day', now() at time zone 'utc')`                                                     | The rate-limit counting boundary. Reset at UTC midnight.                                                                                                                                                                                                                       |
| **Limits** (in code) | `MAX_TOKENS_CEILING = 4096`, `MAX_INPUT_BYTES ≈ 50_000` (system + messages), `MAX_FEATURE_LEN = 40`  | Server-enforced; violations → `bad_request`.                                                                                                                                                                                                                                   |

### Aggregates

- **The request pipeline** is the transactional unit of behaviour. Invariant: **every entry
  path except the 401 writes exactly one `ai_usage_log` row** (`UsageRecord`) — success,
  validation failure, rate-limit, no-key, and upstream failure all record. Enforced by writing
  the row in a `finally`-style block keyed on "we got past auth + household resolution".
- No new persistent aggregate — 038 reads `HouseholdAiConfig`, appends to `AiUsageLog`
  (bolt 037's aggregates), and calls Anthropic.

### Domain Events

_Markers only._

- **ProxyCallAttempted** → **ProxyCallSucceeded** / **ProxyCallRejected(ErrorCode)** — each
  terminal state writes a `UsageRecord` (except unauthenticated).
- **AiCallMetered** (from bolt 037's model) — the `ai_usage_log` insert; here it is the
  guaranteed side effect of every attempt.

### Domain Services (function-internal modules)

| Service              | Operation                                                                                                                                                                     | Depends on                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Authenticator**    | verify the caller's JWT → `profile_id`; resolve `household_id` (+ `role`, unused here)                                                                                        | Supabase auth (anon-key client with the caller's `Authorization`); `household_members` |
| **ConfigLoader**     | `household_id → HouseholdAiConfig` (row or all-defaults)                                                                                                                      | service-role client, `household_ai_config`                                             |
| **RateLimiter**      | `count(ai_usage_log where household_id=? and created_at >= DailyWindow) >= config.daily_call_limit` → allow / deny                                                            | service-role client, `ai_usage_log` + its index                                        |
| **KeyResolver**      | `resolve_ai_key(household_id) → string \| null`; null → `no_api_key`                                                                                                          | service-role client, bolt 037's `resolve_ai_key`                                       |
| **RequestValidator** | `feature` present & ≤ 40; `messages` non-empty & well-typed; `model ∈ allowlist`; `max_tokens ≤ 4096`; `byteLength(system + messages) ≤ MAX_INPUT_BYTES` → ok / `bad_request` | —                                                                                      |
| **AnthropicCaller**  | `messages.create({ model, max_tokens, system, messages })` (non-streaming); map SDK errors → `upstream_error` / `timeout`                                                     | `@anthropic-ai/sdk` (Deno `npm:` import); the resolved key                             |
| **UsageMeter**       | compute `est_cost_usd` from `CostRate`; `insert into ai_usage_log (...)`                                                                                                      | service-role client                                                                    |

### Repository Interfaces

- **ClaudeProxyApi** (the HTTP surface): `POST /functions/v1/claude-proxy` — `ProxyRequest` +
  `Authorization: Bearer <supabase access token>` → `ProxySuccess | ProxyError`. `OPTIONS`
  handled for CORS.
- Consumed by **bolt 039**'s `callClaude` and (later) **intent 008**.

### Ubiquitous Language

| Term                         | Definition                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Proxy call**               | One `POST` to `claude-proxy`. Always authenticated, rate-limited, and metered.                                                                                                                                     |
| **Attempt**                  | Any proxy call that got past authentication — it produces exactly one `ai_usage_log` row regardless of outcome.                                                                                                    |
| **Frozen contract**          | The `ProxyRequest` / `ProxySuccess` / `ProxyError` shapes + the `ErrorCode` set. Documented in `index.ts` and the README; bolt 039 and intent 008 build against it and must not require changes to it.             |
| **Server-derived household** | `household_id` is resolved from the JWT inside the function; a value in the request body is ignored.                                                                                                               |
| **All-defaults config**      | A household with no `household_ai_config` row → `{ model_override: null, daily_call_limit: 25 (env default), key_secret_id: null }`. Reached via `left join` / `maybeSingle` + coalesce, not a first-touch insert. |

### Relevant Prior Decisions

- **ADR-1** — invariants live server-side; the "every attempt is metered" rule and the
  owner/household resolution are enforced in the function + RLS, never trusted from the client.
- **ADR-4** — the key is read only via `resolve_ai_key` (service role); the function holds **no
  env key** and no shared key. `no_api_key` is a first-class terminal state, not an error to
  hide.
- No new ADR: the pipeline is a straightforward request handler; the one notable choice
  (metering via the function, not a Postgres trigger) is already explained in bolt 037's
  domain model (ADR-2 does not apply — the trigger would be on an outbound HTTP call).

### Stories covered

- **003-claude-proxy-edge-function** → the whole pipeline, `ErrorCode`, `CostRate`, the
  metering invariant, the frozen contract; Deno tests with a mocked `AnthropicCaller`.
- **004-config-and-standards-docs** → the README (env, allowlist, ceiling, contract) and the
  `system-architecture.md` / `tech-stack.md` / `decision-index.md` updates.
