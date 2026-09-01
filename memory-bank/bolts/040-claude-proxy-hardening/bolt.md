---
id: 040-claude-proxy-hardening
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 001-fail-closed-daily-cap
  - 002-count-genuine-usage-atomic-cap
  - 003-surface-resolver-errors
created: '2026-08-31T21:00:00Z'
started: '2026-08-31T21:30:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-31T21:45:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-31T22:05:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-31T22:35:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 041-claude-proxy-hardening
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 4
completed: '2026-08-31T23:44:23Z'
---

# Bolt: 040-claude-proxy-hardening

## Objective

Make the `claude-proxy` daily-call cap and its dependency resolvers trustworthy: fail **closed**
on a broken count or a non-numeric env var (FR-1), count only genuine-usage rows and enforce
the cap with one atomic DB operation so concurrency and invalid-request floods can't evade it
(FR-2), and return `upstream_error` when `resolveHousehold` / `loadConfig` / `resolveKey` fail
rather than the misleading `no_household` / `no_api_key` (FR-3). One append-only migration for
the atomic primitive. The frozen contract and the happy path are unchanged; fail-closed paths
reuse `upstream_error` (OQ-1).

## Stories Included

- [ ] **001-fail-closed-daily-cap**: `countToday` propagates its query error (no `count ?? 0`);
      non-numeric `AI_DAILY_CALL_LIMIT` → `DEFAULT_DAILY_LIMIT`, never `NaN`; unverifiable count
      → `502 upstream_error` + one row, no Anthropic call — Priority: **Must**
- [ ] **002-count-genuine-usage-atomic-cap**: cap counts only `ok = true OR error_code IN
    ('rate_limited','upstream_error','timeout')`; check + usage insert made atomic (new
      `reserve_ai_call` primitive) so N concurrent boundary requests never exceed the limit —
      Priority: **Must**
- [ ] **003-surface-resolver-errors**: `resolveHousehold` / `loadConfig` / `resolveKey`
      distinguish query error from empty; error → `502 upstream_error`, never `no_household` /
      `no_api_key` / silent config defaults — Priority: **Must**

Land 001's error-aware count first; 002 wraps it in the atomic reserve; 003 is independent but
shares the same files.

## Expected Outputs

- `supabase/functions/claude-proxy/index.ts` — error-aware `countToday`; discriminated
  error-vs-empty from the three resolvers; finite-positive `envDailyLimit` parse; header
  comment "intent 008" reference repointed to the recipe-import intent's number
- `supabase/functions/claude-proxy/pipeline.ts` — fail-closed mapping to
  `ProxyFailure('upstream_error', 502)` at the correct point relative to the "one row"
  boundary (line 159); cap check routed through the atomic reserve; genuine-usage-only
  semantics
- `supabase/migrations/<ts>_atomic_daily_call_cap.sql` (append-only) — `reserve_ai_call(...)`
  `security definer` function (insert-iff-under-limit, genuine-usage `WHERE` filter),
  optional partial index
- `supabase/functions/claude-proxy/index.test.ts` (+ pipeline tests) — count error → no
  `callAnthropic` + one row; `"25/day"` env → limit 25; 50 invalid then 1 valid → not
  `rate_limited`; 10 concurrent at `limit-1` → ≤1 `callAnthropic`; each resolver error →
  `502`, not `no_household` / `no_api_key`
- `supabase/tests/database/*.sql` — pgTAP for `reserve_ai_call`: under/over limit, genuine-usage
  filter excludes `bad_request`, concurrent reserve admits exactly one
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- None — first bolt of intent 008.

### Unit Dependencies (cross-unit)

- `007-claude-integration` (committed): the `claude-proxy` function, `household_ai_config`,
  `ai_usage_log`, `resolve_ai_key` being remediated.

### External

- Supabase Postgres (migration + pgTAP). No Edge runtime limit needed for this bolt (that's
  bolt 041).

### Enables

- **041-claude-proxy-hardening** — rebases the same `pipeline.ts` for the SDK timeout +
  metering-isolation work.

## Success Criteria

- [ ] `deno test` green (new + existing); `deno lint` / `deno check` clean
- [ ] `supabase db reset` clean; `supabase test db` green including the new `reserve_ai_call`
      pgTAP cases
- [ ] Count-query error ⇒ no `callAnthropic`, `502 upstream_error`, exactly one usage row
- [ ] `AI_DAILY_CALL_LIMIT` non-numeric ⇒ effective default `25`, never `NaN`
- [ ] `bad_request` rows do not consume the cap; `rate_limited` / `upstream_error` / `timeout`
      rows do
- [ ] Concurrent boundary requests never exceed `daily_call_limit` paid calls in a UTC day
- [ ] Each resolver error ⇒ `502 upstream_error`, never `no_household` / `no_api_key`
- [ ] All `007` FR-4 / FR-5 acceptance criteria still pass
- [ ] Code reviewed

## Notes

Simple-construction (not DDD) — no new domain entity, just corrected control flow plus one
small SQL primitive. The weight is in the tests: stubbed `Deps` for the error/concurrency
paths, pgTAP for the atomic reserve. Keep every "genuine absence" branch
(`no_household` / `no_api_key` / config defaults) byte-identical so `007`'s tests are
untouched.
