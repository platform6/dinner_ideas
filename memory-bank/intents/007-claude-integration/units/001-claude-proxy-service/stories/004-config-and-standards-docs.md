---
id: 004-config-and-standards-docs
unit: 001-claude-proxy-service
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 038-claude-proxy-service
implemented: true
---

# Story: 004-config-and-standards-docs

## User Story

**As a** developer or operator of this project
**I want** the Claude integration's configuration and the new backend surface documented in
the standards
**So that** deploying it is a checklist, and future work knows the app now has a server tier
beyond Postgres

## Acceptance Criteria

- [ ] **Given** `supabase/functions/claude-proxy/README.md`, **Then** it documents: every env
      var (`ANTHROPIC_MODEL` default `claude-sonnet-5`, `AI_DAILY_CALL_LIMIT` default 25 — and
      **no `ANTHROPIC_API_KEY`**: keys are per-household, set by owners in `/settings`), how to
      set them (`supabase secrets set ANTHROPIC_MODEL=...`), the model allowlist
      (`claude-sonnet-5`, `claude-haiku-4-5`, `claude-opus-5`), the `max_tokens` ceiling
      (4096), the input-size cap, the request/response contract, and the `error_code` enum
- [ ] **Given** `ANTHROPIC_MODEL` set to a non-allowlisted value, **Then** the documented
      behavior (fail fast at function startup **or** treat every call as `bad_request`) is
      what the function actually does
- [ ] **Given** `memory-bank/standards/system-architecture.md`, **Then** it describes the
      Supabase Edge Function as a **second backend surface** beside Postgres: what runs there,
      that it holds the API key only in memory, that both JWT verification and RLS gate it, and
      that the key is the household's own (Supabase Vault) — no shared key; no key set → `no_api_key`
- [ ] **Given** `memory-bank/standards/tech-stack.md`, **Then** it lists `@anthropic-ai/sdk`
      (Deno, `npm:` specifier), Supabase Edge Functions (Deno runtime), and Supabase Vault as
      part of the stack, and names `claude-sonnet-5` as the default model
- [ ] **Given** `memory-bank/standards/decision-index.md`, **Then** it has an entry:
      "Introduce the Claude API via a Supabase Edge Function proxy; **per-household Vault key
      only, no shared key**; per-household daily call cap; every call metered in
      `ai_usage_log`."
- [ ] **Given** the docs, **Then** no standards file still implies Supabase-Postgres is the
      only backend

## Technical Notes

- Keep the README the single source of truth for operational config; the standards docs
  reference it rather than duplicating the values.
- `decision-index.md` follows the existing entry format in that file.
- If story 002 took the `pgsodium` fallback instead of Vault, reflect that in
  `system-architecture.md` and `tech-stack.md`.
- Note in `system-architecture.md` that this is the first non-DB server code and set the
  expectation that further server logic (if any) lives in Edge Functions, not a separate
  service.

## Dependencies

### Requires

- `003-claude-proxy-edge-function` — the function whose config/contract is being documented

### Enables

- Intent `008-recipe-import` — reads the contract + adds a `feature` tag

## Edge Cases

| Scenario                    | Expected Behavior                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A household has no key set  | README calls this out; the function returns `no_api_key`, not a crash; the UI points the owner to `/settings` |
| A later intent adds a model | README + the allowlist + the rate table are the three places to update; documented together                   |

## Out of Scope

- CI / deploy automation for the function (manual `supabase functions deploy` is fine for v1;
  note it in the README)
- Any shared-key concept — keys are per-household; owners rotate their own via `/settings`
