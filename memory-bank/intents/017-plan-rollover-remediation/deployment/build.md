---
intent: 017-plan-rollover-remediation
release: v0.11.2-44542b4
commit: 44542b4
units: [001-plan-uniqueness-scope]
deferred_units: [002-plan-create-failure-surface]
created: '2026-09-08T17:45:00Z'
status: verified
follows: v0.11.1-6a0f5df
severity: outage-fix
---

# Build Record: release v0.11.2 (intent 017 — plan rollover remediation)

**This release fixes a live production defect.** Picking a dinner — the app's primary action —
fails with `23505` whenever the planning week rolls over while the previous week's draft is still
unlocked. It happened on 2026-09-08 and will recur, roughly weekly, until this ships.

The household is currently unblocked only because the stale draft was locked by hand
(story 003). **The underlying bug is still live in production.**

## Artifact

- **SQL — one migration**: `supabase/migrations/20260908170000_plan_uniqueness_per_week.sql`,
  confirmed `<NOT APPLIED>` on prod. Rescopes `idx_weekly_plans_one_unlocked` from
  `unique (household_id)` to `unique (household_id, start_date)`, both
  `nulls not distinct where locked_at is null`. Rewrites the index comment.
- **Static site**: `dist/` from `pnpm run build`, unchanged in behaviour — **no application code
  is in this release.**
- **No Edge Function change. No RLS change. No new table or column.**
- **Not shipping**: unit 002 (`068-plan-create-failure-surface`) — a message improvement, `Should`,
  and unreachable once this ships. Deferred deliberately so a fix for a live defect is not delayed
  by copy.

## Source

- Branch: `dev` @ `44542b4`, working tree clean
- Unreleased vs `origin/main` (`c4ca6d9`, PR #18): **2 commits**

| Commit    | Contents                         | Surface               |
| --------- | -------------------------------- | --------------------- |
| `04832b0` | intent 017 inception             | docs                  |
| `44542b4` | **bolt 067 — the index rescope** | **migration** + pgTAP |

## Code payload

```text
git diff --stat origin/main..dev -- src/ supabase/

 supabase/migrations/20260908170000_plan_uniqueness_per_week.sql | 69 +++++++++
 supabase/tests/database/weekly_planning_test.sql                | 70 ++++++++--
 supabase/tests/database/weekly_planning_meal_history_test.sql   | 23 ++--
 3 files changed, 149 insertions(+), 13 deletions(-)
```

**`src/` is untouched.** The design predicted a correctly scoped constraint would need no
application change, and that held.

## Verification — 2026-09-08

| Check                  | Command                                   | Result                                          |
| ---------------------- | ----------------------------------------- | ----------------------------------------------- |
| pgTAP, clean slate     | `supabase db reset` + `supabase test db`  | ✅ **361 / 361** (20 files), 24-migration chain |
| Unit + component tests | `npx vitest run`                          | ✅ 317 / 317 — unchanged, no app code           |
| Type check             | `npx tsc -b`                              | ✅ clean                                        |
| Lint                   | `npx eslint src`                          | ✅ clean                                        |
| Production build       | `npx vite build`                          | ✅ green                                        |
| Live invariant check   | `supabase db query --linked`, rolled back | ✅ all 4 cases (see below)                      |
| Prod migration state   | `git show origin/main:…`                  | `20260908170000` **not present**, as expected   |

### pgTAP ran locally for the first time in this project

Bolts 001, 007, 009 and 010 all record _"could not be executed locally (Docker not running)"_.
Docker was available this session, so the suite ran on a full clean-slate migration chain rather
than only against the live project. 358 → 361 assertions.

### Verified against production data, rolled back

```text
[1] older-week draft ........................ ACCEPTED
[2] current-week draft WHILE older exists ... ACCEPTED  <- the outage, fixed
[3] second draft, SAME week ................. REJECTED  <- bolt 027's protection preserved
[4] draft for a week with a LOCKED plan ..... ACCEPTED  <- re-planning allowed
```

Afterwards: 0 stray rows; `pg_indexes` still reported the old single-column definition, confirming
the rollback held.

### The tests were falsified

The migration was sabotaged back to the household-wide definition and the suite re-run: tests 9
(the outage regression) and 11 (the index-definition guard) failed, as designed. Restored, 361/361.

**Note for whoever runs this next**: `supabase test db` does **not** re-apply migrations. Two
falsification attempts appeared to pass because the schema had not changed. An explicit
`supabase db reset` is required between editing a migration and testing it.

## Dependencies

**None added or changed.**

## What ships

**Unit 001 — plan uniqueness scope (bolt 067)**

- The index is scoped to the planning week, so a stale draft no longer blocks the new week
- Bolt 027's concurrency protection is preserved, scoped to the week
- The pgTAP case that asserted the bug as intended behaviour is rewritten, plus three new
  assertions including an exact-match guard on the index definition
- ADR-11 records the decision, the three rejected alternatives, and what would have caught it

## Known and accepted

**The `meal_history` per-plan dedupe is untouched.** `fn_weekly_plans_record_meal_history` dedupes
on `(weekly_plan_id, dinner_id)` — per plan, not per week — so two plans for one week write two
sets of history. Production shows this for the week of 2026-08-30 (6 rows). Deliberately out of
scope: widening a fix for a live defect to include an unrelated question is how outage fixes get
delayed.

**Unit 002 is deferred, not cancelled.** The catalog still says "try again" for a failure that
cannot be retried. Once this ships that specific failure is unreachable; the story's value is the
next unforeseen constraint failure.

## Next

→ **Checkpoint 2 / 3 — staging decision and production deploy.** This one carries a migration, so
unlike v0.11.1 there **is** an ordering question.
