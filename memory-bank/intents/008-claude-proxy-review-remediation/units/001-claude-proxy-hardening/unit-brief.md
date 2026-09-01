---
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
phase: inception
status: complete
created: '2026-08-31T21:00:00Z'
updated: '2026-08-31T21:00:00Z'
unit_type: backend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: claude-proxy Hardening

## Purpose

Close the four correctness/reliability defects the `007` code review found in the deployed
`claude-proxy` Edge Function. The daily call cap must fail **closed**, count only genuine
usage, and hold under concurrency; dependency-resolution failures must be surfaced, not
disguised as "you have no household / no key"; the Anthropic SDK must have a timeout that fits
the platform budget; and a metering-write failure must never turn a paid, successful call into
a client-visible error. The frozen request/response contract and the happy path are unchanged.

## Scope

### In Scope

- **FR-1** — `countToday` propagates its query error instead of returning `0`; a non-numeric
  `AI_DAILY_CALL_LIMIT` falls back to `DEFAULT_DAILY_LIMIT` (no `NaN`); an unverifiable count
  returns `upstream_error` (502) + one usage row, no Anthropic call.
- **FR-2** — the cap counts only rows with `ok = true OR error_code IN
('rate_limited','upstream_error','timeout')`; the check + the usage insert are one atomic
  DB-side operation so concurrent boundary requests cannot all pass.
- **FR-3** — `resolveHousehold` / `loadConfig` / `resolveKey` distinguish a query error from
  an empty result; on error → `upstream_error` (502), never `no_household` / `no_api_key`.
- **FR-4** — `new Anthropic({ apiKey, timeout: <~⅓ platform limit>, maxRetries: 0 })`; the
  `timeout` path is reachable and writes its row; the success-path `write(...)` is moved out
  of the `catch`-to-`upstream_error` scope so a metering failure is logged, not surfaced.
- One append-only migration: the atomic under-limit insert primitive for FR-2.
- Repoint the `index.ts` header comment's "intent 008" reference to the recipe-import intent's
  new number.

### Out of Scope

- Any change to the `200` happy-path response body, the status codes, or the `error_code` enum
  (fail-closed paths **reuse** `upstream_error`).
- The settings client (`ClaudeAiCard`, `src/features/ai/api.ts`, `src/features/settings/api.ts`)
  → unit `002-settings-ai-remediation`.
- New config surface, per-feature quotas, request signing, abuse detection beyond the daily
  count.
- `ai_usage_log` retention / pruning.
- Bumping `@anthropic-ai/sdk`.

---

## Assigned Requirements

| FR   | Requirement                                                       | Priority |
| ---- | ----------------------------------------------------------------- | -------- |
| FR-1 | The daily call cap fails closed (count error + `NaN` env var)     | Must     |
| FR-2 | The cap counts only genuine usage, and is enforced atomically     | Must     |
| FR-3 | Dependency-resolution failures are surfaced, not masked as absent | Must     |
| FR-4 | A successful, billed Claude call always returns 200 and logs once | Must     |

---

## Domain Concepts

### Key Entities

_None new. Operates on `007`'s `household_ai_config` (read) and `ai_usage_log` (append) with
no schema change beyond the FR-2 atomic-insert primitive._

### Key Operations

| Operation                        | Description                                                                                  | Inputs                               | Outputs                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| Verify daily headroom            | Count genuine-usage rows for the UTC day; error ⇒ "unverifiable", not `0`                    | `household_id`                       | count \| unverifiable-error                        |
| Reserve a call slot (atomic)     | Insert the `ai_usage_log` row iff genuine-usage count `< daily_call_limit`, in one statement | `household_id`, row, effective limit | inserted \| rejected (`rate_limited`)              |
| Resolve household / config / key | Return the row, or a typed error — never conflate "query failed" with "no row"               | `profile_id` / `household_id`        | value \| empty \| `upstream_error`                 |
| Bounded Anthropic call           | One non-streaming `messages.create`, hard `timeout`, no retries                              | key, model, tokens, messages         | `{ text, usage }` \| `timeout` \| `upstream_error` |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 4     |
| Must Have     | 4     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                               | Title                                               | Priority | Status  |
| -------------------------------------- | --------------------------------------------------- | -------- | ------- |
| 001-fail-closed-daily-cap              | Daily call cap fails closed (count error + NaN env) | Must     | Planned |
| 002-count-genuine-usage-atomic-cap     | Cap counts only genuine usage, enforced atomically  | Must     | Planned |
| 003-surface-resolver-errors            | Resolver failures → `upstream_error`, not "absent"  | Must     | Planned |
| 004-sdk-timeout-and-metering-isolation | SDK timeout reachable; metering failure isolated    | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                                 | Reason                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| `007-claude-integration` (committed) | This unit remediates its shipped `claude-proxy` function + migrations |

### Depended By

| Unit                          | Reason                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `009-recipe-import` (future)  | Builds a real feature on the hardened cap/metering; not blocked at code level     |
| `002-settings-ai-remediation` | Independent (no shared files); FR-5's client timeout pairs with FR-4's server one |

### External Dependencies

| System                | Purpose                                  | Risk                                                             |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Supabase Edge runtime | Wall-clock limit sizes the SDK `timeout` | Medium — the exact limit must be confirmed at construction start |
| Anthropic API         | The call being bounded                   | Low — no contract change, only a `timeout` option                |

---

## Technical Context

### Suggested Technology

Deno + `@anthropic-ai/sdk` (pinned), `@supabase/supabase-js` service-role client — all already
in `supabase/functions/claude-proxy/`. The FR-2 primitive is plain SQL (an RPC or a guarded
`INSERT … SELECT … WHERE`). Tests are Deno tests against `handleProxy` with stubbed `Deps`,
matching `index.test.ts`.

### Integration Points

| Integration                            | Type | Protocol                        |
| -------------------------------------- | ---- | ------------------------------- |
| `household_ai_config` / `ai_usage_log` | DB   | `supabase-js` (service role)    |
| `resolve_ai_key` RPC                   | DB   | `supabase-js.rpc`               |
| Anthropic `messages.create`            | API  | `@anthropic-ai/sdk`, non-stream |

### Data Storage

| Data                    | Type | Volume          | Retention            |
| ----------------------- | ---- | --------------- | -------------------- |
| `ai_usage_log` (append) | SQL  | tiny (1 family) | keep-all (per `007`) |

---

## Constraints

- Frozen contract: status codes + `error_code` enum unchanged; fail-closed paths reuse
  `upstream_error`.
- `supabase/migrations/` append-only.
- `pipeline.ts` stays I/O-free — all new behaviour reachable through injected `Deps`.
- `household_id` still resolved server-side from the JWT.
- `retries × timeout` must fit the platform wall-clock budget → `maxRetries: 0`.

---

## Success Criteria

### Functional

- [ ] `countToday` error ⇒ no `callAnthropic`, `502 upstream_error`, exactly one usage row
- [ ] `AI_DAILY_CALL_LIMIT` = `"25/day"` / `""` / `"abc"` ⇒ effective limit `25` for a
      config-less household (never `NaN`)
- [ ] 50 invalid-JSON requests then one valid request ⇒ the valid request is not `rate_limited`
- [ ] 10 concurrent requests at `used = limit − 1` ⇒ at most one reaches `callAnthropic`
- [ ] Each resolver stubbed to error ⇒ `502 upstream_error`, never `no_household` / `no_api_key`
- [ ] Anthropic call exceeding `timeout` ⇒ `502 timeout` + one usage row, before platform kill
- [ ] `insertUsage` throws on the success path ⇒ caller still gets `200` with the model text
- [ ] `007` FR-4 / FR-5 acceptance criteria still pass

### Non-Functional

- [ ] Exactly one `ai_usage_log` row per resolved-household request on every path touched
- [ ] Added overhead still within `007`'s "< ~150 ms" budget (one extra guarded insert)

### Quality

- [ ] `deno test` green (new cases + existing); `deno lint` / `deno check` clean
- [ ] `supabase db reset` + pgTAP green for the FR-2 primitive
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                       | Type   | Stories                                                                                    | Objective                                                                                                 |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 040-claude-proxy-hardening | Simple | 001-fail-closed-daily-cap, 002-count-genuine-usage-atomic-cap, 003-surface-resolver-errors | Cap + resolver integrity: fail-closed, genuine-usage-only atomic cap (+ migration), typed resolver errors |
| 041-claude-proxy-hardening | Simple | 004-sdk-timeout-and-metering-isolation                                                     | SDK `timeout` + `maxRetries: 0`; lift the success-path metering write out of the 502 catch                |

Sequence: `040 → 041` (041 rebases `pipeline.ts` after 040's cap/resolver changes).

---

## Notes

The highest-value tests exercise awkward paths: a stubbed count error, a stubbed resolver
error, a `callAnthropic` that overruns the timeout, an `insertUsage` that throws only on the
success branch, and a burst of concurrent requests at the boundary. Budget most of the bolt
time there — the production diffs themselves are small. Confirm the Edge runtime wall-clock
limit first (task one of bolt 041) and set `timeout` to roughly a third of it.
