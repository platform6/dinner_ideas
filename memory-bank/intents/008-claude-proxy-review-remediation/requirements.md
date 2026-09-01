---
intent: 008-claude-proxy-review-remediation
phase: inception
status: complete
created: '2026-08-31T20:30:00Z'
updated: '2026-08-31T21:00:00Z'
approved: 2026-08-31T21:00:00Z (Checkpoint 2) — 6-FR grouping, intent number 008, and OQ-1/OQ-2/OQ-3 resolutions confirmed by user
---

# Requirements: claude-proxy Review Remediation

## Intent Overview

A code review of intent `007-claude-integration` (the per-household `claude-proxy` Edge
Function and its `/settings` AI card, commits `a725ea0` and `2fc137c`) raised **ten findings**
against the shipped code. This intent applies all ten. Nine are correctness or reliability
defects in code that is already deployed and already earns money on every call; one is dead
code. There is **no new capability here** — the proxy's frozen request/response contract
(`supabase/functions/claude-proxy/index.ts` header) is preserved, the happy path is unchanged,
and no user-visible behaviour changes except that stale/stuck UI states get fixed.

The findings cluster into two surfaces, mirroring intent `007`'s own two units:

- **The Edge Function** (`supabase/functions/claude-proxy/` — `index.ts`, `pipeline.ts`,
  `anthropic.ts`): the daily-call cap can silently fail open, it counts the wrong rows, it
  races under concurrency, the SDK has no timeout so the documented `timeout` path is
  unreachable, and a metering-write failure turns a paid success into a client-visible 502.
- **The settings client** (`src/features/settings/ClaudeAiCard.tsx`,
  `src/features/settings/api.ts`, `src/features/ai/api.ts`): the daily-limit field shows a
  stale value, `callClaude` has no timeout so a hung function wedges the UI, config writes
  trust the client clock and never record `updated_by`, and one `useEffect` is dead.

**Source**: the code-review run of 2026-08-31 (10 findings, verified against the source at
`a725ea0..2fc137c` before this intent was written). Every FR below cites the finding(s) it
closes.

### Why this is its own intent, not a `007` fix-up

`007` is committed and (per its deployment tracking) headed to prod; recipe import — the first
real consumer of the proxy — is the next feature intent. The proxy's rate-limit and metering
integrity is load-bearing for that consumer and for the bill, so the corrections are grouped,
prioritised, and reviewed as a unit rather than folded silently into unrelated work. Same
shape as `003-frontend-review-remediation` did for the `002` front-end review.

---

## Business Goals

| Goal                                                                             | Success Metric                                                                                                                                                                     | Priority |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A household's daily call cap cannot be silently disabled by a transient DB error | With the usage-count query forced to fail, the proxy does **not** call Anthropic and returns a typed error + a log row — it does not proceed as if usage were 0                    | Must     |
| A typo'd env var cannot remove the cap for config-less households                | `AI_DAILY_CALL_LIMIT` set to a non-numeric value falls back to `DEFAULT_DAILY_LIMIT` (25); it never resolves to `NaN`                                                              | Must     |
| The cap counts real usage only, and holds under concurrency                      | A flood of invalid requests never trips `rate_limited` for a valid caller; N concurrent calls at the boundary never exceed `daily_call_limit` paid calls in a UTC day              | Must     |
| A paid Claude call is never reported to the client as a failure                  | With the metering insert forced to throw _after_ a successful Anthropic call, the caller still receives `200` with the model text; a log-write failure degrades observability only | Must     |
| The documented `timeout` outcome actually happens                                | A Claude call that runs long enough resolves as `timeout` (502) **with** its `ai_usage_log` row, before the platform kills the function                                            | Must     |
| Every request still produces exactly one `ai_usage_log` row                      | The `007` invariant ("exactly one row per resolved-household request") holds on every path this intent touches                                                                     | Must     |
| The settings UI shows the truth and never wedges                                 | The daily-limit field shows the saved value after the query resolves; Test Connection always leaves its loading state; no dead effects remain                                      | Should   |
| AI-config edits carry server-side provenance                                     | After an owner edits model or limit, the row's `updated_by` is the owner and `updated_at` is server time, matching `set_household_ai_key`                                          | Should   |

---

## Functional Requirements

### FR-1: The daily call cap fails closed

- **Description**: `countToday` (`supabase/functions/claude-proxy/index.ts`) destructures only
  `{ count }` and returns `count ?? 0`, ignoring the PostgREST `error`. Any transient failure
  of that query makes the pipeline see `used = 0`, so `used >= daily_call_limit`
  (`pipeline.ts:204`) is never true and the proxy makes unbounded paid Anthropic calls until
  the DB recovers. Separately, `deps.envDailyLimit` is
  `Deno.env.get('AI_DAILY_CALL_LIMIT') ? Number(...) : undefined` — a **non-numeric** value
  (e.g. `"25/day"`) is a truthy string, so this yields `NaN`, and `deps.envDailyLimit ??
DEFAULT_DAILY_LIMIT` (`pipeline.ts:199`) keeps `NaN` (not nullish), so `used >= NaN` is
  always false and the cap is gone for every config-less household.
- **Acceptance Criteria**:
  - `countToday` inspects the query `error`; on error it does **not** return `0`. The pipeline
    treats an unresolvable count as "cannot verify headroom" and returns **`upstream_error`
    (502)** (OQ-1 — reuse the frozen enum; no false "daily limit reached") **without** calling
    Anthropic, and writes exactly one `ai_usage_log` row for the attempt.
  - `envDailyLimit` is parsed so that a missing **or** non-numeric `AI_DAILY_CALL_LIMIT`
    resolves to `undefined` (→ `DEFAULT_DAILY_LIMIT` downstream), never `NaN`. A
    `Number.isFinite` / positive-integer guard, at the `index.ts` env-read site or in
    `pipeline.ts`.
  - Regression test: with `countToday` stubbed to throw / return an error, `handleProxy` makes
    no `callAnthropic` call and returns `502 upstream_error` with one usage row.
  - Regression test: `envDailyLimit` derived from `"25/day"`, `""`, `"abc"` → effective
    `daily_call_limit` is `25` for a household with no `household_ai_config` row.
- **Priority**: Must
- **Source**: findings 3 (count path), 7

### FR-2: The cap counts only genuine usage, and is enforced atomically

- **Description**: Two defects in the same check.
  1. **Counts the wrong rows.** `countToday` counts _every_ `ai_usage_log` row for the
     household since UTC midnight, and the outer `catch` in `pipeline.ts` (line 254) writes a
     row for `bad_request` / JSON-parse failures. So a caller looping invalid requests fills
     the household's daily budget with `ok=false, error_code='bad_request'` rows and locks out
     legitimate calls until UTC midnight.
  2. **Check-then-act race.** `countToday` is read at `pipeline.ts:203`; the usage row is
     inserted much later (line 227, after the Anthropic call). Concurrent requests all read
     the same `used` and all pass `used >= daily_call_limit`, so a household with `limit = 25`
     and 24 used can make many more than one further paid call.
- **Acceptance Criteria**:
  - The cap counts only rows that represent a real upstream attempt — i.e. `ok = true` **or**
    `error_code IN ('rate_limited', 'upstream_error', 'timeout')`. Rows with
    `error_code = 'bad_request'` (and `no_api_key`, `no_household`) do **not** consume the cap.
    (Implementation: a `WHERE` clause on the count, or a partial index, or a DB-side helper.)
  - Regression test: 50 sequential invalid-JSON requests followed by a valid request → the
    valid request is **not** `rate_limited` (assuming the household is otherwise under limit).
  - The cap check and the usage-row insert are **atomic** with respect to concurrent requests:
    a single DB-side operation (an RPC that inserts-if-under-limit, `INSERT … SELECT … WHERE
(SELECT count …) < limit`, or an advisory lock keyed on `household_id`), such that a
    household never makes more than `daily_call_limit` paid Anthropic calls in a UTC day.
  - Regression / concurrency test: 10 requests fired concurrently with `used = limit - 1` →
    at most one proceeds to `callAnthropic`; the rest get `rate_limited` with a row each.
  - The `007` acceptance criteria for FR-5 (calls `1..N` succeed, `N+1` → 429 with one row;
    `daily_call_limit` change takes effect with no deploy) still pass.
- **Priority**: Must
- **Source**: findings 5, 6

### FR-3: Dependency-resolution failures are surfaced, not masked as "absent"

- **Description**: `resolveHousehold`, `loadConfig`, and `resolveKey` (`index.ts`) all
  destructure only `{ data }` and fall back to `null` / defaults, so a _failed_ query is
  indistinguishable from _"no such row"_. A transient failure of the household lookup returns
  `403 no_household` ("your account is not attached to a household"); a transient failure of
  `resolve_ai_key` returns `409 no_api_key` ("no Claude API key set") — both untrue and both
  alarming to the user.
- **Acceptance Criteria**:
  - Each of `resolveHousehold`, `loadConfig`, `resolveKey` distinguishes a query **error**
    from an **empty result**. On a query error it surfaces **`upstream_error` (502)** (OQ-1),
    not `no_household` / `no_api_key`.
  - `no_household` (403) and `no_api_key` (409) are returned **only** when the query
    succeeded and genuinely returned no row.
  - `loadConfig` failing (as opposed to returning no row) does not silently substitute
    `daily_call_limit` defaults — it is treated as a transient error (it feeds the cap).
  - Regression tests: with each resolver stubbed to return a PostgREST error, `handleProxy`
    returns `502 upstream_error`, never 403 `no_household` / 409 `no_api_key`.
- **Priority**: Must
- **Source**: finding 3 (resolver path)

### FR-4: A successful, billed Claude call always returns 200 and logs exactly once

- **Description**: Two defects that break the "1:1 usage row" and "no paid call reported as a
  failure" invariants.
  1. **No SDK timeout.** `new Anthropic({ apiKey, maxRetries: 1 })` (`anthropic.ts:26`) sets
     no `timeout`, so the SDK's ~10-minute default applies. The Edge Function's platform
     wall-clock budget is far shorter, so when Claude is slow the platform kills the function
     before `callAnthropic` can throw a timeout — the `ProxyFailure('timeout')` branch
     (`anthropic.ts:49`) is effectively unreachable, and **no** `ai_usage_log` row is written
     (invariant violated). `maxRetries: 1` compounds the wall-clock spend.
  2. **Metering failure corrupts a success.** In the 200 branch, `await write(...)`
     (`pipeline.ts:227`) runs inside the `try` whose `catch` (line 245) maps _any_ throw to
     `ProxyFailure('upstream_error', 502)`. If `insertUsage` rejects after a successful,
     billed Anthropic call, `logged` is already `true` so the `catch`'s `write` no-ops — the
     caller gets `502 upstream_error`, no row is written, and a retry pays for a second call.
- **Acceptance Criteria**:
  - The `Anthropic` client is constructed with an explicit `timeout` comfortably shorter than
    the Edge Function platform limit (e.g. 45 s), and **`maxRetries: 0`** (OQ-3 — one attempt,
    worst-case wall clock ≈ 1 × timeout; the client and the user retry). The Construction
    Agent confirms the actual platform limit and sets `timeout` to roughly ⅓ of it.
  - A Claude call that exceeds the configured timeout resolves as `ProxyFailure('timeout')`
    → `502 timeout` **with** exactly one `ai_usage_log` row (`ok=false,
error_code='timeout', latency_ms` recorded), before the platform kills the function.
  - In the 200 branch, a failure of the metering write does **not** change the response: the
    caller still receives `200` with `{ text, model, usage, latency_ms }`. The metering
    failure is caught and logged to the Edge Function logs (`console.error`), not surfaced.
  - The "exactly one `ai_usage_log` row per resolved-household request" invariant holds on the
    success path, the timeout path, and the metering-failure path.
  - Regression tests: (a) `callAnthropic` stubbed to exceed the timeout → `502 timeout` + one
    row; (b) `insertUsage` stubbed to throw on the success path → response is `200` with the
    model text, and the throw does not become `upstream_error`.
- **Priority**: Must
- **Source**: findings 2, 4

### FR-5: The settings UI reflects saved AI config and never wedges

- **Description**: Three client defects.
  - **Stale daily-limit field** (`ClaudeAiCard.tsx:213`): `<Input type="number"
defaultValue={config.data?.dailyCallLimit ?? 25}>` is uncontrolled — `defaultValue` is
    read once on mount, before the `['ai-config']` query resolves, and an uncontrolled input
    ignores later `defaultValue` changes. An owner who set the limit to 5 sees 25. (The
    Model `<Select>` uses `value=` and is unaffected.)
  - **No client timeout** (`src/features/ai/api.ts:71`): `callClaude`'s `fetch` has no
    `AbortController` / timeout. A hung `claude-proxy` (see FR-4) leaves the promise pending
    forever; the Test Connection button stays in `loading` with no error shown.
  - **Dead effect** (`ClaudeAiCard.tsx:53`): `useEffect(() => () => setKeyInput(''), [])` —
    the cleanup runs only on unmount, when component state is discarded anyway. `saveKey`'s
    `onSuccess` already clears the field. The effect and its "never keep the entered key
    around" comment imply a security property they do not provide.
- **Acceptance Criteria**:
  - Once `['ai-config']` resolves, the "Daily call limit" field shows the household's saved
    `dailyCallLimit`. Fix by making it controlled, or by gating render on `config.isSuccess`,
    or with a `key` tied to the loaded value. Editing + blur still calls `saveLimit.mutate`
    with the same validation.
  - Loading `/settings` as an owner whose saved limit is 5 → the field shows `5`, not `25`.
  - `callClaude` aborts its `fetch` after a bounded wait (e.g. 60 s) via `AbortController`,
    and maps the abort to a typed `ClaudeError('timeout', …)` the card renders as a timeout
    message. The Test Connection button always leaves `loading`.
  - The unmount-only `useEffect` in `ClaudeAiCard.tsx` and its comment are removed; entering
    a key, saving, and the field-clear-on-success behaviour are unchanged (covered by the
    existing `007` settings tests).
- **Priority**: Should
- **Source**: findings 1, 8, 10

### FR-6: AI-config writes record server-side provenance

- **Description**: `updateAiConfig` (`src/features/settings/api.ts:50`) upserts
  `household_ai_config` with a **client-supplied** `updated_at: new Date().toISOString()` and
  never sets `updated_by`. Model / limit edits therefore leave `updated_by` NULL and trust
  the caller's clock — unlike `set_household_ai_key`, which records `auth.uid()` server-side.
  The `updated_by` column exists precisely for this audit trail.
- **Acceptance Criteria**:
  - After an owner changes `model_override` or `daily_call_limit`, the row has
    `updated_by = <the owner's profile id>` and `updated_at` within a few seconds of server
    `now()`.
  - The client no longer sends `updated_at` (and does not send `updated_by`) — both are set
    server-side by a **`BEFORE INSERT OR UPDATE` trigger** on `household_ai_config` (OQ-2)
    that stamps `updated_by = auth.uid()`, `updated_at = now()` unconditionally. `updateAiConfig`
    keeps using `.upsert(...)`, just without the `updated_at` field.
  - Owner-only enforcement (RLS) and the "`key_secret_id` not writable here" guarantee from
    `007` are preserved — the trigger does not touch the write-authorization path.
  - New migration file under `supabase/migrations/` (append-only); the `007` settings tests
    for model / limit writes still pass (same `.upsert` call shape, minus `updated_at`).
- **Priority**: Should
- **Source**: finding 9

---

## Non-Functional Requirements

### Security

| Requirement         | Standard                                                                                                                     | Notes                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Abuse ceiling holds | The per-household daily cap cannot be disabled by a transient error, a bad env var, invalid-request flooding, or concurrency | FR-1, FR-2 — the cap is the only thing bounding a household's own Anthropic spend through the app           |
| No new key exposure | No finding or fix introduces a path that returns, logs, or stores an API key                                                 | The key still lives only in Vault, read only by the service role                                            |
| Provenance          | Owner config edits are attributable server-side                                                                              | FR-6 — `updated_by = auth.uid()`, server clock                                                              |
| Contract stability  | The frozen `error_code` enum is not broken                                                                                   | Fail-closed paths reuse existing codes (`rate_limited`, `upstream_error`) unless OQ-1 adds one deliberately |

### Reliability

| Requirement                        | Metric                                             | Target                                                                                  |
| ---------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| One usage row per request          | `ai_usage_log` rows vs resolved-household requests | 1:1 on every path this intent touches — success, timeout, metering-failure, fail-closed |
| No paid call reported as a failure | Successful Anthropic call → client response        | Always `200`; a metering-write failure never produces `upstream_error`                  |
| Transient errors are typed         | DB / resolver query failure → client response      | A typed transient 5xx, never a misleading `no_household` / `no_api_key`                 |
| Timeout is reachable               | Long Claude call → outcome                         | `timeout` (502) + row, before the platform kills the function                           |

### Regression

| Requirement          | Target                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `007` acceptance set | All FR-1..FR-10 acceptance criteria from `007-claude-integration` still pass — this intent only tightens edge paths                                                                                                      |
| Existing suite       | `supabase/functions/claude-proxy/*.test.ts` and the `src/features/{ai,settings}` tests stay green; assertions change only where a call shape changes (FR-2 atomic cap check; FR-6 drops `updated_at` from the `.upsert`) |
| Happy path unchanged | A valid, authorised, under-limit request with a working key still returns the same `200` body                                                                                                                            |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded by the Construction Agent from `memory-bank/standards/`.

**Intent-specific constraints**:

- The `claude-proxy` **request/response contract** documented in the `index.ts` header is
  frozen and stays frozen. Status codes and the `error_code` enum
  (`no_household` / `no_api_key` / `rate_limited` / `bad_request` / `upstream_error` /
  `timeout`, plus bare `401`) do not change — the new fail-closed paths (FR-1, FR-3) reuse
  `upstream_error` (OQ-1). The `index.ts` header comment's "intent 008" reference is updated
  to point at the recipe-import intent's new number while these files are open (FR-4).
- `supabase/migrations/` is append-only — FR-2's atomic check and FR-6's provenance arrive in
  new migration files.
- The happy path and the `200` response body are unchanged. No new config surface, no new
  UI beyond fixing the stale field and the stuck button.
- `@anthropic-ai/sdk` stays pinned at its current version (`deno.json` / `deno.lock`); FR-4
  only passes a `timeout` option to the existing constructor.
- `household_id` is still resolved server-side from the JWT, never from the request body.
- The Edge Function's testable core is `pipeline.ts` with all I/O injected via `Deps` — new
  behaviour is exercised through stubbed `Deps`, matching the existing `index.test.ts` /
  pipeline tests.

### Business Constraints

- Household project — same single-family scope as `001`–`007`.
- `007` is already committed and deploying; this is corrective work on live, billable code and
  should land before `009` (recipe import) builds a real feature on the proxy.
- No behaviour change a household would notice, except: the daily-limit field stops lying, and
  Test Connection stops hanging.

---

## Assumptions

| Assumption                                                                                                                | Risk if Invalid                                                         | Mitigation                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The Supabase Edge Function platform wall-clock limit is materially shorter than the SDK's ~10 min default                 | FR-4's timeout value (45 s) is mis-sized                                | Confirm the actual limit at construction start; set `timeout` to ~⅓ of it                                   |
| An `INSERT … WHERE (SELECT count …) < limit` (or a small RPC) is sufficient for FR-2's atomicity at this scale            | A heavier locking scheme is needed                                      | Single-family load is tiny; a per-`household_id` advisory lock is the fallback                              |
| The `007` invariant text is "exactly one row per **resolved-household** request" (i.e. after auth + household resolution) | The intended invariant is stricter/looser                               | Matches the `pipeline.ts` comment at line 159; FR-4 preserves exactly that boundary                         |
| `dailyCallLimit` is already returned by `fetchAiConfig` and just mis-bound in the input                                   | The value isn't actually available client-side                          | Verified in source — `config.data?.dailyCallLimit` is referenced at the call site                           |
| `upstream_error` (502) is an acceptable code for a backend-side failure (DB / resolver), not just an Anthropic failure    | Dashboards later can't separate "our DB flaked" from "Anthropic flaked" | OQ-1 resolved this way deliberately; a distinct `internal_error` can be added later if that split is wanted |

---

## Open Questions

| #    | Question                                                                                                                               | Owner              | Resolution                                                                                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | For the fail-closed paths (FR-1 count error, FR-3 resolver error), reuse an existing `error_code` or add `internal_error`?             | User               | **Resolved (2026-08-31)** — reuse the frozen enum: **both** fail-closed paths return `upstream_error` (502). No false "daily limit reached", no contract change. A distinct `internal_error` may be added in a later intent if usage dashboards need to split backend vs. upstream failures.   |
| OQ-2 | FR-6: `security definer` RPC (like the key RPCs) vs. a `BEFORE INSERT/UPDATE` trigger stamping `updated_by`/`updated_at`?              | User               | **Resolved (2026-08-31)** — a `BEFORE INSERT OR UPDATE` **trigger** on `household_ai_config`. Smallest client change (`updateAiConfig` keeps `.upsert`, drops `updated_at`); covers any future writer; owner-only is already enforced by RLS so the RPC's centralised check is redundant here. |
| OQ-3 | FR-4: drop `maxRetries` to `0`, or keep `1` with a tighter per-try timeout so `2 × timeout` fits the budget?                           | User               | **Resolved (2026-08-31)** — **`maxRetries: 0`** for v1. Retries and a hard wall-clock budget are in tension; the client (FR-5) and the user retry. The Construction Agent still measures the platform limit to size `timeout`.                                                                 |
| OQ-4 | FR-2: enforce "count genuine usage only" by filtering `error_code` in the count, or by a partial index / a `usage_counts` helper view? | Construction Agent | Implementation detail — a `WHERE` clause on the existing count query is the smallest change; revisit if it's slow (it won't be at this scale).                                                                                                                                                 |
| OQ-5 | Does this intent redeploy `claude-proxy` to prod itself, or hand off to a separate operations step?                                    | User               | Assumed: construction lands the code + migrations; deployment/verification follows the same path `007` used (its `deployment/` tracking).                                                                                                                                                      |

---

## Priority Definitions

| Priority | Meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| Must     | A correctness/reliability defect in live, billable code — fix before building on the proxy |
| Should   | Real defect, user-visible, but not a money/integrity risk (the settings-client fixes)      |
| Could    | Not used in this intent                                                                    |
| Won't    | See Out of Scope                                                                           |

## Out of Scope (Won't — this intent)

- Recipe import by URL, or any new AI feature → the next feature intent (`009`)
- Streaming, prompt caching, batching, tool use, structured output, model fallback, multi-provider
- A usage / cost dashboard, or any cross-household admin view
- Pruning / retention for `ai_usage_log`
- Changing the model allowlist, `max_tokens` ceiling, default model, or input-size cap
- Any change to the `200` happy-path response body or to the frozen status codes (beyond the
  additive option in OQ-1)
- Broader hardening of the proxy not named in the review (e.g. request signing, per-feature
  quotas, abuse detection beyond the daily count)
