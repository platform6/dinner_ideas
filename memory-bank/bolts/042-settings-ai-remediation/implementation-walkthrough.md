---
stage: implement
bolt: 042-settings-ai-remediation
created: '2026-09-01T00:55:00Z'
---

## Implementation Walkthrough: settings-ai-remediation (bolt 042)

> **Post-bolt fix (2026-09-01, `ec41f22`).** FR-6 as built here kept `updateAiConfig` on a
> PostgREST `.upsert()`. That `42501`'d on prod (`household_ai_config` has column-only grants
> — ADR-4 — and prod's PostgREST needs table-level `UPDATE` for `ON CONFLICT DO UPDATE`).
> Replaced by migration `20260901120000_ai_config_write_rpc.sql` + `security definer` RPCs
> `set_ai_model_override` / `set_ai_daily_call_limit`; `updateAiConfig` now `.rpc(...)`. The
> provenance trigger and everything else in this bolt are unchanged. See
> `../../intents/008-claude-proxy-review-remediation/deployment/deployment-plan.md` and
> `../../standards/decision-index.md` ADR-6.

### Summary

The `/settings` "Claude / AI" card no longer shows a stale daily-limit, `callClaude` can no
longer hang forever, the dead unmount effect is gone, and AI-config edits are stamped
`updated_by` / `updated_at` by a database trigger instead of the browser clock. Closes review
findings 1, 8, 9, 10 — the last of intent `008`.

### Structure Overview

Three small client edits plus one append-only migration. The model / daily-limit controls
(which read the `['ai-config']` query) now render only once that query resolves, so the
uncontrolled-input "mount-time fallback" bug can't happen; the limit field is a controlled
input seeded from the loaded value. `callClaude` wraps its `fetch` in an `AbortController`.
`updateAiConfig` stops sending provenance columns; a `BEFORE INSERT OR UPDATE` trigger owns
them, and they are column-revoked from `authenticated`.

### Completed Work

- [x] `supabase/migrations/20260901000000_ai_config_provenance.sql` _(new, append-only)_ —
      `stamp_household_ai_config_provenance()` (`security definer`, `search_path = ''`) sets
      `NEW.updated_by := (select auth.uid())` and `NEW.updated_at := now()`;
      `trg_household_ai_config_provenance` `before insert or update` trigger;
      `revoke insert/update (updated_at, updated_by) … from authenticated`. ROLLBACK block
      included.
- [x] `src/features/settings/ClaudeAiCard.tsx` — - **Finding 10**: removed `useEffect(() => () => setKeyInput(''), [])` and its comment;
      `useEffect` dropped from the `react` import. - **Finding 1**: the Model `<Select>` and the "Daily call limit" `<Input>` are wrapped
      in `{config.isSuccess && (…)}` so they mount once, with data present. The limit input
      is now **controlled** — `value={limitValue}` where `limitValue = limitEdit ??
    String(config.data.dailyCallLimit)`; `limitEdit` (a `string | null`) starts `null`
      (field tracks the loaded value) and holds the user's text once they type (so a
      background refetch can't clobber an in-progress edit). `onBlur` mutation unchanged.
- [x] `src/features/ai/api.ts` — - **Finding 8**: `CLAUDE_FETCH_TIMEOUT_MS = 60_000`; a `new AbortController()` whose
      `signal` is passed to `fetch`, aborted by a `setTimeout`, `clearTimeout` in
      `finally`. A caught error with `name === 'AbortError'` → `new ClaudeError('timeout',
    'The AI service took too long to respond.')`; any other caught error still →
      `upstream_error`.
- [x] `src/features/settings/api.ts` — - **Finding 9**: `updateAiConfig` upserts `{ household_id, ...patch }` only — the
      `updated_at: new Date().toISOString()` field is removed. Doc comment notes the
      trigger.
- [x] `src/features/settings/ClaudeAiCard.test.tsx` — new test: the limit field shows a saved
      value of `5` after the query resolves. One existing assertion changed `getByLabelText`
      → `findByLabelText` for the Model control (it now appears after load — see Deviations).
- [x] `src/features/ai/api.test.ts` — new: an `AbortError` from `fetch` → `ClaudeError` code
      `timeout`; and `fetch` receives an `AbortSignal`.
- [x] `src/features/settings/api.test.ts` _(new file)_ — `updateAiConfig` upserts without
      `updated_at` / `updated_by`; propagates an upsert error.

### Key Decisions

- **Gate model + limit on `config.isSuccess`** rather than a `key`-remount or a bare
  controlled input. `key`-remount and "render immediately, track config" both race with a
  query that resolves _while_ a test (or a very fast user) is mid-edit — the input gets
  reset/clobbered. Gating means the control mounts exactly once, after data, and never
  remounts on background refetch (`isSuccess` stays true).
- **Controlled limit input with a `limitEdit` sentinel**: before the user types, the field
  reflects the loaded value; once they type, their text wins and a refetch won't overwrite
  it. No `useEffect`.
- **Trigger, not RPC** (OQ-2): `updateAiConfig` keeps `.upsert`; smallest client change.
- **Column-revoke `updated_at` / `updated_by` from `authenticated`**: the trigger is the only
  writer, so the client can't spoof provenance even with a hand-crafted request — same
  hardening as `key_secret_id` (ADR-4). The `security definer` key RPCs are unaffected.
- **Client timeout 60 s > server 45 s**: the server's typed `timeout` stays the normal path;
  the client abort is the backstop for a function that never replies at all.

### Deviations from Plan

- The plan's "`key` on the Input" was replaced by `{config.isSuccess && …}` gating +
  controlled input after the `key` approach was found to race with the existing
  "owner changing the daily limit on blur" test (the query resolved mid-interaction and
  remounted the field). The gating approach passes every existing test with one honest
  assertion update.
- `ClaudeAiCard.test.tsx` line ~104: `getByLabelText(/^model$/i)` → `findByLabelText(...)`.
  The Model control now renders after the config query resolves (by design — it is bound to
  that data), so a synchronous `getBy` immediately after only awaiting the _key_ input is no
  longer valid. Same test intent ("owner sees the control"), just awaited.
- Tests were written in this stage (not deferred to Stage 3) because verifying the
  controlled-input / gating behaviour required running them. Stage 3 adds the pgTAP file and
  the full report.

### Dependencies Added

- None. `AbortController` / `AbortSignal` are standard web APIs.

### Developer Notes

- `tsc -b`, `eslint`, `prettier --check` clean; 30/30 vitest in `src/features/{settings,ai}`
  (14 ClaudeAiCard + 14 ai/api + 2 settings/api).
- Migration not yet applied locally — Stage 3 runs `supabase migration up --local` +
  `supabase test db`.
- `auth.uid()` in the trigger reads the request JWT claim, so it is NULL for
  superuser/migration writes (fine — not user edits) and the caller for PostgREST writes.
