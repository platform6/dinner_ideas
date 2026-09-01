---
id: 003-surface-resolver-errors
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
status: complete
priority: must
created: '2026-08-31T21:00:00Z'
assigned_bolt: 040-claude-proxy-hardening
implemented: true
---

# Story: 003-surface-resolver-errors

## User Story

**As** a household member using an AI feature
**I want** a backend hiccup to say "something went wrong, try again"
**So that** I'm not told my account has no household or no API key when that isn't true

## Context

`resolveHousehold`, `loadConfig`, and `resolveKey` (`supabase/functions/claude-proxy/index.ts`)
all destructure only `{ data }` and fall back to `null` / defaults. A _failed_ query is
indistinguishable from _"no row"_:

- `resolveHousehold` error ⇒ `403 no_household` — "your account is not attached to a household"
- `resolveKey` error ⇒ `409 no_api_key` — "no Claude API key set for this household"
- `loadConfig` error ⇒ silently substitutes `daily_call_limit` / `model_override` defaults

All three are wrong and alarming. (Review finding 3, resolver path.)

## Acceptance Criteria

- [ ] **Given** `resolveHousehold`'s query returns a PostgREST `error`, **When** `handleProxy`
      runs, **Then** it returns `502 { error_code: 'upstream_error' }` — **not** `403
    no_household` — and (since household is unresolved) writes **no** `ai_usage_log` row,
      consistent with `007`'s "no row before household resolution" boundary.
- [ ] **Given** `resolveHousehold` succeeds and genuinely returns no membership row, **When**
      `handleProxy` runs, **Then** it still returns `403 no_household` exactly as today.
- [ ] **Given** `loadConfig`'s query errors (not "no row"), **When** `handleProxy` runs,
      **Then** it returns `502 upstream_error` + one usage row — it does **not** silently use
      default `daily_call_limit` / `model_override`.
- [ ] **Given** `loadConfig` succeeds with no row, **When** `handleProxy` runs, **Then**
      defaults apply exactly as today (`model_override: null`, env/`DEFAULT_DAILY_LIMIT`).
- [ ] **Given** `resolveKey`'s RPC errors, **When** `handleProxy` runs, **Then** it returns
      `502 upstream_error` + one usage row — **not** `409 no_api_key`.
- [ ] **Given** `resolveKey` succeeds and returns `null` (no key set), **When** `handleProxy`
      runs, **Then** it returns `409 no_api_key` + one row exactly as today.

## Technical Notes

- Each resolver: capture `{ data, error }`; on `error`, return a discriminated result
  (`{ ok: false }` / throw a sentinel) that `handleProxy` maps to
  `ProxyFailure('upstream_error', …, 502)` at the right point in the pipeline (before vs.
  after the "one row" boundary at `pipeline.ts:159`).
- Keep the "genuine absence" branches byte-identical to today so `007`'s `no_household` /
  `no_api_key` acceptance tests are untouched.
- `error_code` reuse — no contract change (OQ-1).

## Dependencies

### Requires

- Shares `index.ts` / `pipeline.ts` with stories 001–002; land in the same bolt (040).

### Enables

- Cleaner signal for any future usage dashboard: a backend failure is `upstream_error`, not a
  spurious `no_household` / `no_api_key`.

## Edge Cases

| Scenario                                             | Expected Behaviour                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `resolveHousehold` returns multiple rows (shouldn't) | `007` uses `.limit(1).maybeSingle()`; unchanged — first row wins             |
| `resolveKey` RPC returns an empty string `""`        | Treated as "no key" (`409 no_api_key`), matching `007`'s `?? null` behaviour |
| Auth (`getUser`) fails                               | Still `401`, no row — out of scope for this story, unchanged                 |

## Out of Scope

- The count-query failure path (story 001) and the atomic cap (story 002).
- Adding a distinct `internal_error` code (OQ-1 chose reuse).
- Retrying the resolver queries inside the function.
