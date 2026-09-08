---
stage: design
bolt: 067-plan-uniqueness-scope
created: '2026-09-08T16:25:00Z'
---

## Technical Design: 001-plan-uniqueness-scope

### Architecture Pattern

**Unchanged: the invariant stays in Postgres.** ADR-1 — anything that must hold regardless of
caller belongs in the database, because this app has no server and the browser is not a trusted
enforcement point. The defect is that the stored rule's _scope_ went stale, not that its _location_
was wrong.

Two alternatives were rejected in the requirements and are restated here because both look
attractive to someone reading only the stack trace:

1. **Check for an existing draft in the client before creating.** Moves an invariant out of
   Postgres, races under two tabs, and would have to be re-implemented by every future caller.
2. **Delete the stale draft automatically on rollover.** Destroys a user's picks to satisfy a
   constraint that is itself out of date — fixing the symptom by removing the evidence.

### Layer Structure

```text
┌─────────────────────────────┐
│      Presentation           │  CatalogPage — unchanged this bolt
├─────────────────────────────┤
│      Application            │  useToggleSelection / createPlan — unchanged
├─────────────────────────────┤
│        Domain               │  "one draft per household per planning week"
├─────────────────────────────┤
│     Infrastructure          │  idx_weekly_plans_one_unlocked  ← THE ONLY CHANGE
└─────────────────────────────┘
```

No layer above Infrastructure is touched. That is the design's main claim: a correctly scoped
constraint requires no application change at all, which is itself evidence the scope was the
problem.

---

### Data Persistence

#### The change

```sql
-- current (20260828231000_account_model_household_id_columns.sql)
create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id) nulls not distinct
  where locked_at is null;

-- becomes
create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id, start_date) nulls not distinct
  where locked_at is null;
```

Plus a rewritten `comment on index` — the current one states the rule being removed.

#### Migration mechanics

`drop index` then `create unique index`, in one migration, in a transaction. Not
`create ... if not exists`: the index already exists under this name with a different definition,
so a conditional create would silently no-op and leave the bug in place while the migration
reported success. **That failure mode is the one to design against here** — it would produce a
green deploy and an unchanged database.

`concurrently` is deliberately **not** used: it cannot run inside a transaction, and this table is
tiny (single-digit rows in production). The lock is momentary.

#### Why it cannot fail on production data

The change is **widening**. Any row set satisfying `unique (household_id)` also satisfies
`unique (household_id, start_date)` — adding a column to a unique key can only ever permit more
combinations, never fewer. So:

- No pre-migration data audit is required
- No rehearsal against production data is required (contrast intent 010's cutover, which needed
  one because its gates could genuinely fail on real data)
- No staging environment is required

This should be stated in the deployment record rather than left as an unexplained absence.

#### `nulls not distinct` must be preserved

Intent 004's null-household window (bolts 027→030) relies on it, and the existing index comment
explains why. Dropping it would change behaviour for null `household_id` rows from "treated as
equal" to "treated as distinct", silently weakening the rule during any future window of the same
shape. Keep it, and keep it on the composite.

`start_date` is `not null`, so the clause affects only `household_id` — the same as today.

---

### The invariant after the change

| Scenario                                            | Before   | After    | Intended |
| --------------------------------------------------- | -------- | -------- | -------- |
| Second draft, **same** household + week             | rejected | rejected | ✅ keep  |
| Draft for this week while an **older draft** exists | rejected | accepted | ✅ fix   |
| Draft for a week that already has a **locked** plan | accepted | accepted | ✅ keep  |
| Two drafts, different households                    | accepted | accepted | ✅ keep  |
| Locked plans, any number, any week                  | accepted | accepted | ✅ keep  |

Row 1 is the protection bolt 027 bought and must not be traded away. Row 2 is the outage. Rows 3–5
are unchanged and are listed so the design is falsifiable — if the implementation changes any of
them, it has overreached.

---

### Concurrency

The `20260827002830` fix serialises selection writes with `for update` on the plan row. **That is a
different code path and is untouched by this bolt.**

The protection relevant here is the unique index itself, which is what makes two concurrent
`createPlan` calls for the same week resolve to one winner and one `23505`. Adding `start_date` to
the key does not weaken that: two racers creating _this week's_ plan still collide on an identical
key.

What changes is that two racers creating plans for _different_ weeks no longer collide — which was
never desirable and is the bug.

---

### Security

- **No RLS change.** `weekly_plans` policies are untouched; an index is not an access control.
- No new function, no `security definer`, no grant.
- The rule remains enforced server-side, so a modified client cannot bypass it.

---

### Design for NFRs

- **Performance**: a composite unique index on a table with single-digit rows. The index is also a
  better match for `fetchPlanByStartDate`'s `where start_date = ?` lookup than the single-column
  one, though at this size that is a footnote rather than a benefit worth claiming.
- **Scalability**: the rule is now per-week rather than per-household-for-all-time, so it stops
  degrading as a household accumulates history. The old rule got _more_ restrictive over time,
  which is the shape of a rule that will eventually break — as it did.

---

### Testing Strategy

pgTAP, and the design point is what the tests must **not** do.

`weekly_planning_test.sql` currently contains:

> `'a second unlocked weekly plan is rejected while one already exists'`

This asserts the bug as intended behaviour. Three ways to "fix" it, two of them wrong:

1. ❌ **Delete the case.** Suite goes green, proving nothing, and bolt 027's protection loses its
   only test.
2. ❌ **Loosen it to "may be rejected".** Assertion that cannot fail.
3. ✅ **Split it in two**: rejection for the _same_ week, acceptance for a _different_ week.

Required cases:

- Same household, same `start_date`, second draft → **rejected**
- Same household, different `start_date`, second draft → **accepted** ← the outage, reproduced
- Same household, draft for a week that already has a locked plan → **accepted**
- Different households, each a draft → **accepted**
- `nulls not distinct` behaviour preserved for null `household_id`

Plus: the stale workaround comments in `weekly_planning_meal_history_test.sql` become false once
this ships and must be corrected — they currently explain why the suite avoids colliding with "the
live project's" unlocked plan.

---

### Integration Points

| Consumer                          | Impact                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| `createPlan`                      | Succeeds where it previously raised 23505. No code change       |
| `fetchPlanByStartDate`            | Unchanged; already tolerates duplicate plans per week           |
| `lock_weekly_plan` + its triggers | Unchanged                                                       |
| Meal-history trigger              | Unchanged (its per-plan dedupe is out of scope — see the model) |
| RLS policies                      | Unchanged                                                       |

---

### Rollback

Recreate the single-column index. It is a **narrowing** change in that direction, so it can fail if
by then a household holds drafts for two different weeks — exactly the state this bolt permits.

That asymmetry is worth writing into the migration's rollback note: _rolling this back requires
first resolving any household with more than one draft._ A rollback path that is not literally the
inverse of the forward path should never be discovered during an incident.

---

### ADR-worthy decisions

One, and Stage 3 should write it: **why the index is rescoped rather than removed, and why the
invariant belongs in Postgres at all.** The durable content is not the DDL — it is that a stored
constraint outlived the model it described, that the divergence was visible in a test comment a
release cycle before it caused an outage, and what would have caught it earlier.
