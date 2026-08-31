---
id: 002-settings-route-and-test-connection
unit: 002-settings-ui
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 039-settings-ui
implemented: true
---

# Story: 002-settings-route-and-test-connection

## User Story

**As a** signed-in household member
**I want** a Settings page with a "Test Connection" button for Claude
**So that** I can confirm the AI integration is working (and, later, manage other household
settings from the same place)

## Acceptance Criteria

- [ ] **Given** the router, **Then** a `/settings` route renders a `SettingsPage` for any
      signed-in user; unauthenticated access redirects to login like other protected routes
- [ ] **Given** the app nav (the left rail at md+ / the header/menu on phone), **Then** there
      is a **Settings** link near sign-out that routes to `/settings`
- [ ] **Given** `/settings`, **Then** it shows a single **"Claude / AI"** card (room for more
      cards later) containing a **Test Connection** button
- [ ] **Given** a press of **Test Connection**, **Then** the button shows a loading state and
      calls `callClaude({ feature: 'connection_test', messages: [{ role: 'user', content:
    'ping' }], maxTokens: 16 })`
- [ ] **Given** a successful response, **Then** the card shows `✓ Connected — {model}, {N} ms`
      (from `usage`-less success shape: `model` + `latencyMs`)
- [ ] **Given** a `ClaudeError`, **Then** the card shows a mapped, friendly message:
      `rate_limited` → "Daily limit reached — try again tomorrow";
      `no_api_key` → "No Claude API key set for this household — an owner can add one below";
      `upstream_error` / `timeout` → "Claude is unavailable right now";
      `bad_request` → "Something's misconfigured (bad request)";
      `no_household` → "Your account isn't attached to a household"
- [ ] **Given** repeated presses, **Then** the button is disabled while a call is in flight
- [ ] **Given** existing routes / nav / screens, **Then** they are unchanged apart from the new
      link
- [ ] **Given** `src/features/settings/*.test.tsx`, **Then** tests cover: route renders for a
      signed-in user; Test Connection loading → success text; each `ClaudeError.code` → its
      message; button disabled during the call — all with `callClaude` mocked

## Technical Notes

- New feature folder `src/features/settings/` — `SettingsPage.tsx`, `ClaudeAiCard.tsx`.
- Follow the existing layout conventions (the desktop-layout / kitchen-table theme work) — a
  card consistent with the rest of the app; no new UI-library dependency.
- The success line uses the function's `{ model, latency_ms }` — the Test Connection call does
  not need to display token usage.
- Keep `ClaudeAiCard` presentational where practical; the `callClaude` invocation + state can
  live in a small local hook or the component.

## Dependencies

### Requires

- `001-claude-api-client` — `callClaude`, `ClaudeError`, `ClaudeErrorCode`
- Router + nav components (existing)
- `001-claude-proxy-service` deployed for a real end-to-end press (mock suffices for tests)

### Enables

- `003-owner-ai-controls` — adds owner-only sections to the same card
- Later intents — add more cards to `/settings`

## Edge Cases

| Scenario                                 | Expected Behavior                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| User navigates away mid-call             | Call is abandoned; no state update on an unmounted component               |
| Slow response (several seconds)          | Loading state persists; no timeout UI in v1 (function/SDK handle timeouts) |
| `/settings` deep-linked while logged out | Same protected-route redirect as `/plan` etc.                              |

## Out of Scope

- Owner-only key / model / limit controls → story 003
- Any other settings content
- A global "AI status" indicator elsewhere in the app
