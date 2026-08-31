---
unit: 002-settings-ui
intent: 007-claude-integration
phase: inception
status: complete
created: '2026-08-31T16:35:00Z'
updated: '2026-08-31T16:35:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Settings UI

## Purpose

Give users a way to exercise and configure the Claude integration: a typed `callClaude`
wrapper for the whole app to use, and a new `/settings` route whose first card ("Claude / AI")
has a **Test Connection** button plus owner-only key / model / daily-limit controls. `/settings`
is scaffolded here as a real route so the future household `dinners_per_week` setting has a
home.

## Scope

### In Scope

- `src/features/ai/api.ts` — `callClaude({ feature, system?, messages, model?, maxTokens? })`:
  POSTs to `claude-proxy` with the current session's access token, returns
  `{ text, model, usage, latencyMs }`, throws a typed `ClaudeError` carrying `error_code` on
  non-200. No retries. (FR-7)
- `/settings` route + React Router wiring + a nav link near sign-out (FR-8)
- `ClaudeAiCard`:
  - **Test Connection** (any member) → `callClaude({ feature: 'connection_test', messages:
[{ role: 'user', content: 'ping' }], maxTokens: 16 })` → spinner → `✓ Connected (model,
N ms)` or a mapped error message (`rate_limited` → "Daily limit reached", `no_api_key` →
    "Add your household's Claude API key in Settings", `upstream_error` → "Claude is
    unavailable", etc.)
  - **API key** (owner only) — password input + Save / Clear → `supabase.rpc('set_household_ai_key' | 'clear_household_ai_key')`;
    shows "Key set ✓" or "No key set — Claude is off for this household"; never renders the
    stored value. This is the **only** way to enable Claude for a household.
  - **Model override** (owner only) — select over the allowlist or "Default (Sonnet 5)" →
    `update household_ai_config`
  - **Daily limit** (owner only) — number input → `update household_ai_config.daily_call_limit`
- A small hook (`useHouseholdAiConfig`) that reads `household_ai_config` (model_override,
  daily_call_limit, whether a key is set) and exposes the mutations
- Tests: Test Connection states (loading / ok / each error); owner vs non-owner control
  visibility; key set/clear + config update flows (mocked Supabase + `callClaude`)

### Out of Scope

- The Edge Function, tables, RLS, key-storage functions → unit `001-claude-proxy-service`
- Any concrete AI feature that _uses_ `callClaude` → intent `008-recipe-import`
- Other settings (household `dinners_per_week`, profile display name, theme, ...) → later
  intents; only the route shell + the AI card land here
- Streaming UI, token/cost display, a usage history view
- Non-owner ability to see or change the key / model / limit

---

## Assigned Requirements

| FR   | Requirement                                                                                | Priority |
| ---- | ------------------------------------------------------------------------------------------ | -------- |
| FR-7 | Frontend AI client (`callClaude` + `ClaudeError`)                                          | Must     |
| FR-8 | `/settings` page + "Claude / AI" card (incl. the owner key control — the only enable path) | Must     |

---

## Domain Concepts

### Key Entities

_None new. Consumes `household_ai_config` (read + owner mutations) and the `claude-proxy`
response contract. `useAuth.role` (from intent 004) gates the owner-only controls._

### Key Operations

| Operation                 | Description                              | Inputs                                                             | Outputs                                                               |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `callClaude`              | Invoke the proxy                         | `{feature, system?, messages, model?, maxTokens?}` + session token | `{text, model, usage, latencyMs}` or throws `ClaudeError(error_code)` |
| Test connection           | One tiny `callClaude` for a health check | button press                                                       | "✓ Connected (model, N ms)" or a mapped error string                  |
| Set / clear household key | Owner writes the per-household key       | plaintext key                                                      | `rpc` result; card shows "Key set ✓"                                  |
| Update AI config          | Owner sets model override / daily limit  | select / number                                                    | `update household_ai_config`                                          |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 3     |
| Must Have     | 3     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                               | Title                                                                 | Priority | Status  |
| -------------------------------------- | --------------------------------------------------------------------- | -------- | ------- |
| 001-claude-api-client                  | `callClaude(...)` + `ClaudeError`, session-bearer auth, error mapping | Must     | Planned |
| 002-settings-route-and-test-connection | `/settings` route + nav link + Test Connection card                   | Must     | Planned |
| 003-owner-ai-controls                  | Owner-only key set/clear (enable path), model override, daily limit   | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                           | Reason                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001-claude-proxy-service`     | Needs the deployed `claude-proxy`, the `set/clear key` RPCs, and `household_ai_config`. FE can build against a mock once the bolt-038 request/response contract is fixed; integrate after deploy. |
| `004-account-model` (complete) | `useAuth.role` gates the owner-only controls                                                                                                                                                      |

### Depended By

| Unit                              | Reason              |
| --------------------------------- | ------------------- |
| `008-recipe-import` (next intent) | Reuses `callClaude` |

### External Dependencies

| System                             | Purpose                                                           | Risk |
| ---------------------------------- | ----------------------------------------------------------------- | ---- |
| `@supabase/supabase-js` (existing) | `rpc` + table writes + `functions.invoke` / fetch to the function | Low  |

---

## Technical Context

### Suggested Technology

Existing stack — React + React Router, `@supabase/supabase-js`, Vitest/RTL, the feature-folder
convention (`src/features/<name>/`). Call the function with `supabase.functions.invoke('claude-proxy', ...)`
(carries the session token automatically) or a plain `fetch` with an explicit
`Authorization: Bearer`. `ClaudeError` mirrors the function's `error_code` enum.

### Integration Points

| Integration                   | Type | Protocol                                                               |
| ----------------------------- | ---- | ---------------------------------------------------------------------- |
| `callClaude` → `claude-proxy` | API  | HTTPS POST (JSON) + Bearer                                             |
| `ClaudeAiCard` → Postgres     | DB   | `supabase.rpc` (key) + `supabase.from('household_ai_config')` (config) |

### Data Storage

None owned. Card state (test result, form values) is local React state; persisted values live
in `household_ai_config` / Vault (unit 1).

---

## Constraints

- No key handling on the client beyond passing a plaintext value straight into
  `rpc('set_household_ai_key')`; the value is never stored in component state longer than the
  submit, never logged, never echoed back.
- Owner-only controls are gated on `useAuth.role === 'owner'` **and** the server enforces it
  (RLS / function owner-check) — the UI gate is convenience, not security.
- Follows existing feature-folder + test conventions; no new UI-library dependency.
- `/settings` is additive — existing routes, nav, and screens are unchanged apart from the new
  link.

## Success Criteria

### Functional

- [ ] `callClaude` sends `Authorization: Bearer <session token>`, returns the typed success
      shape, and throws a `ClaudeError` with the right `error_code` for each failure
- [ ] `/settings` renders for any signed-in member; **Test Connection** performs a real
      round-trip and shows "✓ Connected (model, N ms)" or a mapped error
- [ ] A non-owner sees only Test Connection; the key / model / limit controls are absent, and
      a forced write is rejected by the server
- [ ] An owner can save a key (card then shows "Key set ✓"), clear it (back to "No key set —
      Claude is off"), change the model override, and change the daily limit
- [ ] Saving a bad key → next Test Connection surfaces `upstream_error` as a friendly message

### Non-Functional

- [ ] No secret value in component state after submit, in logs, or in the DOM
- [ ] No regression in existing routes / nav / screens

### Quality

- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] `npx vitest run` green, including the new settings tests
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt            | Type   | Stories       | Objective                                                                                                                                                                  |
| --------------- | ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 039-settings-ui | Simple | 001, 002, 003 | The whole client layer in one bolt: `callClaude` + `ClaudeError`, the `/settings` route + nav link + Test Connection card, and the owner-only key / model / limit controls |

Sequence: after bolt 038 deploys (or against a mock once its contract is fixed).

---

## Notes

- Deliberately one `simple-construction-bolt` (3 stages) — client plumbing + one new route +
  one card. Kept a separate unit from the backend for the DDD-vs-simple bolt-type split and so
  it can be scheduled independently.
- Story 003 (owner controls) is **Must** — with no shared key, the owner key control is the
  only way to enable Claude for a household, so it cannot be dropped or deferred. (The
  model/limit inputs within it are the softer part and could be trimmed if needed.)
- `/settings` route shell is intentionally minimal here; later intents add cards to it.
