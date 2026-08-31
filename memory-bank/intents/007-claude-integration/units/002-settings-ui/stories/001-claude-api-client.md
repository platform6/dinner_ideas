---
id: 001-claude-api-client
unit: 002-settings-ui
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 039-settings-ui
implemented: true
---

# Story: 001-claude-api-client

## User Story

**As a** frontend developer (and, next, the `008-recipe-import` feature)
**I want** a small typed `callClaude` wrapper around the `claude-proxy` function
**So that** every AI caller shares one auth + error-handling path and never touches an API key

## Acceptance Criteria

- [ ] **Given** `src/features/ai/api.ts`, **Then** it exports
      `callClaude(args: { feature: string; system?: string; messages: { role: 'user' |
    'assistant'; content: string }[]; model?: string; maxTokens?: number }): Promise<{ text:
    string; model: string; usage: { inputTokens: number; outputTokens: number }; latencyMs:
    number }>`
- [ ] **Given** a call, **Then** it POSTs to the `claude-proxy` function with the current
      Supabase session's access token as `Authorization: Bearer` (via
      `supabase.functions.invoke` or an explicit fetch) — **no** API key handling on the client
- [ ] **Given** a non-200 response, **Then** it throws `ClaudeError` with a `code` field set to
      the response's `error_code` (`no_household` | `rate_limited` | `no_api_key` |
      `bad_request` | `upstream_error` | `timeout`) and the server `message`
- [ ] **Given** a network failure or unparseable body, **Then** it throws
      `ClaudeError` with `code: 'upstream_error'` (client can't reach the proxy)
- [ ] **Given** no active session, **Then** `callClaude` throws before any request
      (`code: 'no_session'` or an auth error) — it does not send an unauthenticated call
- [ ] **Given** the response `usage` (snake_case from the function), **Then** the client maps
      it to camelCase (`inputTokens` / `outputTokens`)
- [ ] **Given** `src/features/ai/api.test.ts`, **Then** it tests, against a mocked
      fetch / `functions.invoke`: the happy path shape; each `error_code` → the right
      `ClaudeError.code`; a network error → `upstream_error`; no session → throws without a
      request

## Technical Notes

- Prefer `supabase.functions.invoke('claude-proxy', { body })` — it attaches the session token
  automatically and resolves the function URL. Fall back to `fetch` + explicit
  `${SUPABASE_URL}/functions/v1/claude-proxy` only if `invoke`'s error surface is hard to map.
- `ClaudeError extends Error` with `readonly code: ClaudeErrorCode`. Export the
  `ClaudeErrorCode` union so the UI can `switch` on it exhaustively.
- No retry logic in v1 (FR-7). No caching.
- Keep the request/response types in `api.ts` mirroring bolt 038's frozen contract; add a
  short comment pointing at `supabase/functions/claude-proxy/README.md`.

## Dependencies

### Requires

- `001-claude-proxy-service` bolt 038 — the function contract (can build against the documented
  contract + a mock; integrate once deployed)
- `@supabase/supabase-js` (existing)

### Enables

- `002-settings-route-and-test-connection` — the Test Connection button calls `callClaude`
- `003-owner-ai-controls` (indirectly)
- Intent `008-recipe-import` — reuses `callClaude`

## Edge Cases

| Scenario                                       | Expected Behavior                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Function returns 200 but a body missing `text` | Throw `ClaudeError('upstream_error')` — contract violation                                   |
| Session token expired mid-call                 | Surfaces as the function's 401 → `ClaudeError` with an auth code; caller may prompt re-login |
| `feature` omitted by a caller                  | TypeScript requires it; not a runtime concern                                                |

## Out of Scope

- Any UI (that's stories 002 / 003)
- Streaming, retries, request cancellation
- A React hook wrapper (callers use `callClaude` directly in v1)
