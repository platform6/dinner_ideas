---
stage: plan
bolt: 042-settings-ai-remediation
created: '2026-09-01T00:35:00Z'
---

## Implementation Plan: settings-ai-remediation (bolt 042)

### Objective

The settings-client fixes from the `007` review, plus a provenance trigger. Stories
`001-settings-ui-reflects-config-no-hang` (FR-5) and `002-ai-config-write-provenance` (FR-6).
Closes the last 4 review findings (1, 8, 9, 10). Last bolt of intent `008`.

### Deliverables

1. **`src/features/settings/ClaudeAiCard.tsx`** —
   - **Finding 1** (stale field): the "Daily call limit" `<Input>` gets
     `key={config.data?.dailyCallLimit ?? 'loading'}` so it remounts once the `['ai-config']`
     query resolves and re-reads `defaultValue` as the saved value. Keeps the existing
     uncontrolled + on-blur pattern. (Alt considered: fully controlled `value` + a
     `useEffect` sync — more code, same result.)
   - **Finding 10** (dead effect): delete `useEffect(() => () => setKeyInput(''), []);` (line 53) and its comment; drop `useEffect` from the `react` import (no other use).
2. **`src/features/ai/api.ts`** —
   - **Finding 8** (no timeout): wrap the `fetch` in an `AbortController` with
     `CLAUDE_FETCH_TIMEOUT_MS = 60_000`; `clearTimeout` in `finally`. An `AbortError`
     (`err.name === 'AbortError'`) maps to `new ClaudeError('timeout', 'The AI service took
too long to respond.')`; any other thrown error keeps mapping to `upstream_error`.
     `'timeout'` is already a `ClaudeErrorCode` and already in `ERROR_MESSAGE`.
3. **`src/features/settings/api.ts`** —
   - **Finding 9** (client clock / no `updated_by`): `updateAiConfig` drops
     `updated_at: new Date().toISOString()` from the `.upsert(...)` payload — it now sends
     only `{ household_id, ...patch }`. Provenance is stamped server-side (deliverable 4).
4. **`supabase/migrations/20260901000000_ai_config_provenance.sql`** _(new, append-only)_ —
   - `stamp_household_ai_config_provenance()` — `BEFORE INSERT OR UPDATE` trigger function
     (`security definer`, `search_path = ''`): `NEW.updated_by := (select auth.uid());
NEW.updated_at := now();` unconditionally.
   - `trg_household_ai_config_provenance` trigger on `public.household_ai_config`.
   - `revoke insert (updated_at, updated_by)` / `revoke update (updated_at, updated_by)` on
     `household_ai_config` from `authenticated` — the trigger is now the only writer of those
     columns (same column-revoke hardening as `key_secret_id` in `007` / ADR-4). The
     `security definer` key RPCs (`set_/clear_household_ai_key`) are unaffected — they run as
     the table owner and the trigger re-stamps to the same values.
   - ROLLBACK block.
5. **Tests**
   - `src/features/settings/ClaudeAiCard.test.tsx` — new: the daily-limit field shows a
     non-default saved value (`dailyCallLimit: 5`) after the config query resolves.
   - `src/features/ai/api.test.ts` — new: an `AbortError` from `fetch` → `ClaudeError` with
     `code: 'timeout'` (distinct from a plain network error → `upstream_error`).
   - `src/features/settings/api.test.ts` _(new file)_ — `updateAiConfig` calls `.upsert` with
     `{ household_id, daily_call_limit }` and **no** `updated_at`.
   - `supabase/tests/database/ai_config_provenance_test.sql` _(new)_ — pgTAP: trigger +
     function exist; an owner `update` stamps `updated_by = auth.uid()` and a fresh
     `updated_at` even when neither is in the statement; a client-supplied `updated_at` is
     ignored (overwritten with `now()`); `authenticated` has no column privilege on
     `updated_at` / `updated_by`.

### Not in scope

- Any Edge Function change (unit `001`, done).
- Redesigning the card, new controls, a usage view.
- Retry logic in `callClaude`.
- A config-change audit log table; backfilling `updated_by` on existing rows.

### Technical approach / notes

- **`key` over controlled input**: smallest diff, preserves the on-blur mutation exactly, and
  is trivially assertable (`toHaveValue(5)` after `findByLabelText`). The field briefly shows
  `25` while the query is pending (unchanged from today's first paint) then remounts to the
  real value.
- **Timeout value 60 s**: sits above unit `001`'s server SDK `timeout` (~45 s) so the
  server's typed `timeout` is the normal path; the client abort is the backstop for a truly
  wedged function. Uses `AbortSignal` on `fetch` — standard, no library.
- **Trigger vs. RPC** (inception OQ-2, resolved): trigger. `updateAiConfig` keeps `.upsert`;
  no switch to `.rpc`. Owner-only is already enforced by RLS.
- **`auth.uid()` in the trigger**: reads the request JWT claim, not the executing role — so
  it resolves to the caller for a PostgREST upsert and stays NULL for a superuser/migration
  write (acceptable — not a user edit). Matches how `007`'s key functions read it.
- Existing pgTAP (`ai_config_and_key_vault_test.sql`) does not assert provenance columns, so
  it stays green with the trigger installed — verified in Stage 3.

### Dependencies

- `007-claude-integration` (committed): `/settings` card, `callClaude`, `updateAiConfig`,
  `household_ai_config` (`updated_by` / `updated_at` columns already exist).
- Independent of bolts `040` / `041` — no shared files.
- Frontend: Vitest + RTL + Chakra (all present). SQL: `supabase test db` / `migration up`.
- No new package.

### Acceptance Criteria

- [ ] Loading `/settings` as an owner whose saved `dailyCallLimit` is `5` ⇒ the field shows
      `5` (not `25`) once `['ai-config']` resolves. _(vitest)_
- [ ] The daily-limit on-blur still calls `updateAiConfig(householdId, { daily_call_limit:
    n })` with the same integer/`>= 0` validation. _(existing vitest, still green)_
- [ ] `callClaude`'s `fetch` is aborted after `CLAUDE_FETCH_TIMEOUT_MS`; an abort ⇒
      `ClaudeError('timeout', …)`; the card renders the mapped "took too long" message and
      the button leaves `loading`. _(vitest: abort→timeout; card mapping already covered)_
- [ ] A non-abort `fetch` rejection still ⇒ `ClaudeError('upstream_error')`. _(existing
      vitest, still green)_
- [ ] No unmount-only key-clearing `useEffect` remains; `useEffect` import removed; key
      entry/save/clear-on-success unchanged. _(existing vitest, still green)_
- [ ] `updateAiConfig`'s upsert payload no longer contains `updated_at`. _(new vitest)_
- [ ] After an owner edits model or limit, `household_ai_config.updated_by` = the owner's uid
      and `updated_at` ≈ server `now()`; a client-supplied `updated_at` is ignored;
      `authenticated` cannot write either column. _(pgTAP)_
- [ ] `007`'s `ClaudeAiCard` / `callClaude` / `ai_config_and_key_vault` tests stay green.
- [ ] `tsc -b` / `eslint` / `vite build` clean; `deno`-side untouched.

### Open items for the checkpoint

1. `key`-remount vs. fully-controlled input for the stale field — recommending `key` (minimal).
2. Column-revoke of `updated_at` / `updated_by` from `authenticated` in the same migration —
   recommending yes (belt-and-braces, matches `key_secret_id`); it makes the client
   physically unable to spoof provenance, not just "we don't send it".
3. `CLAUDE_FETCH_TIMEOUT_MS = 60_000` — OK?
4. Migration filename `20260901000000_ai_config_provenance.sql`.
