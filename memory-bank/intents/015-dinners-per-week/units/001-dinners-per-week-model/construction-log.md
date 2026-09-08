---
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
created: '2026-09-08T18:00:00Z'
last_updated: '2026-09-08T19:20:00Z'
---

# Construction Log: 001-dinners-per-week-model

## Status

⏳ **In progress** — started 2026-09-08.

| Bolt                            | Stories            | Status      |
| ------------------------------- | ------------------ | ----------- |
| 063-dinners-per-week-rule       | 001, 002, 003, 004 | ✅ complete |
| 064-dinners-per-week-setting-ui | 005                | [ ] planned |

## Why now

Started immediately after bolt 067, deliberately. 063 modifies the same two triggers 067 has just
been through — the selection cap with its `for update` serialisation, and the lock trigger. That
context, and the freshly strengthened pgTAP suite around it, is at its most valuable now.

## Log

- **2026-09-08T18:00:00Z**: 063-dinners-per-week-rule started — Stage 1: model
- **2026-09-08T18:10:00Z**: 063 stage-complete — model → design
- **2026-09-08T18:25:00Z**: 063 stage-complete — design → adr-analysis
- **2026-09-08T18:40:00Z**: 063 stage-complete — adr-analysis → implement (ADR-12)
- **2026-09-08T18:55:00Z**: 063 stage-complete — implement → test
- **2026-09-08T19:20:00Z**: 063 completed — all 5 stages done

## Outcome

`households.dinners_per_week` exists (1..7, default 3) and both triggers read it. The migration is
**written, not applied** — production still enforces a literal 3.

**ADR-12 was written and then partly retracted, in the same bolt.** It claimed replacing a hardened
function would silently drop its `search_path`, "because the hardening had no test". Stage 5 opened
with `advisor_hardening_test.sql` — a file the plan did not know existed — aborting on the function
rename. That file asserts `proconfig` on all six hardened functions, so the regression would have
been caught immediately. The mechanism is real; the silence was not. Corrected in the ADR and in
the migration header rather than quietly edited.

The lesson that survives: `CREATE OR REPLACE` resets attributes the original `CREATE` did not
state, and an `ALTER`-applied property is invisible where someone edits the body. Restate it in the
`CREATE`.

Also recorded honestly: the `20260827002830` concurrency guarantee is **not** directly tested, here
or anywhere. A two-session race cannot run inside one pgTAP transaction. Assertion (g) asserts the
`for update` is still in the function source — a proxy, labelled as one.
