---
intent: 007-claude-integration
phase: inception
status: complete
created: '2026-08-31T16:00:00Z'
updated: '2026-08-31T17:15:00Z'
approved: '2026-08-31T16:30:00Z (Checkpoint 2); revised + re-approved at Checkpoint 3 — per-household key only'
---

# Requirements: claude-integration

## Intent Overview

Introduce the Anthropic (Claude) API into the project as a **shared, secured integration
layer** — a server-side call path that later AI features (recipe import by URL first, then
others) build on without re-solving auth, key management, rate limiting, or metering.

This intent ships the plumbing plus one thin proof surface (a **Test Connection** control on a
new minimal `/settings` page). It ships **no AI product feature** — recipe import is the next
intent and will simply add a new caller of this layer.

### Why a server-side layer at all

The app is a static SPA (Vite/React) served by Netlify with Supabase as its only backend. An
Anthropic API key is a secret and cannot live in the browser bundle. Every Claude call
therefore goes through a **Supabase Edge Function** (`claude-proxy`, Deno/TypeScript) that:

1. authenticates the caller with their Supabase JWT and resolves their household,
2. resolves the household's own Anthropic key from Supabase Vault (no key set → `no_api_key`),
3. enforces a per-household daily call cap,
4. makes the Claude call with the official `@anthropic-ai/sdk`, default model
   `claude-sonnet-5`, non-streaming,
5. writes one `ai_usage_log` row per attempt (tokens + estimated cost),
6. returns a typed `{ text, usage, model }` (or a typed error).

### Key model (decided at Checkpoint 1, refined at Checkpoint 3)

**Per-household key only — no shared project key.** Each household's **owner** supplies an
Anthropic key on the settings page; AI is unavailable for a household until they do.
`resolve_key(household_id)`:

| Order | Source                                  | Notes                                                                                |
| ----- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 1     | per-household key in Supabase **Vault** | set write-only by a household **owner** on `/settings`; never returned to any client |
| 2     | none → typed `no_api_key` error         | UI: "Add your household's Claude API key in Settings"                                |

There is **no** shared/founding `ANTHROPIC_API_KEY` and no fallback to one. (During the bolt-038
spike a developer may use a throwaway env key locally to prove the Anthropic call works, but the
shipped function has no env-key code path.)

### Reuse contract

Intent 008 (recipe import) adds a **new caller** of `claude-proxy` and a new prompt; it does
**not** modify the proxy's auth, key-resolution, rate-limit, or logging code. If it has to,
this intent under-delivered.

---

## Business Goals

| Goal                                                                      | Success Metric                                                                                                                                   | Priority |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| An owner can enable Claude for their household by supplying their own key | Owner pastes a key on `/settings`; **Test Connection** then performs a real round-trip and shows OK + latency; a non-owner cannot set or read it | Must     |
| No Anthropic key material is ever retrievable by the browser              | Key values live only in Supabase Vault; no table column, API response, or bundle contains a key; code + RLS review confirms                      | Must     |
| A household with no key gets a clear, non-broken state                    | `claude-proxy` returns `no_api_key`; the UI says "Add your household's Claude API key in Settings" (no crash, no stack trace)                    | Must     |
| A household cannot exceed its daily call budget                           | The (limit+1)-th call in a day returns HTTP 429 `rate_limited` and is logged; counter resets at UTC midnight                                     | Must     |
| Every call attempt is metered                                             | Exactly one `ai_usage_log` row per attempt (success _or_ failure) with model, token counts, and estimated USD cost                               | Must     |
| The layer is reusable without change                                      | Intent 008 adds a caller + prompt only; `claude-proxy` auth/key/limit/log code is untouched                                                      | Must     |

---

## Functional Requirements

### FR-1: `household_ai_config` table

- **Description**: One row per household holding **non-secret** AI settings:
  - `household_id uuid primary key references households(id) on delete cascade`
  - `model_override text` — null = use the server default (`claude-sonnet-5`); when set, must
    be in the model allowlist (FR-9)
  - `daily_call_limit int not null default 25` — per-household cap; overrides the env default
  - `key_secret_id uuid` — reference into Supabase Vault for this household's key; null = no
    key set → AI is unavailable for the household (`no_api_key`)
  - `updated_at timestamptz not null default now()`, `updated_by uuid references profiles(id)`
- **Acceptance Criteria**:
  - Table created with RLS enabled.
  - A row is auto-created (defaults) on first read/write for a household, or a `left join` +
    coalesce is used so a missing row behaves as "all defaults". (Implementation choice;
    either is acceptable.)
  - `model_override`, when non-null, is constrained to the allowlist (check constraint or
    trigger).
- **Priority**: Must

### FR-2: Per-household API key storage (Vault)

- **Description**: The **only** way Claude is enabled for a household: an owner stores an
  Anthropic key. The plaintext key is written to **Supabase Vault** (`vault.create_secret` /
  `vault.update_secret`), and only its secret id is recorded in
  `household_ai_config.key_secret_id`. The key is **write-only from the client**: the settings
  API accepts "set key" / "clear key" but never returns the key or any prefix of it — only a
  boolean "key is set".
- **Acceptance Criteria**:
  - Setting a key stores it in Vault and points `key_secret_id` at it; the value is not
    present in `household_ai_config`, any view the client can read, or any API response.
  - Clearing a key removes the Vault secret and nulls `key_secret_id`.
  - Only a household **owner** can set or clear the key (enforced server-side, not just UI).
  - The Edge Function (service role) can read the decrypted key; `authenticated` / `anon`
    cannot select from `vault.decrypted_secrets`.
  - With no key set, `claude-proxy` returns `no_api_key` — never a crash.
- **Priority**: Must _(there is no shared key; without this, no household can use Claude at all)_

### FR-3: `ai_usage_log` table

- **Description**: Append-only audit trail, one row per Claude call attempt:
  - `id uuid primary key default gen_random_uuid()`
  - `household_id uuid not null references households(id) on delete cascade`
  - `profile_id uuid references profiles(id)` — the caller
  - `created_at timestamptz not null default now()`
  - `feature text not null` — free-text tag from the caller (e.g. `'connection_test'`,
    later `'recipe_import'`)
  - `model text not null`
  - `input_tokens int`, `output_tokens int`
  - `est_cost_usd numeric(10,6)`
  - `ok boolean not null`
  - `error_code text` — null on success; one of a small enum on failure
    (`rate_limited`, `no_api_key`, `upstream_error`, `timeout`, `bad_request`)
  - `latency_ms int`
- **Acceptance Criteria**:
  - RLS: members of the household may `select` their household's rows; **no** client
    `insert` / `update` / `delete` policy exists (written only by the Edge Function via
    service role — same immutability pattern as `meal_history`).
  - Index on `(household_id, created_at)`.
- **Priority**: Must

### FR-4: `claude-proxy` Edge Function

- **Description**: A Supabase Edge Function (Deno/TypeScript) at
  `supabase/functions/claude-proxy/`. Request/response contract:
  - **Request** (`POST`, JSON):
    `{ feature: string, system?: string, messages: {role:'user'|'assistant', content:string}[], model?: string, max_tokens?: number }`
  - **Response** (200): `{ text: string, model: string, usage: { input_tokens, output_tokens }, latency_ms }`
  - **Error** (4xx/5xx): `{ error_code: string, message: string }` with `error_code` from the
    FR-3 enum.
  - Pipeline: verify Supabase JWT (`Authorization: Bearer`) → resolve `profile_id` and
    `household_id` (reject `no household` → 403) → load `household_ai_config` (defaults if
    absent) → **rate-limit check** (FR-5) → `resolve_ai_key(household_id)`; **null → 409
    `no_api_key`** (+ log row), no Anthropic call → validate `model` ∈ allowlist (default
    `claude-sonnet-5`) and `max_tokens` ≤ ceiling (FR-9) and total input size ≤ limit → call
    Anthropic via `@anthropic-ai/sdk` (non-streaming) → on any outcome, **write `ai_usage_log`**
    (FR-6) → return typed result.
- **Acceptance Criteria**:
  - Unauthenticated request → 401, no Anthropic call, no log row.
  - Authenticated user with no household → 403 `no_household`.
  - Household with no key set → 409 `no_api_key`, no Anthropic call, one log row `ok=false`.
  - Happy path → 200 with `text` + real `usage`; exactly one `ai_usage_log` row with `ok=true`.
  - `model` not in allowlist, or `max_tokens` over ceiling → 400 `bad_request`, logged
    `ok=false`.
  - Anthropic 5xx / network error → 502 `upstream_error`, logged `ok=false`; Anthropic 429 →
    502 `upstream_error` (distinct from our own `rate_limited`).
  - The function never logs, returns, or otherwise emits the API key.
- **Priority**: Must

### FR-5: Per-household daily rate limit

- **Description**: Before calling Anthropic, the function counts the household's
  `ai_usage_log` rows since `date_trunc('day', now() at time zone 'utc')`. If
  `count >= daily_call_limit` (from `household_ai_config`, default from env
  `AI_DAILY_CALL_LIMIT` = 25), it returns **429 `rate_limited`** without calling Anthropic and
  writes an `ai_usage_log` row with `ok=false, error_code='rate_limited'`.
- **Acceptance Criteria**:
  - With `daily_call_limit = N`, calls 1..N succeed (upstream permitting), call N+1 returns
    429 `rate_limited`.
  - The 429 path still writes exactly one log row (so repeated hammering is itself visible).
  - Changing `household_ai_config.daily_call_limit` takes effect on the next call with no
    deploy.
- **Priority**: Must

### FR-6: Usage + cost logging

- **Description**: Every attempt writes one `ai_usage_log` row. On success, `input_tokens` /
  `output_tokens` come from the Anthropic response `usage`; `est_cost_usd` is computed from a
  per-model rate table embedded in the function
  (`claude-sonnet-5`: $2 / $10 per M in/out; `claude-haiku-4-5`: $1 / $5;
  `claude-opus-5`: $5 / $25). On failure before the call, token fields are null and
  `est_cost_usd` is 0.
- **Acceptance Criteria**:
  - Success row: token counts match the Anthropic response; `est_cost_usd` = rounded
    `(in/1e6)*rate_in + (out/1e6)*rate_out`.
  - Failure row: `ok=false`, `error_code` set, `latency_ms` recorded, token fields null (or
    partial if upstream returned usage).
  - The rate table lists every allowlisted model.
- **Priority**: Must

### FR-7: Frontend AI client

- **Description**: `src/features/ai/api.ts` — a small typed client:
  `callClaude({ feature, system?, messages, model?, maxTokens? })` that POSTs to the
  `claude-proxy` function with the current Supabase session's access token, parses the typed
  response, and throws a typed `ClaudeError` (carrying `error_code`) on non-200. No retries in
  v1.
- **Acceptance Criteria**:
  - Sends `Authorization: Bearer <session access_token>`; no key handling on the client.
  - Maps each `error_code` to a stable `ClaudeError` the UI can branch on.
  - Unit-tested against a mocked fetch for the happy path + each error code.
- **Priority**: Must

### FR-8: `/settings` page + AI section

- **Description**: Add a `/settings` route (React Router), reachable from the existing nav
  (a link near sign-out). v1 contains a single **"Claude / AI"** card:
  - **Test Connection** button — calls `callClaude({ feature: 'connection_test', messages:
[{ role: 'user', content: 'ping' }], maxTokens: 16 })`; shows a spinner, then
    `✓ Connected (model, N ms)` or a mapped error message (`rate_limited` → "Daily limit
    reached", `no_api_key` → "Add your household's Claude API key below", etc.). Visible to any
    member.
  - **API key** (owner only) — a password-type input + **Save key** / **Clear key**; shows
    "Key set ✓" / "No key set — Claude is off for this household" state; never displays the
    stored value. Non-owners see a read-only note ("Ask a household owner to add a Claude API
    key").
  - **Model** (owner only) — a select over the allowlist, default `claude-sonnet-5`.
  - **Daily limit** (owner only) — a number input bound to
    `household_ai_config.daily_call_limit`.
- **Acceptance Criteria**:
  - `/settings` renders for any signed-in member; the AI card is present.
  - With a key set, **Test Connection** performs a real round-trip and shows OK + latency;
    with no key set it shows the `no_api_key` message and (for a non-owner) points at the
    owner.
  - A non-owner cannot see/use the key, model, or limit controls (and the server rejects such
    writes even if forced).
  - Saving a key → next Test Connection uses the household key (verifiable via `ai_usage_log`
    / a deliberate bad key producing `upstream_error`); clearing it → back to `no_api_key`.
  - Existing screens and nav are otherwise unchanged.
- **Priority**: Must _(the owner key control is now the only enable path — it is Must, not
  Should; the model/limit inputs remain nice-to-have but ship in the same card)_

### FR-9: Configuration & limits

- **Description**: Server config, read by the Edge Function from env (Supabase secrets):
  - `ANTHROPIC_MODEL` — default model, default value `claude-sonnet-5`.
  - `AI_DAILY_CALL_LIMIT` — default per-household cap, default `25`.
  - Model **allowlist** (in code): `claude-sonnet-5`, `claude-haiku-4-5`, `claude-opus-5`.
  - `max_tokens` **ceiling** (in code): `4096` for v1.
  - Max request input size (in code): e.g. 50 KB of `messages` + `system` combined.
  - **No `ANTHROPIC_API_KEY` env var** — keys are per-household (Vault) only. (A local dev may
    export one for a throwaway spike, but the shipped function has no code path that reads it.)
- **Acceptance Criteria**:
  - A household with no key set → `no_api_key` (not a crash), regardless of any env state.
  - `ANTHROPIC_MODEL` set to a non-allowlisted value → function fails fast at startup or
    treats it as `bad_request`; documented which.
  - Config values documented in `supabase/functions/claude-proxy/README.md`.
- **Priority**: Must

### FR-10: Standards & decision docs

- **Description**: Update:
  - `memory-bank/standards/system-architecture.md` — add the Edge Function as a **second
    backend surface** beside the Supabase DB; describe the Claude call path, key resolution,
    and that RLS + JWT verification both gate it.
  - `memory-bank/standards/tech-stack.md` — add `@anthropic-ai/sdk`, Supabase Edge Functions
    (Deno), and Supabase Vault to the stack; note default model `claude-sonnet-5`.
  - `memory-bank/standards/decision-index.md` — an entry for "introduce Claude API via a
    Supabase Edge Function proxy; **per-household Vault key only, no shared key**; per-household
    daily call cap; every call metered in `ai_usage_log`".
- **Acceptance Criteria**:
  - `system-architecture.md` no longer implies Supabase-Postgres is the only backend.
  - `tech-stack.md` lists the new dependencies.
  - `decision-index.md` has the entry.
- **Priority**: Must

---

## Non-Functional Requirements

### Security

| Requirement           | Standard                                                                                      | Notes                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Key confidentiality   | No key in the bundle, a table column, a client-readable view, or any API response             | Keys live only in Supabase Vault; `vault.decrypted_secrets` readable by service role only                                 |
| Caller authentication | Valid Supabase JWT required on every `claude-proxy` call                                      | Function verifies the token and resolves `auth.uid()`; anon → 401                                                         |
| Authorization         | Household membership required to call; **owner-only** for key / model / limit writes          | Enforced server-side in the function + RLS on `household_ai_config`, not just the UI                                      |
| Tenant isolation      | A household's calls, config, and usage log are invisible to other households                  | RLS on `household_ai_config` and `ai_usage_log`; `household_id` resolved server-side, never trusted from the request body |
| Input bounds          | Oversized or malformed request bodies are rejected                                            | `max_tokens` ceiling, model allowlist, input-size cap — all server-enforced                                               |
| Abuse ceiling         | A compromised/greedy household cannot run up its own Anthropic bill unbounded through the app | Per-household daily cap (FR-5); every attempt logged (FR-6)                                                               |

### Reliability

| Requirement                    | Metric                                                               | Target                                                                                            |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Every attempt is accounted for | `ai_usage_log` rows vs call attempts                                 | 1:1, including failures and rate-limited calls                                                    |
| Upstream failure handling      | Anthropic 4xx/5xx/timeout                                            | Caught, mapped to a typed `error_code`, logged, surfaced to the UI — never an unhandled 500       |
| No partial state               | A failed call leaves no half-written config or orphaned Vault secret | Key set/clear is atomic (Vault write + `key_secret_id` update in one transaction or with cleanup) |

### Performance

| Requirement                | Metric                                 | Target                                                                                |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Test Connection round-trip | Wall clock, warm function              | Single non-streaming call; typically < 3 s (dominated by the model, not our overhead) |
| Our added overhead         | Function time minus the Anthropic call | < ~150 ms (one JWT verify + 2 small queries + 1 insert)                               |
| Streaming                  | —                                      | Out of scope; non-streaming only in v1                                                |

### Cost

| Requirement          | Notes                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| Default model        | `claude-sonnet-5` ($2 in / $10 out per M tokens)                                |
| Metering             | `est_cost_usd` per call from an in-function rate table; per-household daily cap |
| Test Connection cost | `max_tokens ≤ 16`, ~a few hundred input tokens → well under $0.01 per press     |

### Observability

| Requirement        | Notes                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Audit trail        | `ai_usage_log` is the per-call record (household, feature, model, tokens, cost, ok, error_code, latency) |
| Errors             | Supabase Edge Function logs for stack-level errors; `error_code` in the log row for expected failures    |
| No usage dashboard | Aggregation UI across households is out of scope for v1                                                  |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded by the Construction Agent from `memory-bank/standards/`.

**Intent-specific constraints**:

- The API key must never be in the frontend bundle or reachable by a client — the Edge
  Function is the only holder at runtime; Vault is the only store.
- `supabase/migrations/` is append-only — new tables/policies arrive in new migration files.
- The Edge Function is a **new backend surface**; `system-architecture.md` and `tech-stack.md`
  currently describe Supabase-Postgres as the whole backend and MUST be updated (FR-10).
- `household_id` is always resolved server-side from the JWT — it is never read from the
  request body (prevents a member spoofing another household).
- `@anthropic-ai/sdk` is imported in the Deno function via an `npm:` specifier; the frontend
  gains no Anthropic dependency.
- Default model is `claude-sonnet-5`; the allowlist is `claude-sonnet-5`, `claude-haiku-4-5`,
  `claude-opus-5`; `max_tokens` ceiling is 4096. (Values chosen at Checkpoint 1; changeable
  later.)

### Business Constraints

- **No shared / founding `ANTHROPIC_API_KEY`.** Each household's owner supplies their own
  Anthropic key; Claude is unavailable for a household until they do. (The project owner will
  add their own key at the end as the acceptance test.)
- v1 ships no user-visible AI capability beyond Test Connection; recipe import is intent 008.

---

## Assumptions

| Assumption                                                                                                        | Risk if Invalid                                       | Mitigation                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase Edge Functions are available/enabled on the project and deployable via `supabase functions deploy`       | No server surface for the key; whole approach blocked | Verify at construction start; fallback is a Netlify serverless function (same contract)                                                                                        |
| Supabase Vault is available for per-household key storage                                                         | FR-2 (the **only** enable path) can't be done safely  | Fall back to a `pgsodium`-encrypted `bytea` column with the same 3-function contract — decided in bolt 037 after a Vault smoke test. There is **no** shared-key-only fallback. |
| `current_user_household_id()` (from intent 004) is a suitable household resolver inside the function's DB queries | Household resolution needs bespoke SQL                | Function can query `household_members` directly with the caller's `auth.uid()`                                                                                                 |
| Sonnet 5 is an acceptable default for later parsing work at this cost                                             | Import quality/cost is off                            | `model_override` per household + a one-line default change                                                                                                                     |
| Household owners are willing/able to get an Anthropic key (console account + billing)                             | Low adoption of AI features until they do             | Clear `no_api_key` UX pointing to Settings; a shared key can be added as a later intent if desired                                                                             |

---

## Open Questions

| #    | Question                                                                                                | Owner              | Resolution                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OQ-1 | Route name: `/settings` vs `/account` vs a modal                                                        | User               | **Resolved** — a real `/settings` **route** (not a modal). It will also host the future household `dinners_per_week` setting, so a routed page is warranted.                                                                   |
| OQ-2 | Is a shared `ANTHROPIC_API_KEY` definitely available, or per-household-key-only?                        | User               | **Resolved (Checkpoint 3)** — per-household key **only**, no shared key. FR-2 and the owner key control (FR-8) are Must; the function has no env-key path. Project owner adds their own key at the end as the acceptance test. |
| OQ-3 | Vault vs `pgsodium` column for the per-household key                                                    | Construction Agent | Recommend Vault; implementation detail                                                                                                                                                                                         |
| OQ-4 | Keep `ai_usage_log` forever, or prune (e.g. 90 days)?                                                   | User               | Default keep-all for v1; add a prune job later — non-blocking                                                                                                                                                                  |
| OQ-5 | Should non-owner members see the AI card at all (Test Connection only) or is the whole card owner-only? | User               | Assumed: Test Connection visible to all members; key/model/limit owner-only                                                                                                                                                    |
| OQ-6 | `max_tokens` ceiling (4096) and allowlist (sonnet-5 / haiku-4-5 / opus-5) — good for v1?                | User               | Assumed yes; trivially changed                                                                                                                                                                                                 |

---

## Priority Definitions

| Priority | Meaning                                                                            |
| -------- | ---------------------------------------------------------------------------------- |
| Must     | Required; intent incomplete without it                                             |
| Should   | Important but not blocking (here: the per-household key override + owner controls) |
| Could    | Nice to have                                                                       |
| Won't    | Explicitly out of scope for this intent                                            |

## Out of Scope (Won't — this intent)

- Recipe import by URL, and any other concrete AI feature → **008-recipe-import** (next)
- Streaming responses / SSE
- Prompt caching, batching, structured-output enforcement, tool use, extended thinking
- A cross-household usage/cost dashboard or admin views
- Automatic model fallback, retries, or multi-provider support
- A full settings page — only the "Claude / AI" card lands here; other settings are later intents
- A shared / founding `ANTHROPIC_API_KEY` and any fallback to one (a later intent may add one)
- Billing, quotas beyond a simple daily call count, or usage-based charging of households
