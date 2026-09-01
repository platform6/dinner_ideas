---
intent: 008-claude-proxy-review-remediation
phase: inception
status: approved
updated: '2026-08-31T21:00:00Z'
---

# claude-proxy Review Remediation - Unit Decomposition

## Units Overview

Two units, split by surface — the same split intent `007-claude-integration` used
(`001-claude-proxy-service` / `002-settings-ui`). The findings do not cross the line: FR-1..FR-4
are entirely inside `supabase/functions/claude-proxy/` (+ one migration for the atomic cap);
FR-5..FR-6 are entirely inside `src/features/` (+ one migration/trigger for provenance). The
units can be built and shipped independently; `001` carries the money/integrity risk and goes
first.

### Unit 1: 001-claude-proxy-hardening

**Description**: All Edge Function correctness fixes. The daily cap fails closed on a count or
resolver error and on a non-numeric `AI_DAILY_CALL_LIMIT` (FR-1); the cap counts only
genuine-usage rows and is enforced by an atomic under-limit insert so concurrency and
invalid-request floods can't evade it (FR-2); `resolveHousehold` / `loadConfig` / `resolveKey`
distinguish query failure from genuine absence and surface a typed transient error rather than
`no_household` / `no_api_key` (FR-3); the Anthropic SDK client gets an explicit `timeout`
below the platform budget so the `timeout` path is reachable and logged, and a metering-write
failure after a successful call no longer turns a paid `200` into a `502` (FR-4).

**Unit Type**: backend (Supabase Edge Function + one migration)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `supabase/functions/claude-proxy/index.ts` — `countToday` inspects the query `error` and
  signals "unverifiable" instead of `0`; `resolveHousehold` / `loadConfig` / `resolveKey`
  return a distinct error signal vs. empty; `envDailyLimit` parsed with a finite-positive
  guard (no `NaN`). The header comment's "intent 008" reference is repointed to the
  recipe-import intent's new number.
- `supabase/functions/claude-proxy/pipeline.ts` — fail-closed handling of an unverifiable
  count / config / household / key: return `upstream_error` (502) + one usage row, no
  Anthropic call (OQ-1); the cap check + usage insert made atomic (calls the new RPC /
  guarded insert); the success-path `write(...)` moved out of the `catch`-to-`upstream_error`
  scope so a metering failure is caught, `console.error`-logged, and does not change the
  `200` response; `NaN` guard on the effective `daily_call_limit`.
- `supabase/functions/claude-proxy/anthropic.ts` — `new Anthropic({ apiKey, timeout: <~⅓ of
the platform limit>, maxRetries: 0 })` (OQ-3).
- `supabase/migrations/<ts>_atomic_daily_call_cap.sql` — append-only. An atomic
  "insert `ai_usage_log` row iff genuine-usage count for the UTC day `< daily_call_limit`"
  operation (RPC or guarded `INSERT … SELECT … WHERE` — OQ-4, impl detail), counting only
  `ok = true OR error_code IN ('rate_limited','upstream_error','timeout')`.
- `supabase/functions/claude-proxy/index.test.ts` (+ pipeline tests) — new cases: count
  error → no `callAnthropic` + one row; resolver errors → typed 5xx, not `no_household` /
  `no_api_key`; `AI_DAILY_CALL_LIMIT="25/day"` → effective limit 25; timeout → `502 timeout`
  - one row; `insertUsage` throws on success → still `200`; concurrent boundary requests →
    at most one proceeds.

**Dependencies**:

- Depends on: `007-claude-integration` (committed; deploying) — this remediates its output.
- Depended by: `009` (recipe import) benefits from the hardened cap/metering but is not
  blocked at the code level.

**Estimated Complexity**: **M** — small diffs, but they touch live billable code, need an
atomic DB primitive, and the highest-value tests (timeout, concurrency) exercise paths that
are awkward to simulate. Careful review + the `007` acceptance set as a regression gate.

---

### Unit 2: 002-settings-ai-remediation

**Description**: The settings-client fixes. The "Daily call limit" field shows the saved value
once `['ai-config']` resolves (FR-5); `callClaude` bounds its `fetch` with an `AbortController`
and maps an abort to a typed `ClaudeError('timeout')` so Test Connection always leaves its
loading state (FR-5); the dead unmount-only `useEffect` and its misleading comment are removed
(FR-5); AI-config edits are stamped `updated_by = auth.uid()` / `updated_at = now()`
server-side, matching `set_household_ai_key` (FR-6).

**Unit Type**: frontend (+ one migration/trigger for provenance)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/settings/ClaudeAiCard.tsx` — daily-limit `<Input>` made controlled (or render
  gated on `config.isSuccess`, or keyed to the loaded value); the `useEffect(() => () =>
setKeyInput(''), [])` line and comment removed.
- `src/features/ai/api.ts` — `callClaude` uses `AbortController` with a bounded timeout
  (≈60 s); abort → `ClaudeError('timeout', …)`; `KNOWN_CODES` / mapping unchanged otherwise.
- `src/features/settings/api.ts` — `updateAiConfig` keeps its `.upsert(...)` call but stops
  sending `updated_at` (OQ-2 — the trigger stamps it).
- `supabase/migrations/<ts>_ai_config_provenance.sql` — append-only. `BEFORE INSERT OR UPDATE`
  trigger on `household_ai_config` stamping `updated_by = auth.uid()`, `updated_at = now()`
  unconditionally.
- Tests: `ClaudeAiCard` — the limit field shows a non-default saved value after load; Test
  Connection surfaces a timeout when `callClaude` aborts. `ai/api` — a hung fetch rejects with
  `ClaudeError('timeout')` within the bound. `settings/api` — `updateAiConfig` no longer sends
  `updated_at`.

**Dependencies**:

- Depends on: `007-claude-integration` (committed) — remediates its output. Independent of
  Unit 1 (no shared files); can run in parallel or after.
- Depended by: none.

**Estimated Complexity**: **S** — localized frontend edits plus one small `BEFORE INSERT OR
UPDATE` trigger migration; each fix has a clear existing pattern to follow.

## Unit Dependency Graph

```text
[007-claude-integration (committed / deploying)]
        ├──> [001-claude-proxy-hardening]   bolts 040 → 041   (FR-1..FR-4)  — do first (money/integrity)
        └──> [002-settings-ai-remediation]  bolt 042          (FR-5..FR-6)  — independent; parallel or after
```

## Execution Order

1. `001-claude-proxy-hardening` — carries the correctness/billing risk. Bolt `040`
   (fail-closed cap + genuine-usage atomic cap + resolver errors + migration), then bolt `041`
   (SDK timeout + metering isolation, rebases `pipeline.ts`). Per OQ-5, redeploy `claude-proxy`
   before `009`.
2. `002-settings-ai-remediation` — bolt `042`; independent (no shared files), can be built
   alongside or immediately after.

## Requirement-to-Unit Mapping

- **FR-1** (daily cap fails closed: count error + `NaN` env var) → `001-claude-proxy-hardening`
- **FR-2** (count genuine usage only; atomic cap check) → `001-claude-proxy-hardening`
- **FR-3** (resolver failures surfaced, not masked as absent) → `001-claude-proxy-hardening`
- **FR-4** (SDK timeout reachable + logged; metering failure isolated) → `001-claude-proxy-hardening`
- **FR-5** (stale daily-limit field; `callClaude` timeout; dead effect) → `002-settings-ai-remediation`
- **FR-6** (server-stamped `updated_by` / `updated_at` on config writes) → `002-settings-ai-remediation`
