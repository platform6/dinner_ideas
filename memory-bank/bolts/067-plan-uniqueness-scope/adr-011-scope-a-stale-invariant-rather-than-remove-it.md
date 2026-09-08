---
bolt: 067-plan-uniqueness-scope
created: 2026-09-08T16:40:00Z
status: accepted
superseded_by: null
---

# ADR-11: Rescope a Stale Invariant Rather Than Remove It

## Context

On 2026-09-08 the app's primary action — picking a dinner — failed in production:

```text
23505: duplicate key value violates unique constraint "idx_weekly_plans_one_unlocked"
```

Nothing could be picked, so nothing downstream could be reached either. The whole app was
effectively down for the founding household.

The constraint, introduced in intent 001 (bolt 027) and rescoped to households in intent 004:

```sql
create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id) nulls not distinct
  where locked_at is null;
```

**At most one draft plan per household, across all time.**

The household held a draft for the week of 2026-08-30 with three picks, never locked. The planning
week rolled over on 2026-09-06. Picking a dinner asked for a plan for the _new_ week; the index
saw only "this household already has a draft" and rejected it.

### The invariant did not break. Its scope went stale.

When bolt 027 wrote this rule, a plan had no meaningful week identity — "the current plan" meant
_the most recently created one_. With no concept of a planning week, "one draft per household" and
"one draft per household per week" described the same set of states, and the shorter phrasing was
the natural one.

Intent 011 then gave plans a real week identity (`start_date`, derived from the household's
`week_start_day`) and began looking them up by it. **From that moment the two readings diverged**,
and the stored rule kept enforcing the one the application had stopped meaning.

Intent 012 made locking a deliberate act rather than a side effect of copying the shopping list.
Drafts began routinely outliving their weeks. The first rollover with an unfinished draft was
guaranteed to hit the divergence; it took until the second such rollover to happen.

Stated in one line: `createPlan` speaks _planning week_. `fetchPlanByStartDate` speaks _planning
week_. The constraint spoke _household_.

### The signal was visible a release cycle earlier

`weekly_planning_meal_history_test.sql` carries this comment:

> Safe against a fresh local/CI database (no pre-existing unlocked plan to collide with
> `idx_weekly_plans_one_unlocked`, **unlike the live project**)

and bolt 010's test report records dropping the index _inside a transaction_ to avoid colliding
with "that real unlocked plan".

Someone noticed that production and CI disagreed about this constraint, wrote it down, worked
around it, and moved on. It was read as a testing inconvenience. It was a latent defect
announcing itself.

## Decision

**Rescope the index to the planning week. Do not remove it, and do not work around it in the
application.**

```sql
create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id, start_date) nulls not distinct
  where locked_at is null;
```

**At most one draft plan per household per planning week.**

### Why not remove the index

Bolt 027 added it for a real reason: two concurrent `createPlan` calls could each observe "no plan
yet" and both succeed, leaving two plans and orphaning one user's picks. That hazard is unchanged —
two tabs, or a double tap, still race.

Removing the index to end the outage would trade this bug for the one the index was written to
prevent, and the replacement bug is worse: it corrupts data silently, where this one fails loudly.

Adding `start_date` to the key keeps the collision exactly where it is wanted — two racers creating
_this week's_ plan — and removes it only where it was never wanted.

### Why not fix it in the client

Checking for an existing draft before creating would move an invariant out of Postgres, against
ADR-1. It also does not work: the check and the insert are not atomic, so two tabs still race. An
invariant enforced by whoever remembers to check is not an invariant.

### Why not auto-clean stale drafts on rollover

Deleting last week's unfinished plan when the week turns would end the outage by destroying the
user's picks to satisfy a constraint that was itself out of date. It treats a stale rule as a fixed
point and the user's data as the flexible part. A stale draft is a normal state — the household
simply did not lock that week.

## Consequences

### What this permits, deliberately

- A draft for the current week alongside an **older draft** — the case that was blocked.
- A draft for a week that already has a **locked** plan. Production already contains such a pair
  for 2026-08-30, and `fetchPlanByStartDate` is documented as resolving duplicates by taking the
  newest. This bolt must not forbid it.

### What it still forbids

- Two drafts for the same household and planning week — bolt 027's protection, correctly scoped.

### The migration cannot fail on data

Adding a column to a unique key only ever permits more combinations. Every existing row satisfies
the new index by construction, so no audit, no rehearsal and no staging environment are needed —
unlike intent 010's cutover, whose gates could genuinely fail on production's data shape.

### The rollback is not symmetric

Recreating the single-column index is a **narrowing** change and can fail once a household holds
drafts for two weeks — the exact state this ADR permits. Rolling back therefore requires first
resolving any such household. Recorded in the migration, because a rollback path discovered to be
asymmetric _during an incident_ is the worst possible time to learn it.

### The old rule got tighter with age

Per-household-for-all-time means every accumulated unlocked draft narrows what the household can
do. A rule whose restrictiveness grows with data is a rule with a scheduled failure; per-week
does not have that property.

## What would have caught this earlier

Recorded because it is the part that generalises beyond this index:

1. **A production/CI divergence in a constraint is a defect report, not a test-fixture problem.**
   The comment in the meal-history suite was a bug report nobody filed. When a test needs to work
   around real data, the question "why does production violate what CI assumes?" deserves an
   answer before the workaround is written.
2. **When a model gains an identity, re-read the constraints written before it existed.** Intent
   011 introduced the planning week and did not revisit the uniqueness rule that predated it. A
   grep for constraints mentioning `weekly_plans` at that point would have found this in minutes.
3. **A constraint's comment is part of its definition.** This index's comment said "at most one
   unlocked (draft) weekly plan may exist at a time" long after the app had started meaning
   something narrower. A comment that no longer matches intent is a stale rule with documentation.

## Related

- **ADR-1** — invariants that must hold regardless of caller live in Postgres. Upheld.
- **Bolt 027** (`20260827002830`) — added this index, and the `for update` serialisation for
  selection writes. That serialisation is a different code path and is untouched here.
- **Intent 011** — introduced the planning week, the change that made the scope stale.
- **Intent 012** — made locking deliberate, which made stale drafts routine.
