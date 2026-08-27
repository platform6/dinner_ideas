---
stage: test
bolt: 011-grocery-store-config
created: 2026-08-27T07:00:00Z
---

## Test Report: grocery-store-config

### Summary

- **Live Verification (via `supabase db query`)**: 15/15 checks passed
- **Schema Shape**: Confirmed via generated types and live query
- **Reorder RPC**: Both "move down" and "move up" cases verified, plus out-of-range and nonexistent-row rejection
- **Cascade Delete**: Confirmed a deleted row's category assignment disappears (unassigned, not orphaned)
- **RLS**: anon blocked, authenticated allowed

### Execution Note

Same approach as bolt `010`: all assertions executed live against the real "dinner ideas" project via `npx supabase db query --linked`, wrapped in a transaction that was **rolled back**. This table was still empty (no real usage yet), so — unlike bolt `010` — no workaround was needed for pre-existing data.

Confirmed clean afterward: both new tables have 0 rows.

A pgTAP suite (`supabase/tests/database/grocery_store_config_test.sql`) was also written as a durable regression suite — not executed locally via `supabase test db` (Docker still not running), same recurring gap as prior bolts.

### Acceptance Criteria Validation

**Story 001-store-rows-schema**

- ✅ Rows can be added, named, and reordered; positions stay unique after a reorder — Confirmed: `{1,2,3}` → reorder → still `{1,2,3}`, no duplicates at any intermediate step
- ✅ Each ingredient category can be assigned to exactly one row — Confirmed: reassigning "Dairy" moved it, never created a second row for the same category (`category` is the primary key)

**Story 002-reorder-shopping-list-by-rows** (schema/RPC half — client-side reorder logic is bolt `013`)

- ✅ Reorder RPC produces a correct, unique-positioned result for both directions — Confirmed
- ✅ Out-of-range and nonexistent-row calls are rejected with a clear error — Confirmed

### Detail

| Test                                                                        | Expected                                            | Result                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| `grocery_store_rows`/`category_row_assignments` exist with expected columns | Present                                             | ✅ Confirmed via generated types       |
| `position` unique constraint                                                | Present                                             | ✅ Confirmed                           |
| Reorder "move down" (e.g. position 2 → 3)                                   | Affected range shifts, no duplicates                | ✅ Confirmed                           |
| Reorder "move up" (e.g. position 2 → 1)                                     | Affected range shifts, no duplicates                | ✅ Confirmed                           |
| Reorder to an out-of-range position                                         | Rejected                                            | ✅ Rejected                            |
| Reorder a nonexistent row id                                                | Rejected                                            | ✅ Rejected                            |
| Assign then reassign a category                                             | Last write wins, exactly one row                    | ✅ Confirmed (1 assignment row, not 2) |
| Delete a row with an assigned category                                      | Assignment cascades away (unassigned, not orphaned) | ✅ Confirmed                           |
| `anon` reads either table                                                   | 0 rows (RLS blocks)                                 | ✅ Confirmed                           |
| `authenticated` reads either table                                          | Rows visible                                        | ✅ Confirmed                           |

### Issues Found

None. Every check passed on the first live run.

### Recommendations

- Get Docker running in this dev environment so `supabase test db` can execute the pgTAP suite locally (and eventually in CI) — same standing recommendation as every prior bolt's test report this session.
- Bolt `013-weekly-dinner-planner-ui` (the config page UI + client-side reorder function) is the next dependency this unlocks, alongside `010-weekly-planning`.
