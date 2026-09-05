---
bolt: 055-placement-review-state
created: 2026-09-05T18:25:00Z
status: accepted
superseded_by: null
---

# ADR-10: Open a Trigger-Owned Table With a Function, Not a Column Grant

## Context

ADR-7 made `public.items` **trigger-owned**: rows are created only by
`trg_dinner_ingredients_sync_item`, as a consequence of a committed `dinner_ingredients` row.
No application path writes the table. The table therefore carries a `SELECT` policy and nothing
else — no `INSERT`, `UPDATE` or `DELETE` policy exists.

That is not incidental tidiness. It is what guarantees one spelling rule for grocery identity.
If the app could also write `items`, two writers would decide what a grocery is called and how
it is normalized, and they could disagree — leaving `"Spaghetti"` and `"spaghetti "` as two
separate registry entries resolving to two different stops, with nothing to say which is real.
A wrong merge is silent and structural (ADR-7); one writer makes it impossible.

Intent 013 now needs a household member to mark an Item **reviewed** — to say "I have looked at
where this sits". That is a write to `items.reviewed_at`, and it is the first legitimate reason
the application has ever had to write this table.

The question is not _whether_ to allow it. It is what shape the exception takes.

## Decision

Add a narrow `security definer` RPC — `public.mark_item_reviewed(p_item_id uuid)` — that sets
`reviewed_at` and nothing else. Grant `execute` to `authenticated`.

**Grant `items` no application write privilege whatsoever.** The table stays closed; the
function is the only door, and it opens onto one column.

## Alternatives Considered

### Column-scoped grant (rejected)

```sql
grant update (reviewed_at) on public.items to authenticated;
create policy "items update reviewed_at in own household" on public.items
  for update using (household_id = public.current_user_household_id());
```

Postgres column privileges are real: an `UPDATE` touching `name` is refused with _permission
denied for column name_. On the day it ships this is correct, simpler than a function, and lets
the client call `.update()` instead of `.rpc()`. It is a perfectly defensible choice, which is
why this ADR exists — the reason to reject it is not visible from the code.

**Rejected because the invariant would rest on an absence.** Under this approach `items.name`
is safe because a privilege was _not_ granted. Absences are quiet:

- a later `grant all on all tables in schema public to authenticated` — a common convenience
  line — silently restores full write access
- a Supabase default-privileges change does the same
- a future migration re-granting the table looks harmless in review

In none of those cases does anything fail. No test errors, no advisor warning, no build break.
The registry simply becomes writable again and stays that way until something corrupts it.

Under the RPC, the same accident is still possible in principle — but the protection is a
**thing that exists** rather than a thing withheld. Deleting a function to weaken the invariant
is a visible act; forgetting to withhold a grant is not.

### Widening the trigger to carry review state (rejected)

Marking reviewed is a user's judgement about placement, not a consequence of an ingredient
existing. Folding it into `fn_dinner_ingredients_sync_item` would put two unrelated
responsibilities in the one function ADR-7 exists to keep single-purpose, and would risk the
create path for a feature that has nothing to do with it.

### Storing review state on a separate table (rejected)

An `item_reviews (item_id, reviewed_at)` table would leave `items` untouched entirely. It costs
a join on every read of a query unit 002 already runs, an extra row per grocery, and a second
place for `items` and its review state to disagree after a delete — all to avoid one nullable
column. Disproportionate.

## Consequences

**Good**

- `items` keeps zero application write privileges; ADR-7's single-writer property survives
  intent 013 intact.
- Consistent with how this schema already handles constrained writes: `reorder_location`,
  `set_ai_model_override`, `set_ai_daily_call_limit`, `set_household_ai_key`,
  `clear_household_ai_key` are all narrow `security definer` RPCs. A column grant would have
  been the only one of its kind.
- Idempotency and the household check live in one place, so every caller — accept, move, place,
  and whatever intent 014 adds — can call it unconditionally without branching.

**Costs, accepted**

- One more function to maintain, and `security definer` means the household check is the
  function's own responsibility: it bypasses RLS by construction, so forgetting the check is a
  cross-household write, not a refused one. This must be tested, not assumed.
- Callers use `.rpc()` rather than `.update()` — marginally less idiomatic for a PostgREST
  client.
- A cross-household or missing id affects zero rows and returns normally rather than raising.
  Deliberate: an error would tell the caller whether an id exists in someone else's household.
  The cost is that a caller cannot distinguish "marked" from "not yours", which no caller needs
  to.

**Requires verification, not assumption**

This ADR's whole argument is that a silently-present grant would dissolve the invariant. That
failure mode may **already** exist: if `authenticated` currently holds a blanket `UPDATE` on
`items` from a Supabase default-privileges grant, then ADR-7's property does not actually hold
today and this RPC does not by itself restore it. Bolt 055 must check the live grants rather
than infer them from the absence of a policy — a policy and a privilege are different things,
and RLS only filters rows for a role that already has the privilege.

If the grant is found, revoking it is in scope for this bolt and the finding gets recorded here.

## Read When

Adding a write to any table deliberately closed to the application — a registry, an audit
trail, a ledger, anything with a single owning writer. The instinct is to grant exactly the
column you need; prefer a function that names it, so the constraint is something that exists
rather than something omitted. Also read when wondering why `items` has a `SELECT` policy and
no others, why marking a grocery reviewed goes through an RPC when it looks like a one-column
update, or before adding `grant all on all tables in schema public` to any migration in this
project — that line would quietly undo ADR-7 and this decision together.

See also: ADR-7 (the Items registry and its single-writer rule).
