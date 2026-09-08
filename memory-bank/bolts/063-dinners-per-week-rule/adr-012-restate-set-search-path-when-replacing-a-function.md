---
bolt: 063-dinners-per-week-rule
created: 2026-09-08T18:40:00Z
status: accepted
superseded_by: null
---

# ADR-12: Restate `SET search_path` Whenever a Function Is Replaced

## Context

Intent 004's Checkpoint 4 ran the Supabase dashboard advisors and found
`function_search_path_mutable` on six functions. A function without a pinned `search_path` resolves
unqualified names against whatever the caller's `search_path` says, which lets a caller who can
create objects shadow a table or operator the function relies on. For `security definer` functions
the consequence is privilege escalation; for the rest it is still a correctness hazard.

The finding was fixed in `20260831120000_advisor_hardening.sql`, deliberately and separately:

```sql
alter function public.lock_weekly_plan(uuid)                     set search_path = '';
alter function public.fn_weekly_plans_block_edit_after_lock()    set search_path = '';
alter function public.fn_weekly_plans_require_three_on_lock()    set search_path = '';
alter function public.fn_weekly_plan_selections_guard()          set search_path = '';
alter function public.fn_weekly_plans_record_meal_history()      set search_path = '';
alter function public.reorder_grocery_store_row(uuid, integer)   set search_path = '';
```

The record notes it was verified from a fresh production schema dump: all six pinned.

Intent 015 needs to change the bodies of two of those six — the selection-cap guard and the
lock guard — to read `dinners_per_week` instead of a literal 3. The obvious way to change a
function body in Postgres is `create or replace function`.

## The problem

**`CREATE OR REPLACE FUNCTION` replaces the function's configuration parameters with those in the
new command.** A `SET` clause applied earlier by `ALTER FUNCTION` is not preserved; if the new
`CREATE` does not restate it, it is dropped.

Verified empirically on the local stack rather than taken from documentation:

```text
create function __probe … ;
alter function __probe() set search_path = '';
  -> pg_proc.proconfig entries = [1]

create or replace function __probe … ;   -- no SET clause
  -> pg_proc.proconfig entries = [NULL]
```

So a routine body change to either function would have **silently reverted intent 004's security
fix** for that function.

### How bad is it? Less bad than first assessed — corrected during Stage 5

The first draft of this ADR claimed the regression would be silent, on the grounds that "the
hardening had no test". **That was wrong, and the error was caught by the suite itself.**

`supabase/tests/database/advisor_hardening_test.sql` exists and asserts `proconfig` on **all six**
hardened functions. It was written alongside `20260831120000` and had simply not been noticed while
writing this ADR.

Proven during Stage 5's falsification: dropping the `set search_path` clause from one function
produced

```text
# Failed test 4: "fn_weekly_plan_selections_guard search_path is pinned"
```

So the real failure mode is **"a test fails and you fix it"**, not "a security fix silently
disappears until an advisor run months later". That is a materially smaller problem, and the record
should say so rather than carry a more dramatic story than the facts support.

What remains true, and is still worth an ADR:

- The mechanism is real and non-obvious. `CREATE OR REPLACE` genuinely discards an `ALTER`-applied
  `SET`, and nothing in the function's own definition hints that a property was attached elsewhere.
- Without the guard it _would_ be silent. The project is one deleted test away from the original
  claim being true — and `advisor_hardening_test.sql` is a file whose whole purpose is easy to
  mistake for redundant.
- The guard only helps if the failure is understood. A future maintainer seeing
  "search_path is pinned" fail after a routine body change has no obvious path from that message to
  the cause. This ADR is that path.

## Decision

**Any migration that replaces one of these functions must restate `set search_path = ''` inside the
`CREATE OR REPLACE` itself**, rather than relying on the `ALTER` in `20260831120000`.

```sql
create or replace function public.fn_weekly_plan_selections_guard()
returns trigger
language plpgsql
set search_path = ''          -- ← restated; NOT inherited from the earlier ALTER
as $$ … $$;
```

**The pgTAP guard already exists** — `advisor_hardening_test.sql` asserts `proconfig` on all six
functions. A migration that renames one of them must update that file, or it aborts on a
`regprocedure` cast for a function that no longer exists. This bolt did exactly that, pointing the
assertion at `fn_weekly_plans_require_n_on_lock`.

No duplicate assertion was added to `weekly_planning_test.sql`: one guard, in the file whose subject
it is.

### Why not re-`ALTER` after replacing

It works, but it puts the pin one statement away from the definition, where the next person editing
the function will not see it. The whole failure mode here is a property that lives somewhere other
than the thing it protects. Restating it in the `CREATE` puts it where a reader is already looking.

### Why not drop the hardening and pin globally

There is no database-wide default for function `search_path`. It is per-function, and the six are
pinned because the advisor named them. Nothing to consolidate.

## Consequences

- Both functions this bolt replaces carry an explicit `set search_path = ''`.
- `advisor_hardening_test.sql` follows the rename, so its six-function guard stays complete.
- The rule applies to any future migration touching those six functions.

### What the first draft of this ADR got wrong

It asserted the hardening was untested and the regression therefore silent. Both claims were false;
`advisor_hardening_test.sql` covers all six. Corrected above rather than quietly edited, because an
ADR that overstates a risk is itself a small trap — the next reader would act on a threat model
that does not match the repository.

### A general lesson, beyond `search_path`

The hazard is not really about `search_path`. It is that **`CREATE OR REPLACE` resets attributes
the original `CREATE` did not state**, and an attribute applied later by `ALTER` is invisible at the
place where someone edits the body.

The same shape as ADR-11's finding, one level down: there, a constraint's meaning drifted from what
the application meant and the divergence was visible only in a test comment. Here, a function's
security property lives one migration away from its definition. Both are properties stored somewhere
other than where they are read.

Where a property must hold, put it where the next reader will be looking, and assert it.

## Related

- **`20260831120000_advisor_hardening.sql`** — pinned all six; this ADR protects two of them.
- **Intent 004, Checkpoint 4** — the advisor re-run that would have caught a lapse is still open.
- **ADR-11** — same family of defect: a rule stored away from the thing it governs.
- **ADR-1** — invariants belong in Postgres; this is about not weakening them by accident.
