---
unit: 001-household-data-model
intent: 004-account-model
created: 2026-08-28T23:25:00Z
last_updated: 2026-08-29T21:05:00Z
---

# Construction Log: household-data-model

## Original Plan

**From Inception**: 5 bolts planned
**Planned Date**: 2026-08-28

| Bolt ID                  | Stories       | Type                  |
| ------------------------ | ------------- | --------------------- |
| 026-household-data-model | 001, 002      | ddd-construction-bolt |
| 027-household-data-model | 003, 009      | ddd-construction-bolt |
| 028-household-data-model | 004           | ddd-construction-bolt |
| 029-household-data-model | 005, 006, 007 | ddd-construction-bolt |
| 030-household-data-model | 008, 010      | ddd-construction-bolt |

Sequence: `026 → 027 → 028 → 029 → 030`. Executed in order, no replanning.

## Replanning History

| Date | Action | Change | Reason | Approved |
| ---- | ------ | ------ | ------ | -------- |
| —    | —      | —      | —      | —        |

## Current Bolt Structure

| Bolt ID                  | Stories       | Status       | Changed |
| ------------------------ | ------------- | ------------ | ------- |
| 026-household-data-model | 001, 002      | ✅ completed | -       |
| 027-household-data-model | 003, 009      | ✅ completed | -       |
| 028-household-data-model | 004           | ✅ completed | -       |
| 029-household-data-model | 005, 006, 007 | ✅ completed | -       |
| 030-household-data-model | 008, 010      | ✅ completed | -       |

## Execution History

| Date                 | Bolt | Event          | Details                                                                                   |
| -------------------- | ---- | -------------- | ----------------------------------------------------------------------------------------- |
| 2026-08-28T23:25:00Z | 026  | started        | Stage 1: Domain Model                                                                     |
| 2026-08-28T23:56:00Z | 026  | completed      | 5 stages — identity tables + `current_user_household_id()` (migration written)            |
| 2026-08-29T00:00:00Z | 027  | started        | Stage 1: Domain Model                                                                     |
| 2026-08-29T00:50:00Z | 027  | completed      | 5 stages — `household_id` on 6 tables + constraint reworks + fn scoping                   |
| 2026-08-29T01:00:00Z | 028  | started        | Stage 1: Domain Model                                                                     |
| 2026-08-29T01:45:00Z | 028  | completed      | 5 stages — all 35 domain policies rewritten to household-scoped                           |
| 2026-08-29T02:00:00Z | 029  | started        | Stage 1: Domain Model                                                                     |
| 2026-08-29T02:55:00Z | 029  | completed      | 5 stages — `seed_default_household_catalog()` + `household_invites` + `handle_new_user()` |
| 2026-08-29T03:00:00Z | 030  | started        | Stage 1: Domain Model                                                                     |
| 2026-08-29T03:18:00Z | 030  | stage-complete | ADR Analysis — **ADR-3** created (one-founding-household cutover)                         |
| 2026-08-29T03:55:00Z | 030  | completed      | 5 stages — founding migration + `set not null` + PK promotion + standards-doc edits       |

## Execution Summary

| Metric                 | Value |
| ---------------------- | ----- |
| Original bolts planned | 5     |
| Current bolt count     | 5     |
| Bolts completed        | 5     |
| Bolts in progress      | 0     |
| Bolts remaining        | 0     |
| Replanning events      | 0     |

## Notes

Unit **complete and locally verified**. Five migrations (`20260828230000` – `20260828234000`),
seven new pgTAP suites, one new ADR (`ADR-3`), and surgical standards-doc updates.

### Live verification (2026-08-29, local Supabase via Docker)

`supabase db reset` applies all 14 migrations cleanly; `supabase test db` is **green — 165
assertions across 12 files** (5 new account-model suites + the 7 pre-existing suites, which were
updated for the household-scoped schema). `database.types.ts` regenerated from the live local
schema; `tsc -b` / `vitest` (148) / `eslint` / `vite build` all clean.

Bugs found by the real DB and fixed (all in this unit's migrations):

1. **`dinners.name` was still globally unique** — story 003 missed it. `seed_default_household_catalog()`
   for a second household collided on `dinners_name_key`. Added
   `unique nulls not distinct (household_id, name)` to bolt 027's migration (alongside the `tags`
   / `grocery_store_rows` / `category_row_assignments` reworks).
2. **Supabase auto-grants `EXECUTE` on new `public` functions to `anon`/`authenticated`** —
   `revoke ... from public` alone left `seed_default_household_catalog()` and `handle_new_user()`
   callable by clients. Bolt 029 now `revoke ... from public, anon, authenticated`.
3. **Founding migration used `ALTER TABLE auth.users DISABLE TRIGGER`** to stop `handle_new_user()`
   double-provisioning the bootstrapped synthetic user — but the migration role does not own
   `auth.users` (`ERROR: must be owner of table users`). Replaced with a `SET LOCAL
app.provisioning_disabled` GUC that `handle_new_user()` checks and no-ops on (bolt 029 + 030).
4. Pre-existing pgTAP suites (`weekly_planning*`, `dinner_catalog*`, `grocery_store_config`) now
   set a founding-owner JWT so their inserts self-assign `household_id`; schema-shape assertions
   updated to the new composite constraints; one long-broken malformed assertion in
   `dinner_catalog_tags_test.sql` rewritten.

`seed_default_household_catalog()`'s body is mechanically generated from the shipped seed
migrations (verified: 50 dinners / 284 ingredients / 216 steps), and the "50 dinners seeded"
parity assertion now passes against a live DB.

### Still gated (production)

`supabase db push` of `026 → 030` to the linked cloud project and the deploy. The founding
migration (`20260828234000`) runs against real production data — dry-run it against a Supabase
branch and confirm the founding login sees an unchanged app first. The production path takes the
real-user branch of the migration (not the local bootstrap), so `garrett.peter.conn@gmail.com`
must exist in `auth.users` before the push.
