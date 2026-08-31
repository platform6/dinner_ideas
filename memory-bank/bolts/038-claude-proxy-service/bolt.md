---
id: 038-claude-proxy-service
unit: 001-claude-proxy-service
intent: 007-claude-integration
type: ddd-construction-bolt
status: complete
created: '2026-08-31T16:35:00Z'
started: '2026-08-31T18:05:00Z'
completed: '2026-08-31T18:45:00Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-31T18:12:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-31T18:18:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-08-31T18:20:00Z'
    artifact: '(no new ADR - ADR-4 was created in bolt 037)'
  - name: implement
    completed: '2026-08-31T18:40:00Z'
    artifact: 'supabase/functions/claude-proxy/'
  - name: test
    completed: '2026-08-31T18:45:00Z'
    artifact: ddd-03-test-report.md
stories:
  - 003-claude-proxy-edge-function
  - 004-config-and-standards-docs
requires_bolts:
  - 037-claude-proxy-service
enables_bolts:
  - 039-settings-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 038-claude-proxy-service

## Objective

Build and document the `claude-proxy` Supabase Edge Function — the app's only path to the
Anthropic API. It authenticates the caller, resolves their household, enforces the per-household
daily call cap, resolves the household's own key from Vault (no key → `no_api_key`; no shared key exists),
validates the model allowlist / `max_tokens` ceiling / input size, calls Claude
(`@anthropic-ai/sdk`, non-streaming, default `claude-sonnet-5`), writes one `ai_usage_log` row
per attempt, and returns a typed result or error.

## Stories Included

- [ ] **003-claude-proxy-edge-function**: the Deno function + its pipeline (JWT verify → resolve
      household → rate-limit → resolve key → validate → Anthropic call → per-attempt log →
      typed response), plus Deno tests against a mocked Anthropic client covering happy path,
      `no_household`, `rate_limited`, `no_api_key`, `bad_request`, `upstream_error` — Priority:
      Must
- [ ] **004-config-and-standards-docs**: `supabase/functions/claude-proxy/README.md` (env vars,
      allowlist, ceiling, contract, `error_code` enum) + updates to
      `standards/system-architecture.md` (2nd backend surface), `standards/tech-stack.md` (new
      deps), `standards/decision-index.md` — Priority: Must

## Expected Outputs

- `supabase/functions/claude-proxy/` — `index.ts` + helpers (auth, rate-limit, key-resolve,
  validate, cost table) + `README.md`
- `supabase/functions/claude-proxy/*_test.ts` — Deno tests (mocked Anthropic); assert the 1:1
  `ai_usage_log`-row invariant on every branch
- `memory-bank/standards/system-architecture.md`, `standards/tech-stack.md`,
  `standards/decision-index.md` — updated
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md` /
  `ddd-03-test-report.md`

## Dependencies

### Bolt Dependencies (within intent)

- **037-claude-proxy-service** (Required): `household_ai_config`, `ai_usage_log`,
  `resolve_ai_key`

### Unit Dependencies (cross-unit)

- **004-account-model** (complete): `current_user_household_id()` / `household_members` for
  server-side household + owner resolution

### External

- **Supabase Edge Functions** enabled. **First task**: prove `supabase functions deploy
claude-proxy` works on this project with a trivial handler before building the pipeline.
- Supabase secrets `ANTHROPIC_MODEL`, `AI_DAILY_CALL_LIMIT` set. **No `ANTHROPIC_API_KEY`** —
  keys are per-household (Vault) only; a real end-to-end test uses a key set on a test
  household via `set_household_ai_key`. (A dev may export a throwaway key locally for the
  initial Anthropic-call spike; it is not wired into the shipped function.)
- **Anthropic API** reachable; `npm:@anthropic-ai/sdk` importable in the Deno runtime.

### Enables

- **039-settings-ui** — `callClaude` targets this function
- **Intent 008-recipe-import** — first real caller

## Success Criteria

- [ ] Unauth → 401 (no Anthropic call, no log row); no household → 403 `no_household`
- [ ] Household with no key set → 409 `no_api_key` + one `ok=false` log row (no Anthropic call)
- [ ] Happy path (key set on the household) → 200 `{ text, model, usage, latency_ms }` + exactly one `ok=true`
      `ai_usage_log` row with real tokens and a correct `est_cost_usd`
- [ ] `daily_call_limit = N`: call N+1 in a UTC day → 429 `rate_limited` + exactly one log row;
      a changed limit takes effect on the next call with no redeploy
- [ ] Bad model / over-ceiling `max_tokens` / over-size input → 400 `bad_request` (logged);
      Anthropic 5xx / network / 429 → 502 `upstream_error` (logged)
- [ ] The API key never appears in a response, a log line, or an `ai_usage_log` row
- [ ] Deno tests green; `supabase test db` still green
- [ ] README documents every env var + the frozen request/response contract + `error_code`
      enum; no standards file still implies Postgres is the only backend
- [ ] Code reviewed

## Notes

Highest-uncertainty bolt of the intent — first Edge Function, first external-API call, first
Vault consumer — but no novel logic. De-risk in this order: (1) deploy a trivial function,
(2) verify a `resolve_ai_key` call from the function's service-role client, (3) one real
Anthropic round-trip, (4) then assemble the pipeline and the failure branches. Freeze the
request/response shape + `error_code` enum early and write it into the README — bolt 039 and
intent 008 both build against it. Use the `claude-api` skill's guidance: official SDK,
non-streaming `messages.create`, typed error classes (not string matching), don't lowball
`max_tokens`.
