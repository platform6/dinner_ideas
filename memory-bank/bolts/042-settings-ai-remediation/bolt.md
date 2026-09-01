---
id: 042-settings-ai-remediation
unit: 002-settings-ai-remediation
intent: 008-claude-proxy-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 001-settings-ui-reflects-config-no-hang
  - 002-ai-config-write-provenance
created: '2026-08-31T21:00:00Z'
started: '2026-09-01T00:35:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-01T00:40:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-01T00:55:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-01T01:05:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-09-01T00:10:03Z'
---

# Bolt: 042-settings-ai-remediation

## Objective

The settings-client fixes from the `007` review: the "Daily call limit" field reflects the
saved value once `['ai-config']` resolves, `callClaude` bounds its `fetch` with an
`AbortController` so Test Connection can't hang, the dead unmount-only `useEffect` is removed
(FR-5), and AI-config edits are stamped `updated_by = auth.uid()` / `updated_at = now()` by a
`BEFORE INSERT OR UPDATE` trigger while the client stops sending `updated_at` (FR-6).

## Stories Included

- [ ] **001-settings-ui-reflects-config-no-hang**: controlled/gated daily-limit field;
      `AbortController` timeout in `callClaude` → `ClaudeError('timeout')`; delete the dead
      `useEffect` — Priority: Should
- [ ] **002-ai-config-write-provenance**: `stamp_household_ai_config_provenance` trigger;
      `updateAiConfig` keeps `.upsert`, drops `updated_at` — Priority: Should

Independent of each other; they share `ClaudeAiCard.tsx` / `settings/api.ts` so they ship
together.

## Expected Outputs

- `src/features/settings/ClaudeAiCard.tsx` — daily-limit input bound to the resolved
  `dailyCallLimit` (controlled / `isSuccess`-gated / keyed); `useEffect(() => () =>
setKeyInput(''), [])` + comment removed
- `src/features/ai/api.ts` — `callClaude` uses `AbortController` (`CLIENT_TIMEOUT_MS` ≈ 60 s);
  `AbortError` → `new ClaudeError('timeout', …)`; `clearTimeout` in `finally`
- `src/features/settings/api.ts` — `updateAiConfig` upsert payload no longer includes
  `updated_at`
- `supabase/migrations/<ts>_ai_config_provenance.sql` (append-only) — `security definer`
  trigger function + `before insert or update` trigger on `household_ai_config`
- `src/features/settings/*.test.tsx` / `src/features/ai/*.test.ts` — limit field shows a
  non-default saved value after load; hung proxy ⇒ timeout surfaced + button leaves loading;
  `updateAiConfig` omits `updated_at`
- `supabase/tests/database/*.sql` — pgTAP: an update stamps `updated_by` = the caller and
  `updated_at` ≈ `now()`, ignoring client-supplied values
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- None. Independent of 040 / 041 (no shared files) — can run in parallel or any time after
  `007`.

### Unit Dependencies (cross-unit)

- `007-claude-integration` (committed): `/settings` card, `callClaude`, `updateAiConfig`,
  `household_ai_config` (columns `updated_by` / `updated_at` already exist).

### External

- Supabase PostgREST — `auth.uid()` must resolve in the trigger for a JWT-carrying call
  (it does). Match `007`'s `security definer` / `search_path = ''` conventions.

### Enables

- Nothing downstream. Closes the intent alongside bolts 040 / 041.

## Success Criteria

- [ ] `vitest` green (new + existing); `tsc -b` / `eslint` / `vite build` clean
- [ ] Owner with saved limit `5` ⇒ field shows `5`, not `25`
- [ ] Proxy stubbed to hang ⇒ Test Connection surfaces a timeout within ~60 s, button leaves
      `loading`
- [ ] No unmount-only key-clearing `useEffect` remains; key entry/save unchanged
- [ ] After an owner edits model / limit ⇒ row has `updated_by` = owner, `updated_at` ≈ server
      now; client sends neither
- [ ] `supabase db reset` + trigger pgTAP green
- [ ] `007` settings tests pass with only the `updated_at`-omission diff
- [ ] Code reviewed

## Notes

Smallest bolt in the intent — `avg_complexity: 1`. Only cross-surface note: keep
`CLIENT_TIMEOUT_MS` (≈60 s) above bolt 041's server SDK `timeout` so the server's typed
`timeout` error is the normal path and the client abort is just the backstop.
