---
stage: design
bolt: 063-dinners-per-week-rule
created: '2026-09-08T18:25:00Z'
---

## Technical Design: 001-dinners-per-week-model

### Architecture Pattern

**Unchanged: both invariants stay in Postgres.** ADR-1. The cap is not advisory — it exists because
two concurrent writers could otherwise exceed it, and a browser cannot serialise itself.

The client will read `dinners_per_week` (unit 002) to render the right prompts, but that copy is an
**affordance**. A screen with the wrong N shows the wrong message; it cannot produce an invalid
plan.

### Layer Structure

```text
┌─────────────────────────────┐
│      Presentation           │  /settings control        ← bolt 064
│                             │  plan/list/cooking gates  ← unit 002
├─────────────────────────────┤
│      Application            │  unchanged this bolt
├─────────────────────────────┤
│        Domain               │  "at most / exactly PlanSize selections"
├─────────────────────────────┤
│     Infrastructure          │  households.dinners_per_week (NEW)
│                             │  fn_weekly_plan_selections_guard      ← CHANGED
│                             │  fn_weekly_plans_require_three_on_lock ← CHANGED + RENAMED
└─────────────────────────────┘
```

---

### ⚠ The trap this design exists to catch

**`CREATE OR REPLACE FUNCTION` discards a `SET search_path` applied by a separate `ALTER FUNCTION`.**

Verified empirically on the local stack rather than assumed:

```text
proconfig entries BEFORE replace = [1]   (after `alter function … set search_path = ''`)
proconfig entries AFTER  replace = [NULL]
```

Both functions this bolt rewrites had `search_path` pinned by **`20260831120000_advisor_hardening.sql`**,
using `alter function … set search_path = ''`. That migration exists because intent 004's Checkpoint 4
advisor run reported `function_search_path_mutable` six times; the finding was triaged, fixed and
verified from a fresh schema dump.

A naive `create or replace` here would undo that security fix for two of the six functions.

> **⚠ Corrected at Stage 5.** This section originally continued: "Nothing would fail. Tests would
> pass. The regression would surface only on the next dashboard advisor run." **That was wrong.**
> `supabase/tests/database/advisor_hardening_test.sql` — which this design did not know about —
> asserts `proconfig` on all six hardened functions, and catches exactly this. Proven by sabotage
> in Stage 5. The mechanism is real; the silence was not. See ADR-12 and the test report.

**Therefore**: every function this bolt replaces must carry `set search_path = ''` **in the CREATE
itself**, not rely on the earlier ALTER. The pgTAP guard already exists and must be repointed when a
hardened function is renamed, or it aborts on a `regprocedure` cast.

This hazard is not specific to this bolt. Any future migration doing `create or replace` on any of
the six functions listed in `20260831120000` has it. Worth an ADR.

---

### Data Persistence

#### The column

```sql
alter table public.households
  add column if not exists dinners_per_week smallint not null default 3
    check (dinners_per_week between 1 and 7);

comment on column public.households.dinners_per_week is
  'How many dinners this household plans per week. 1..7 (a week has seven days); default 3, '
  'which is what the app hard-coded before intent 015. Owner-editable on /settings. Enforced by '
  'fn_weekly_plan_selections_guard (cap) and fn_weekly_plans_require_n_on_lock (exact).';
```

Follows `week_start_day` (`20260904020000`) exactly: additive, `check`-constrained, commented, and
**needing no new RLS** — `households` already carries member-SELECT and owner-UPDATE from
`20260828230000`.

#### The cap trigger

Current body, with the two lines that matter:

```sql
perform 1 from public.weekly_plans where id = v_plan_id for update;   -- serialises
select locked_at into v_locked_at from public.weekly_plans where id = v_plan_id;
...
if v_selection_count >= 3 then
```

**The `for update` stays exactly where it is, on the plan row.** It is the fix from
`20260827002830` and the reason two racers cannot both land a selection.

The plan size is fetched by **widening the `select` that already runs**, rather than adding a
second round trip:

```sql
select wp.locked_at, h.dinners_per_week
  into v_locked_at, v_plan_size
from public.weekly_plans wp
join public.households h on h.id = wp.household_id
where wp.id = v_plan_id;
```

This reads from **the plan's** household, satisfying the model's requirement that the rule follow
the plan rather than the caller.

**Why `households` needs no lock of its own.** A setting change concurrent with an insert is not a
correctness problem in either direction:

- Reading a _stale lower_ value rejects an insert that would have been allowed. Benign — the user
  retries and succeeds.
- Reading a _stale higher_ value allows a selection beyond the new setting. The result is a plan
  holding more selections than the current plan size — which is **already a permitted state**, the
  "valid but unlockable" case the domain model describes for lowering the setting. No new
  inconsistency is introduced.

Serialising on the plan row is therefore sufficient, and this argument belongs in the migration
because the next person will ask.

The exception message must state the real limit, not "3".

#### The lock trigger

`fn_weekly_plans_require_three_on_lock` becomes `fn_weekly_plans_require_n_on_lock`. Its body reads
the plan's household the same way and compares `!= v_plan_size`.

**Renaming means dropping and recreating the trigger**, in the same migration, with the old
function explicitly dropped rather than left beside the new one.

**The refusal message must be actionable.** The domain model records that lowering the setting
below a plan's count produces a valid-but-unlockable plan. Locking then fails for a reason the user
did not cause at lock time, so the message should say what to do — remove the extra picks — not
report a bare count mismatch.

#### The meal-history function

**No logic change.** It already inserts one row per selection via a `select`. Its comment claims
"Writes 3 meal_history rows"; that is false after this bolt and misleading today. Correct the
comment.

**Do not `create or replace` it** just to fix a comment — `comment on function` is enough, and
replacing it would hit the `search_path` trap for no reason.

---

### Migration ordering within the file

1. `alter table households add column …` — must exist before any function references it
2. `create or replace function fn_weekly_plan_selections_guard() … set search_path = ''`
3. `create or replace function fn_weekly_plans_require_n_on_lock() … set search_path = ''`
4. `drop trigger trg_weekly_plans_require_three_on_lock on public.weekly_plans`
5. `create trigger trg_weekly_plans_require_n_on_lock …`
6. `drop function public.fn_weekly_plans_require_three_on_lock()`
7. `comment on function fn_weekly_plans_record_meal_history` — comment only

Step 6 must follow step 4: a function cannot be dropped while a trigger depends on it.

---

### Security

- **No new RLS policy.** The existing `households` policies cover a new column, as they do
  `week_start_day`.
- **`search_path = ''` preserved explicitly** on both replaced functions — see the trap above.
- Enforcement stays server-side; a modified client cannot exceed the cap.

---

### Design for NFRs

- **Performance**: the cap trigger gains a join to a single-row lookup inside a query it already
  ran. No additional statement.
- **Correctness under concurrency**: unchanged, and argued above rather than assumed.

---

### Testing Strategy

pgTAP, at a **non-default** plan size. A suite that only exercises 3 has re-tested the old
behaviour, not the feature.

Required cases:

- Household at N: adding selection N succeeds; N+1 is rejected
- The rejection message names the real limit, not "3"
- Two concurrent inserts at N-1: exactly one wins — the `20260827002830` guarantee, re-proven with
  a variable bound
- Locking at exactly N succeeds; below N and above N are rejected
- Setting lowered below a plan's count: the plan survives intact, and locking refuses with a
  message that says to remove picks
- `meal_history` gets one row per selection at a non-default N — confirming it was N-agnostic
- **`proconfig` on both replaced functions still contains `search_path=`** — the guard against the
  trap
- The `check (between 1 and 7)` rejects 0 and 8

Existing assertions about the three-selection rule are **updated, not deleted**. Bolt 067 found an
assertion whose name promised more than its body tested; the same scrutiny applies here.

**Reminder recorded for whoever runs this**: `supabase test db` does _not_ re-apply migrations. Run
`supabase db reset` first, or the suite will test the old schema and pass.

---

### Integration Points

| Consumer                        | Impact                                                |
| ------------------------------- | ----------------------------------------------------- |
| `addSelection`                  | Succeeds up to N instead of 3. No code change         |
| `lock_weekly_plan`              | Requires exactly N. No signature change               |
| Meal-history trigger            | Unchanged; comment corrected                          |
| `idx_weekly_plans_one_unlocked` | Untouched — bolt 067's concern, a different invariant |
| Client screens                  | Unit 002; this bolt ships no application code         |
| `/settings` control             | Bolt 064                                              |

---

### Rollback

Symmetric and safe, unlike bolt 067's:

```sql
-- restore the literal-3 functions, restore the old trigger name, drop the column
```

The column can be dropped because nothing outside these functions reads it until unit 002 ships.
**If unit 002 has already shipped, dropping the column breaks the client** — so after that point
the rollback is functions-only, leaving the column in place at its default. Recorded in the
migration, because a rollback whose safety depends on what else has shipped is one to think about
before an incident, not during.

---

### ADR-worthy decisions

**One, and it generalises well beyond this bolt**: `CREATE OR REPLACE FUNCTION` silently discards
`SET search_path` applied by `ALTER FUNCTION`, which makes every one of the six functions hardened
in `20260831120000` a trap for any future migration that rewrites them. The ADR should record the
empirical proof, the rule (restate the `SET` in the `CREATE`), and the pgTAP guard that catches a
lapse.
