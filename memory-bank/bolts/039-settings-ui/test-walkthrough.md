---
stage: test
bolt: 039-settings-ui
unit: 002-settings-ui
created: '2026-08-31T19:35:00Z'
---

## Test Walkthrough: settings-ui (bolt 039)

### Results

- `npx vitest run` — **24 files / 173 tests pass** (148 prior + **25 new**: 12 in
  `ai/api.test.ts`, 13 in `settings/ClaudeAiCard.test.tsx`). No regression in `Layout`,
  `AuthGate`, or any other suite.
- `npx tsc -b` — exit 0 (includes the regenerated `database.types.ts`).
- `npx eslint` on the new + edited files — clean.
- `npx vite build` — built in 4.31s, `sw.js` generated.
- pgTAP unchanged (bolt 039 touches no DB) — 14 files / 210 tests still green.

### `ai/api.test.ts` (12)

- `no_session` thrown before any `fetch` when there is no session.
- Happy path: returns `{ text, model, usage:{inputTokens,outputTokens}, latencyMs }`; request
  carries `Authorization: Bearer <token>` and `max_tokens` in the body.
- Each `error_code` (`no_household` 403, `no_api_key` 409, `rate_limited` 429, `bad_request`
  400, `upstream_error` 502, `timeout` 502) → the matching `ClaudeError.code`.
- HTTP 401 → `no_session`; unknown `error_code` → `upstream_error`; network throw →
  `upstream_error`; malformed 200 body → `ClaudeError`.

### `settings/ClaudeAiCard.test.tsx` (13)

- **Test connection**: loading state → `✓ Connected — claude-sonnet-5, 384 ms`.
- Each `ClaudeError` code → its mapped friendly message (6 cases).
- Non-owner: sees the Test connection button; the key / model / limit controls are **absent**;
  shows "Ask a household owner to add a Claude API key."
- Owner: sees the key input, the Model select, the Daily-call-limit input, and the
  "No key set — Claude is off" badge.
- Owner **Save key** → `setHouseholdKey('sk-ant-secret')`, input cleared, badge flips to
  "Key set ✓" (via a re-`fetchAiConfig`).
- Owner **Clear key** → `clearHouseholdKey()`.
- Owner model change → `updateAiConfig('hh-1', { model_override: 'claude-opus-5' })`.
- Owner daily-limit blur → `updateAiConfig('hh-1', { daily_call_limit: 5 })`.

### Acceptance criteria

**001-claude-api-client** — ✅ session-bearer auth, no client key handling; typed
`ClaudeError` per `error_code`; snake→camel `usage`; unit-tested against mocked fetch for the
happy path + every error code + network + no-session + bad shape.

**002-settings-route-and-test-connection** — ✅ `/settings` route added to the `AuthGate` /
`Layout` shell; Settings nav link in the desktop rail foot and the mobile header; the
"Claude / AI" card with a working **Test connection** button and mapped error messages;
existing routes / nav / screens otherwise unchanged (Layout suite green).

**003-owner-ai-controls** — ✅ owner-only key Save/Clear (write-only via RPC; input cleared;
value never rendered back), Model select, Daily-limit input; non-owner sees none of them; a
forced non-owner write is rejected server-side by bolt 037's RLS + `security definer` owner
checks (covered by `ai_config_and_key_vault_test.sql`).

### Not covered here (integration — deferred, see end-of-run report)

- A **real** `/settings` → `claude-proxy` → Anthropic round-trip. Needs the function deployed
  and a household key set by the owner (the project owner does this as the acceptance test).
  `callClaude` and every `ClaudeError` branch are unit-covered; the function's branches are
  covered by its own Deno tests (bolt 038).
