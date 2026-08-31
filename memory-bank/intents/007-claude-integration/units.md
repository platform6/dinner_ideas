---
intent: 007-claude-integration
phase: inception
status: units-decomposed
updated: '2026-08-31T16:35:00Z'
---

# Claude Integration - Unit Decomposition

## Units Overview

Two units, split on the same backend/frontend seam `catalog.yaml` uses for `full-stack-web`.
The bulk of the intent is the backend integration layer (new tables, RLS, key-storage
functions, and the Edge Function), so unit 1 carries FR-1..FR-6, FR-9, FR-10. Unit 2 is the
thin client: a typed `callClaude` wrapper and a new `/settings` route with the "Claude / AI"
card (FR-7, FR-8).

### Unit 1: `001-claude-proxy-service`

**Description**: The whole backend integration layer. Two new tables (`household_ai_config`,
`ai_usage_log`) with RLS; three `security definer` SQL functions for per-household key storage
in Supabase Vault (`set_household_ai_key`, `clear_household_ai_key`, `resolve_ai_key`); the
`claude-proxy` Supabase Edge Function (Deno) that verifies the caller's JWT, resolves their
household, enforces the per-household daily call cap, resolves the household's own key from Vault
(no key → `no_api_key`), validates the model allowlist / `max_tokens` ceiling / input
size, calls Anthropic via `@anthropic-ai/sdk` (non-streaming, default `claude-sonnet-5`),
writes one `ai_usage_log` row per attempt, and returns a typed result or error; its README and
the config/secret setup; and the standards-doc updates recording the new backend surface.

**Unit Type**: backend
**Default Bolt Type**: ddd-construction-bolt

**Stories**:

- 001-ai-config-and-usage-tables — `household_ai_config` + `ai_usage_log` + RLS + indexes
- 002-household-key-storage-functions — Vault-backed `set` / `clear` / `resolve` key functions
- 003-claude-proxy-edge-function — the Deno function: auth, rate limit, key resolve, validate,
  Anthropic call, per-attempt logging, typed errors
- 004-config-and-standards-docs — function README + secret setup; `system-architecture.md`,
  `tech-stack.md`, `decision-index.md` updates

**Deliverables**:

- New migrations under `supabase/migrations/` (append-only): `household_ai_config`,
  `ai_usage_log`, their RLS, indexes, allowlist check; `set_household_ai_key(text)`,
  `clear_household_ai_key()`, `resolve_ai_key(uuid)` functions
- `supabase/functions/claude-proxy/` — `index.ts` + helpers + `README.md`
- `supabase/tests/database/*.sql` — pgTAP for the new RLS (owner-only config writes, member
  reads, no client writes to `ai_usage_log`), the key functions' owner gating, and
  "key absent from every client-readable surface"
- `supabase/functions/claude-proxy/*_test.ts` — Deno tests with a mocked Anthropic client
  covering happy path, `no_household`, `rate_limited`, `no_api_key`, `bad_request`,
  `upstream_error`
- `memory-bank/standards/system-architecture.md`, `standards/tech-stack.md`,
  `standards/decision-index.md` updates

**Dependencies**:

- Depends on: `004-account-model` (complete) — `households` / `profiles` / `household_members`,
  `current_user_household_id()`
- Depended by: `002-settings-ui` (this intent); `008-recipe-import` (next intent) — its first
  real consumer
- External: Supabase Edge Functions + Supabase Vault must be enabled on the project; Anthropic
  API. **No shared key** — each household's owner supplies their own via `/settings`

**Estimated Complexity**: M–L — the individual pieces are standard (two tables + RLS, an HTTP
handler, an SDK call), but three things are **new to this project**: the first Supabase Edge
Function, the first external-API integration, and the first use of Supabase Vault. No novel
algorithms; the risk is integration/setup, not logic.

### Unit 2: `002-settings-ui`

**Description**: The client layer. A typed `callClaude` wrapper (`src/features/ai/api.ts`) that
POSTs to `claude-proxy` with the session token and throws a typed `ClaudeError`; a new
`/settings` route (React Router) with a nav link; and the "Claude / AI" card — a **Test
Connection** button for any member, plus owner-only controls to set/clear the per-household key
(via `supabase.rpc`, write-only), pick a model override, and set the daily call limit
(`update household_ai_config`). No other settings; `/settings` is scaffolded here so the future
household `dinners_per_week` setting has a home.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Stories**:

- 001-claude-api-client — `callClaude(...)` + `ClaudeError`, session-bearer auth, error mapping
- 002-settings-route-and-test-connection — `/settings` route + nav link + Test Connection card
- 003-owner-ai-controls — owner-only key set/clear, model override, daily limit

**Deliverables**:

- `src/features/ai/api.ts` (+ test) — `callClaude`, `ClaudeError`, `error_code` mapping
- `src/features/settings/` — `SettingsPage.tsx`, the `ClaudeAiCard` component, a small hook for
  reading/writing `household_ai_config`
- Router + nav wiring (`/settings` route; a link near sign-out)
- `src/features/settings/*.test.tsx` — Test Connection states; owner vs non-owner visibility;
  key set/clear flow (mocked)

**Dependencies**:

- Depends on: `001-claude-proxy-service` — needs the deployed function, the `set/clear key`
  RPCs, and `household_ai_config` to exist (FE work can start against a mock, integrate after)
- Depended by: `008-recipe-import` (next intent) — reuses `callClaude`
- External: `@supabase/supabase-js` (existing) for the RPC / table writes and the function call

**Estimated Complexity**: S–M — one new route, one card, owner gating, and a typed fetch
wrapper. No novel patterns; follows existing feature-folder + Vitest/RTL conventions.

## Unit Dependency Graph

```text
[004-account-model (complete)]
        │
        ▼
[001-claude-proxy-service] ──► [002-settings-ui] ──► (008-recipe-import, future)
```

## Execution Order

1. `001-claude-proxy-service` — tables + RLS + key functions (bolt 037), then the Edge
   Function + docs (bolt 038)
2. `002-settings-ui` — client + `/settings` + AI card (bolt 039); can begin against a mock once
   the request/response contract from bolt 038 is fixed, integrate once 038 deploys

## Requirement-to-Unit Mapping

- **FR-1** (`household_ai_config` table) → `001-claude-proxy-service`
- **FR-2** (per-household API key storage in Vault — **the only enable path**, Must) →
  `001-claude-proxy-service` (storage + functions); the owner **key control UI** is in FR-8 /
  `002-settings-ui` and is likewise Must
- **FR-3** (`ai_usage_log` table) → `001-claude-proxy-service`
- **FR-4** (`claude-proxy` Edge Function) → `001-claude-proxy-service`
- **FR-5** (per-household daily rate limit) → `001-claude-proxy-service`
- **FR-6** (usage + cost logging) → `001-claude-proxy-service`
- **FR-7** (frontend AI client) → `002-settings-ui`
- **FR-8** (`/settings` page + AI card) → `002-settings-ui`
- **FR-9** (configuration & limits) → `001-claude-proxy-service`
- **FR-10** (standards & decision docs) → `001-claude-proxy-service`
