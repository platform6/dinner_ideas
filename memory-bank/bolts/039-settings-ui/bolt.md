---
id: 039-settings-ui
unit: 002-settings-ui
intent: 007-claude-integration
type: simple-construction-bolt
status: complete
created: '2026-08-31T16:35:00Z'
started: '2026-08-31T19:00:00Z'
completed: '2026-08-31T19:35:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-31T19:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-31T19:30:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-31T19:35:00Z'
    artifact: test-walkthrough.md
stories:
  - 001-claude-api-client
  - 002-settings-route-and-test-connection
  - 003-owner-ai-controls
requires_bolts:
  - 038-claude-proxy-service
enables_bolts: []
requires_units:
  - 001-claude-proxy-service
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 039-settings-ui

## Objective

The client layer for the Claude integration: a typed `callClaude` wrapper around
`claude-proxy`, a new `/settings` route with a nav link, and the "Claude / AI" card — a
**Test Connection** button for any member plus owner-only key / model / daily-limit controls.
No AI feature ships; this proves the pipeline end-to-end and gives `/settings` a home for
future household settings.

## Stories Included

- [ ] **001-claude-api-client**: `src/features/ai/api.ts` — `callClaude({feature, system?,
    messages, model?, maxTokens?})` sending the session bearer token, returning a typed
      success shape, throwing `ClaudeError` (with `code` from the `error_code` enum) on
      failure; vitest for the happy path + every error code against a mocked
      fetch/`functions.invoke` — Priority: Must
- [ ] **002-settings-route-and-test-connection**: `/settings` route + protected-route wiring +
      a Settings nav link near sign-out; a "Claude / AI" card with **Test Connection** →
      `callClaude({feature:'connection_test', ...})` → `✓ Connected — {model}, {N} ms` or a
      mapped friendly error; button disabled in-flight — Priority: Must
- [ ] **003-owner-ai-controls**: owner-only (`useAuth.role === 'owner'`) sections on the card —
      API key **Save**/**Clear** via `supabase.rpc('set_household_ai_key'|'clear_household_ai_key')`
      (write-only, "Key set ✓" / "No key set — Claude is off for this household"), a **Model**
      select (`update household_ai_config.model_override`), a **Daily limit** number input
      (`update household_ai_config.daily_call_limit`); non-owners see none of these and the
      server rejects forced writes — Priority: **Must** (the key control is the only way to
      enable Claude for a household)

## Expected Outputs

- `src/features/ai/api.ts` + `api.test.ts`
- `src/features/settings/SettingsPage.tsx`, `ClaudeAiCard.tsx`, a `useHouseholdAiConfig` hook,
  - `*.test.tsx`
- Router config + nav component updates (`/settings` route + link)
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **038-claude-proxy-service** (Required): the deployed function + its frozen request/response
  contract; the `set/clear key` RPCs and `household_ai_config` from bolt 037. FE work can begin
  against the documented contract + a mock and integrate once 038 deploys.

### Unit Dependencies (cross-unit)

- **001-claude-proxy-service** (Required): whole backend layer
- **004-account-model** (complete): `useAuth.role` gates the owner-only controls

### Enables

- **Intent 008-recipe-import** — reuses `callClaude`
- Later intents — add cards to `/settings` (e.g. household `dinners_per_week`)

## Success Criteria

- [ ] `callClaude` sends `Authorization: Bearer <session token>`, returns the typed success
      shape, throws `ClaudeError` with the correct `code` for each failure; no client key
      handling
- [ ] `/settings` renders for any signed-in member; **Test Connection** does a real round-trip
      → "✓ Connected — {model}, {N} ms" or a mapped message; disabled while in flight
- [ ] Non-owner sees only Test Connection; owner sees + can use key / model / limit; a forced
      non-owner write is rejected by the server (asserted in a test)
- [ ] Save key → "Key set ✓" and the entered value is cleared from state; Clear key → "No key
      set — Claude is off"; model + limit changes issue the right mutations
- [ ] No secret value in component state after submit, in logs, or in the DOM
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; `npx vitest run` green (incl. new tests); no
      regression in existing routes / nav / screens
- [ ] Code reviewed

## Notes

One `simple-construction-bolt` (3 stages) — client plumbing, one route, one card. All three
stories are **Must**: with no shared key, the owner key control (story 003) is the only way to
enable Claude for a household, so it can't slip. The model/limit inputs are the softer part and
could be trimmed under pressure. Use `supabase.functions.invoke` so the session token is
attached automatically. Keep the `/settings` shell minimal — it exists here so later settings
have a home, not to be filled out now.
