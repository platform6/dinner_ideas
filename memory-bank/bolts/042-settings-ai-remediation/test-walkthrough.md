---
stage: test
bolt: 042-settings-ai-remediation
created: '2026-09-01T01:05:00Z'
---

## Test Report: settings-ai-remediation (bolt 042)

### Summary

- **Vitest (full repo)**: 178/178 passed, 25 files. The `src/features/{settings,ai}` slice is
  30/30 (ClaudeAiCard 14 incl. 1 new, ai/api 14 incl. 2 new, settings/api 2 new).
- **pgTAP (`supabase test db`)**: **Result: PASS** — 240 assertions / 16 files;
  `ai_config_provenance_test.sql` 13/13; the existing `ai_config_and_key_vault_test.sql`
  still 36/36 with the trigger + column-revoke installed.
- **Build**: `tsc -b` clean; `vite build` succeeds (only the pre-existing >500 kB chunk-size
  advisory).
- **Deno** (`claude-proxy`): 33/33 — untouched by this bolt, re-run as a guard.
- **Lint**: repo `eslint .` → 0 errors (1 pre-existing `no-explicit-any` warning in
  `anthropic.ts`, from `007`); `prettier --check` clean on all changed `.ts` / `.tsx`.
- **Migration**: `supabase migration up --local` applied `20260901000000_ai_config_provenance.sql`
  cleanly.

### Test Files

- [x] `supabase/tests/database/ai_config_provenance_test.sql` _(new)_ — trigger + function
      shape; `authenticated` column privileges on `updated_at` / `updated_by`; UPDATE- and
      INSERT-path stamping; the column-revoke enforced.
- [x] `src/features/settings/ClaudeAiCard.test.tsx` — +1 test; 1 existing assertion awaited.
- [x] `src/features/ai/api.test.ts` — +2 tests.
- [x] `src/features/settings/api.test.ts` _(new)_ — 2 tests.

### New / changed cases

**pgTAP (`ai_config_provenance_test.sql`, 13)**

- `stamp_household_ai_config_provenance` fn + `trg_household_ai_config_provenance` trigger
  exist and are attached `BEFORE INSERT OR UPDATE`.
- `authenticated` has **no** `UPDATE` / `INSERT` privilege on `updated_at` or `updated_by`;
  still has `UPDATE` on `daily_call_limit`.
- Owner `UPDATE … SET daily_call_limit = 7` (no provenance columns named) → succeeds;
  afterwards `updated_by` = the acting owner's uid and `updated_at` > `now() - 10s` (not the
  seeded `2000-01-01`).
- Owner `UPDATE … SET updated_at = …` → `42501` (column revoked — a hand-crafted request
  can't spoof it).
- Owner of a config-less household `INSERT`s a row → `updated_by` stamped to that owner.

**Vitest — `ClaudeAiCard.test.tsx`**

- _new_: config resolves with `dailyCallLimit: 5` → the "Daily call limit" field
  `toHaveValue(5)` (was the stale `25` before the fix).
- _changed_: "owner sees the key / model / limit controls" — `getByLabelText(/^model$/i)` →
  `findByLabelText(...)`; the Model/limit controls now mount after the `['ai-config']` query
  resolves (they are bound to its data). Same assertion intent.
- unchanged & green: Test-connection loading→success line; all 6 `ClaudeError` code→message
  mappings (incl. `timeout` → "took too long"); non-owner sees no owner controls; owner
  save-key / clear-key; owner model change; **owner daily-limit on blur → `updateAiConfig`**.

**Vitest — `ai/api.test.ts`**

- _new_: `fetch` rejects with an `AbortError` → `callClaude` throws `ClaudeError` `code:
'timeout'` (distinct from a plain network `TypeError` → `upstream_error`, still asserted).
- _new_: `fetch` is called with `init.signal instanceof AbortSignal`.

**Vitest — `settings/api.test.ts` (new)**

- `updateAiConfig('hh-1', { daily_call_limit: 7 })` → `supabase.from('household_ai_config')
.upsert({ household_id: 'hh-1', daily_call_limit: 7 }, { onConflict: 'household_id' })`; the
  payload has **no** `updated_at` and no `updated_by`.
- an upsert error is re-thrown.

### Acceptance Criteria Validation

**Story 001 — settings UI reflects config, never hangs**

- ✅ Owner with saved limit `5` → field shows `5` once the query resolves. _(vitest, new)_
- ✅ On-blur still calls `updateAiConfig(householdId, { daily_call_limit: n })` with the same
  integer/`>= 0` guard. _(existing vitest, green)_
- ✅ `callClaude` aborts its `fetch` after `CLAUDE_FETCH_TIMEOUT_MS` (60 s) and maps the abort
  to `ClaudeError('timeout')`; the card renders the mapped "took too long" message and leaves
  `loading`. _(vitest: abort→timeout + AbortSignal passed; the code→message mapping is the
  existing `it.each` `timeout` row)_
- ✅ A non-abort `fetch` rejection still → `ClaudeError('upstream_error')`. _(existing vitest)_
- ✅ No unmount-only key-clearing `useEffect`; `useEffect` import removed; key entry / save /
  clear-on-success unchanged. _(existing vitest green; `eslint` no-unused-vars clean)_

**Story 002 — AI-config write provenance**

- ✅ `updateAiConfig`'s upsert payload no longer contains `updated_at` (or `updated_by`).
  _(vitest, new)_
- ✅ After an owner edits the limit, `updated_by` = the owner's uid and `updated_at` ≈ server
  `now()`; a client-supplied `updated_at` is rejected (`42501`); `authenticated` cannot write
  either column. _(pgTAP)_
- ✅ INSERT (auto-create) path also stamps provenance. _(pgTAP)_
- ✅ `007`'s `ai_config_and_key_vault` pgTAP and `ClaudeAiCard` / `callClaude` vitest stay
  green — the `security definer` key RPCs are unaffected by the trigger / revoke.

### Issues Found

None. During implementation the plan's `key`-remount approach was found to race with the
existing "daily limit on blur" test (query resolving mid-edit remounted the field); switched
to `config.isSuccess` gating + a controlled input (see the implementation walkthrough).

### Notes

- The real "setTimeout fires → abort" wiring is exercised indirectly: the new test proves the
  `AbortError` → `timeout` mapping and that a signal is attached; the `setTimeout` /
  `clearTimeout` is trivial and covered by the happy-path tests not leaking timers.
- `supabase test db` runs against the local dev DB; it needed `supabase migration up --local`
  first (the new migration wasn't applied there). A fresh `supabase db reset` picks it up.
- Deploy (OQ-5) is now unblocked for the whole intent: `supabase db push` (migrations
  `20260831213000` + `20260901000000`) and `supabase functions deploy claude-proxy`, then
  verify, before `009-recipe-import`.
