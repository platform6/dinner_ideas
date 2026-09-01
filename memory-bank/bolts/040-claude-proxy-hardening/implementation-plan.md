---
stage: plan
bolt: 040-claude-proxy-hardening
created: '2026-08-31T21:30:00Z'
---

## Implementation Plan: claude-proxy-hardening (bolt 040)

### Objective

Make the `claude-proxy` daily-call cap and its dependency resolvers trustworthy, without
touching the frozen request/response contract or the happy path:

- **FR-1** — the cap fails **closed** on a broken usage count and on a non-numeric
  `AI_DAILY_CALL_LIMIT` (no `NaN`, no silent unlimited).
- **FR-2** — the cap counts only genuine upstream attempts and is enforced by one atomic
  DB operation, so invalid-request floods and concurrency can't evade it.
- **FR-3** — `resolveHousehold` / `loadConfig` / `resolveKey` failures surface as
  `upstream_error` (502), never the misleading `no_household` / `no_api_key`.

Stories: `001-fail-closed-daily-cap`, `002-count-genuine-usage-atomic-cap`,
`003-surface-resolver-errors`. (FR-4 — SDK timeout + metering isolation — is bolt `041`.)

---

### Deliverables

1. **`supabase/migrations/20260831213000_ai_call_counter.sql`** (append-only, new file) —
   the atomic per-household/per-UTC-day call counter and a `security definer`
   `reserve_ai_call(...)` function. See "Atomicity approach" below.
2. **`supabase/functions/claude-proxy/index.ts`** —
   - `countToday` removed; new `reserveCall` dep wired to `rpc('reserve_ai_call', …)`,
     returning a discriminated `{ reserved: boolean } | { error: true }`.
   - `resolveHousehold` / `loadConfig` / `resolveKey` return `{ data, error }`-shaped
     results (mirroring `supabase-js`) instead of swallowing `error`.
   - `envDailyLimit`: `parsePositiveInt(Deno.env.get('AI_DAILY_CALL_LIMIT'))` →
     `number | undefined`, never `NaN`.
   - Header comment: `intent 008` → `intent 009` for the recipe-import reference (contract
     text only).
3. **`supabase/functions/claude-proxy/pipeline.ts`** —
   - `Deps` interface updated: `countToday` → `reserveCall`; resolver return types → the
     `{ data, error }` shape.
   - `handleProxy`: check each resolver's `error` first → `ProxyFailure('upstream_error',
502)` at the correct point relative to the "one row" boundary (line ~159); `loadConfig`
     error is a hard failure, not a silent default; the rate-limit step calls `reserveCall`
     (over-limit → `429 rate_limited` + one row via `insertUsage`; DB error → `502
upstream_error` + one row); `NaN`/non-finite effective `daily_call_limit` treated as
     "cannot verify" → `upstream_error`.
   - `insertUsage` unchanged in shape; still writes the single audit row on every
     resolved-household path (no_api_key, bad_request, rate_limited, success, failure).
4. **`supabase/functions/claude-proxy/errors.ts`** — no change (fail-closed paths reuse
   `upstream_error`; enum stays frozen — OQ-1).
5. **`supabase/functions/claude-proxy/index.test.ts`** — `makeDeps` updated to the new
   `Deps` shape; new cases (see "Test plan").
6. **`supabase/tests/database/ai_call_counter_test.sql`** (new) — pgTAP for
   `reserve_ai_call`.
7. **`supabase/functions/claude-proxy/README.md`** — document `reserve_ai_call`, the counter
   table, and that `AI_DAILY_CALL_LIMIT` must be a positive integer (non-numeric → default).
8. **`memory-bank/standards/decision-index.md`** — short entry: "daily cap enforced by an
   atomic `ai_call_counter` row, not a live `count(*)` over `ai_usage_log`; `ai_usage_log`
   stays append-only."

---

### Atomicity approach (FR-2) — decision needed at checkpoint

The expensive thing is the Anthropic call, so the slot must be claimed **before** the call.
A live `select count(*) from ai_usage_log … where … < limit` inside an INSERT is **not**
atomic under READ COMMITTED — two concurrent requests both see `N-1` and both proceed
(exactly finding 6).

**Option A — `ai_call_counter` table (recommended).**
New table `public.ai_call_counter (household_id uuid, day date, n int, primary key
(household_id, day))`. `reserve_ai_call(p_household_id, p_limit)`:

```
insert into ai_call_counter (household_id, day, n)
values (p_household_id, (now() at time zone 'utc')::date, 1)
on conflict (household_id, day)
  do update set n = ai_call_counter.n + 1
  where ai_call_counter.n < p_limit
returning n;
```

`ON CONFLICT DO UPDATE` takes a row lock, so concurrent callers serialise on that row; a
`NULL` return ⇒ at/over limit. First call of the day inserts `n = 1` (guard the
`p_limit < 1` edge). `ai_usage_log` is **never written by this path** and stays fully
append-only (respects `007`'s immutability invariant). "Genuine usage only" (finding 5) is
automatic: the counter is bumped only here, immediately before a real attempt — never for
`bad_request` / `no_api_key` / `rate_limited`. Old `day` rows are inert; a prune job is a
later, non-blocking concern.
Trade-off: one new table; the counter and `ai_usage_log` row counts can differ (they measure
different things — reserved attempts vs. logged outcomes). Acceptable and documented.

**Option B — `SERIALIZABLE` function over `ai_usage_log`.**
No new table; `reserve_ai_call` runs `set transaction isolation level serializable`, counts
genuine-usage rows (`ok or error_code in ('rate_limited'… no —)`), and the caller retries on
`40001`. Rejected: adds serialization-failure retry logic to the Edge Function, and the
"which rows count" filter has to reason about not-yet-written outcome rows. More moving parts
for the same result.

**Option C — advisory lock.** `pg_advisory_xact_lock(hashtext(household_id::text))` around a
count+insert in one function transaction. Works, but the lock name space is global and the
approach is easy to get subtly wrong; Option A is clearer and self-documenting.

→ **Recommendation: Option A.** Confirm at the checkpoint.

---

### Resolver error shape (FR-3)

Each of `resolveHousehold`, `loadConfig`, `resolveKey` currently does
`const { data } = await …; return data?… ?? …`. Change to return the `supabase-js`
`{ data, error }` object (or a small `{ value, error }` for `resolveKey`'s RPC). `handleProxy`:

| Resolver           | `error` set                                                            | `error` null, no row                                                     | `error` null, row |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| `resolveHousehold` | `502 upstream_error`, **no** usage row (before the "one row" boundary) | `403 no_household`, no row (unchanged)                                   | proceed           |
| `loadConfig`       | `502 upstream_error` + one row                                         | defaults (`model_override: null`, env/`DEFAULT_DAILY_LIMIT`) — unchanged | use row           |
| `resolveKey`       | `502 upstream_error` + one row                                         | `409 no_api_key` + one row (unchanged)                                   | proceed           |

Every "genuine absence" branch stays byte-identical so `007`'s `no_household` / `no_api_key`
tests are untouched.

---

### `envDailyLimit` parse (FR-1)

`index.ts`: replace the `… ? Number(…) : undefined` ternary with
`parsePositiveInt(raw): number | undefined` — `const n = Number(raw); return
Number.isInteger(n) && n > 0 ? n : undefined;`. `pipeline.ts`: where
`deps.envDailyLimit ?? DEFAULT_DAILY_LIMIT` is used, add a `Number.isFinite` guard on the
final effective `daily_call_limit`; a non-finite value is treated as "cannot verify" →
`upstream_error` (not "no limit").

---

### Pipeline order (after change)

```
auth → resolveHousehold (err→502 no row | null→403 | ok)
  ── one-row boundary ──
parse+validate (bad→400 + row)
loadConfig (err→502 + row | null→defaults | ok)
resolveKey (err→502 + row | null→409 no_api_key + row | ok)
reserveCall(householdId, effectiveLimit)
   ├─ {error}      → 502 upstream_error + row
   ├─ {reserved:false} → 429 rate_limited + row
   └─ {reserved:true}  → callAnthropic → insertUsage(final) → 200
```

---

### Dependencies

- **`007-claude-integration`** (committed): the function, `household_ai_config`,
  `ai_usage_log`, `resolve_ai_key`, `current_user_household_id()`.
- **Supabase Postgres** — migration + pgTAP (`supabase db reset`, `supabase test db`).
- **Deno / `deno test --allow-env`** for the pipeline tests.
- No Edge runtime wall-clock work here (that's bolt `041`).
- No new npm/Deno package.

---

### Technical approach

- Keep `pipeline.ts` I/O-free — all new behaviour reachable through the updated `Deps`, so
  every branch stays unit-testable with stubs (matching the existing `index.test.ts` style).
- `reserve_ai_call` mirrors `007`'s function conventions: `security definer`,
  `set search_path = ''`, fully-qualified names, `comment on function`, a ROLLBACK block at
  the top of the migration.
- Grants: `ai_call_counter` gets `revoke insert,update,delete … from authenticated, anon`
  (service-role / definer only), RLS enabled with a member-read policy for parity /
  debuggability (optional — could also be no client access at all; note at checkpoint).
- The `reserve_ai_call` "genuine usage" property is structural (counter only bumped here), so
  no `error_code` filter logic is needed in SQL.

---

### Acceptance Criteria

- [ ] `countToday`/count-query failure ⇒ no `callAnthropic`, `502 upstream_error`, exactly
      one `ai_usage_log` row (FR-1).
- [ ] `AI_DAILY_CALL_LIMIT` = `"25/day"` / `"abc"` / `""` ⇒ effective default `25`, never
      `NaN`; `"10"` ⇒ `10` (FR-1).
- [ ] 50 invalid-JSON requests then a valid request ⇒ valid request **not** `rate_limited`
      (FR-2).
- [ ] 10 concurrent requests at `n = limit - 1` ⇒ at most one reaches `callAnthropic`; the
      household never exceeds `limit` reservations for the UTC day (FR-2, pgTAP + pipeline).
- [ ] `reserve_ai_call` returns `NULL` at/over limit; increments exactly once per successful
      call; first call of the day works; `p_limit = 0` ⇒ always `NULL` (FR-2).
- [ ] Each of `resolveHousehold` / `loadConfig` / `resolveKey` returning an `error` ⇒ `502
    upstream_error`; never `403 no_household` / `409 no_api_key` / silent config defaults
      (FR-3).
- [ ] Genuine "no row" for household ⇒ `403 no_household` (no usage row); for key ⇒ `409
    no_api_key` (one row) — unchanged from `007`.
- [ ] `no_api_key`, `bad_request`, `rate_limited` rows do **not** advance the counter
      (FR-2).
- [ ] All existing `index.test.ts` cases still pass (adjusted only for the `Deps` shape).
- [ ] `007` FR-5 acceptance (`1..N` succeed, `N+1` → 429 + one row; limit change effective
      with no deploy) still holds.
- [ ] `deno lint` / `deno check` clean; `supabase db reset` + `supabase test db` green.

---

### Test plan (Stage 3 preview)

**Deno (`index.test.ts`)** — new/changed:

- `reserveCall` returns `{ error: true }` ⇒ 502 `upstream_error`, one row, `callAnthropic`
  not called.
- `reserveCall` returns `{ reserved: false }` ⇒ 429 `rate_limited`, one row, not called.
- `reserveCall` returns `{ reserved: true }` ⇒ existing happy path.
- `resolveHousehold` `{ error }` ⇒ 502, `rows.length === 0`.
- `loadConfig` `{ error }` ⇒ 502, one row.
- `resolveKey` `{ error }` ⇒ 502, one row (distinct from `{ data: null }` ⇒ 409).
- `envDailyLimit` cases via a tiny exported `parsePositiveInt` unit test.
- All existing cases pass with `makeDeps` updated.

**pgTAP (`ai_call_counter_test.sql`)**:

- fresh household: 1st `reserve_ai_call(h, 3)` ⇒ 1; 2nd ⇒ 2; 3rd ⇒ 3; 4th ⇒ NULL.
- `reserve_ai_call(h, 0)` ⇒ NULL, no row created / `n` unchanged.
- two sessions racing the Nth reserve ⇒ exactly one non-NULL (documented as a
  best-effort concurrency assertion in pgTAP; the structural `ON CONFLICT` lock is the real
  guarantee).
- day rollover: a row for `day = yesterday` does not affect today's count.
- `authenticated` cannot `insert` / `update` `ai_call_counter`.

---

### Deviations / open items for the checkpoint

1. **Option A vs B/C** for atomicity — recommending A (`ai_call_counter` table).
2. **RLS on `ai_call_counter`** — member-read for debuggability, or no client access at all?
   Recommending member-read `select` only, no write (parity with `ai_usage_log`).
3. **Reserve-but-no-call leak**: if the function dies after `reserve_ai_call` but before
   `callAnthropic`, the household loses one slot for the day. This is fail-safe (errs toward
   under-serving, never overspending) and, at one-family scale, negligible. No compensating
   logic in v1 — noted, not fixed.
4. Migration filename timestamp `20260831213000` — after `20260831130000_ai_config_and_key_vault`.
