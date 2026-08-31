---
stage: test
bolt: 038-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T18:45:00Z'
---

## Test Report: claude-proxy-service (bolt 038)

### Summary

- **Deno unit tests** (`supabase/functions/claude-proxy/deno task test`): **13 / 13 pass**.
  `handleProxy` is pure over its `Deps`, so every pipeline branch + the metering invariant is
  covered with a mocked Anthropic client and fake Supabase calls — no network, no DB.
- **`deno check index.ts`**: exit 0 — full type-check including the real `@anthropic-ai/sdk`
  (pinned `0.122.0`) and `@supabase/supabase-js` (`2.112.4`) imports and `Deno.serve`.
- **pgTAP**: unchanged (bolt 038 adds no migration) — 14 files / 210 tests still green.
- `deno` was installed via `npm i -g deno` (2.9.6) to run the above.

### Deliverables

`supabase/functions/claude-proxy/`: `index.ts`, `pipeline.ts`, `anthropic.ts`, `rates.ts`,
`errors.ts`, `cors.ts`, `index.test.ts`, `deno.json` (pinned deps + `test` task),
`deno.lock`, `README.md`; `supabase/functions/.env.example`. Standards updates:
`system-architecture.md` (Edge Functions as a second backend surface + the Claude call path),
`tech-stack.md` (Anthropic SDK / Deno / Vault; AI section), `decision-index.md` (ADR-4, added
in bolt 037).

### Acceptance Criteria Validation

**Story 003 — claude-proxy-edge-function**

- ✅ Contract: `POST` `{feature, system?, messages[], model?, max_tokens?}` + `Bearer` →
  `{text, model, usage, latency_ms}` / `{error_code, message}`.
- ✅ No / invalid token → 401, **no** Anthropic call, **no** log row (tests 1–2).
- ✅ Authenticated, no household → 403 `no_household`, no log row (test 3).
- ✅ Pipeline order: auth → household → load config (defaults if absent) → rate-limit →
  resolve key → validate → Anthropic → write log → respond (`pipeline.ts`; covered branch by
  branch).
- ✅ Happy path → 200 + real `usage`; **exactly one** `ai_usage_log` row `ok=true` with token
  counts and `est_cost_usd` from the in-function rate table (test 4).
- ✅ `count(today) >= daily_call_limit` → 429 `rate_limited` + one `ok=false` row; Anthropic
  **not** called (test 5); a changed limit is read per request (`loadConfig` each call).
- ✅ `resolve_ai_key` null → 409 `no_api_key` + one `ok=false` row (test 6).
- ✅ Bad model / `max_tokens` > 4096 / empty `messages` / blank `feature` / input > 50 KB →
  400 `bad_request`, logged (tests 7–8); unparseable JSON → 400, `feature` logged as
  `"unknown"` (test 9).
- ✅ Anthropic error → 502 `upstream_error` + one `ok=false` row (test 10); timeout → 502
  `timeout` (test 11). `anthropic.ts` maps SDK failures by name; a `refusal` is **not** an
  error (returns 200).
- ✅ Key never in a response, a log field, or `console` — `pipeline.ts` never references the
  key after passing it to `callAnthropic`; `UsageRow` has no key field.
- ✅ `feature` stored verbatim; `>40` chars or missing → `bad_request`.
- ✅ Model resolution `request → config.model_override → env → claude-sonnet-5` (test 12);
  `estCostUsd` for all three models (test 13).
- ✅ 1:1 log-row invariant asserted on every non-401 branch.

**Story 004 — config-and-standards-docs**

- ✅ `claude-proxy/README.md` documents env vars (`ANTHROPIC_MODEL`, `AI_DAILY_CALL_LIMIT`,
  and explicitly **no `ANTHROPIC_API_KEY`**), the allowlist, the ceiling, the input cap, the
  frozen contract, the `error_code`↔HTTP table, and deploy.
- ✅ `system-architecture.md` now describes two backend surfaces; no longer implies
  Postgres-only.
- ✅ `tech-stack.md` lists `@anthropic-ai/sdk` (Deno), Supabase Edge Functions, Supabase
  Vault; names `claude-sonnet-5` as default; adds an "AI / LLM" section.
- ✅ `decision-index.md` has ADR-4 (per-household key in Vault).
- ✅ Non-allowlisted `ANTHROPIC_MODEL` behaviour documented (passed through → surfaces as
  `upstream_error`; keep it in the allowlist).

### Issues Found (in-bolt, fixed)

1. `deno check` couldn't resolve `npm:@anthropic-ai/sdk` without a `deno.json` +
   `nodeModulesDir`. Added `deno.json` with pinned imports (`@anthropic-ai/sdk@0.122.0`,
   `@supabase/supabase-js@2.112.4`) and switched to bare specifiers.
2. To keep the Deno unit tests offline, `pipeline.ts` imports `type { Message }` from
   `anthropic.ts` (type-only, erased) so running the tests never pulls the npm SDK.

### Deferred / follow-ups (batched to end-of-run)

- **Not run here**: `supabase functions deploy claude-proxy` (needs prod credentials; a first
  for this project) and a **real Claude call** (needs a household key — the project owner adds
  one on `/settings` as the acceptance test). The non-Anthropic branches are all unit-covered
  and can also be hit via `supabase functions serve` + `curl`.
- **`@anthropic-ai/sdk` version**: pinned to `0.122.0` (latest at build time). Re-check
  `messages.create` response shape (`content[].type/text`, `usage.input_tokens/output_tokens`)
  if bumped.
- **Prod secrets**: `supabase secrets set ANTHROPIC_MODEL AI_DAILY_CALL_LIMIT --project-ref <ref>`
  before deploy.
- **CORS allowlist** (`cors.ts` `STATIC_ALLOW`) currently hard-codes
  `https://dinnerideas.netlify.app` + `*.netlify.app` + localhost. Confirm the prod domain.
