---
intent: 015-dinners-per-week
phase: inception
status: complete
created: '2026-09-07T04:00:00Z'
updated: '2026-09-07T04:00:00Z'
---

# Inception Log: 015-dinners-per-week

## Origin

`tasks.md`, first roadmap bullet: a household-level setting for the number of dinners you pick,
described there as "a small follow-up to add the control + the schema/RLS + wire it into the
pick-3 flow."

## The sizing was wrong, and that is the main finding

The control and the column _are_ small — `households.week_start_day` (intent 011, bolt 045) is a
direct precedent, down to needing no new RLS. But "3" is not a client constant. It is an
**invariant enforced in Postgres**:

| Where               | What                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `20260826192038:52` | Trigger rejecting a fourth selection                              |
| `20260826192038:96` | Lock refuses a plan without exactly three                         |
| `20260827002830`    | A **concurrency fix** to that check — two writers could race to 4 |
| 3 pgTAP files       | `weekly_planning`, `meal_history`, `rls_isolation`                |
| ~6 client files     | Gates, hooks and "Pick 3 dinners" copy across four features       |

So this intent changes two triggers, one of which already has a bug report attached, and renames a
function whose name asserts the constant being removed. That is a data-model intent with a DDD
bolt, not a settings control — and it is why bolt 063 carries the whole rule while the UI sweep is
kept apart in bolt 065.

## One thing that turned out easier than expected

`fn_weekly_plans_record_meal_history` is **already N-agnostic** — it inserts one row per selection
via a `select`, not three rows literally. Only its comment says "Writes 3 meal_history rows". The
logic needs nothing; the comment needs correcting, and a comment that lies about an invariant is
worse than none.

## Decisions

| Question          | Decision                                            | Rationale                                                             |
| ----------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Range             | **1–7, default 3**                                  | A week has seven days. Default 3 makes the deploy a no-op             |
| Mid-week change   | **Unlocked weeks adopt it; locked weeks untouched** | Locking is already deliberate and its `meal_history` rows are written |
| Who can change it | **Owner only**                                      | The existing owner-UPDATE policy on `households` already says so      |

## Artifacts

- `requirements.md` — 6 FRs, 0 open questions
- `system-context.md` — including why the trigger's serialisation must not move
- `units.md` — 2 units: the rule, then the sweep
- 7 stories, 3 bolts (`063`–`065`)
