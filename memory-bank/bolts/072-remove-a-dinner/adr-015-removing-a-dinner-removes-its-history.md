---
bolt: 072-remove-a-dinner
created: '2026-09-11T18:11:35Z'
status: accepted
superseded_by: null
amended: '2026-09-17T15:26:52Z'
---

> **Amended 2026-09-17 after product owner review.** The locked-plan exception is **confirmed**.
> Two facts below were wrong and are corrected in place, each marked _Corrected_. See
> [Product owner review](#product-owner-review-2026-09-17) at the end.

# ADR-15: Removing a Dinner Removes Its History — Through One Named Function, Never a Cascade

## Context

Release v0.14.0 made the catalog writable but not correctable. Intent 018's first production
import (a pretzel bark with wrong quantities) could not be taken out: "Not interested" hides a
dinner, and there was no delete.

A dinner is referenced from outside its own aggregate:

- **Inside the aggregate** (`dinner_ingredients`, `dinner_steps`, `dinner_tags`): all are
  `ON DELETE CASCADE`. They go with the dinner, and should.
- **Outside it**: `weekly_plan_selections.dinner_id` and `meal_history.dinner_id` are plain
  `REFERENCES dinners(id)`, **with no delete rule**. Postgres therefore refuses (`23503`) to delete
  any dinner that has ever been planned or cooked. That covers most of the catalog.

At intent 018's Checkpoint 2 the product owner decided removal should **warn and proceed, not
refuse**, because refusing would leave a wrong recipe in the catalog permanently the moment anyone
had cooked it.

Two invariants from the WeeklyPlan aggregate are in play: **a locked plan is immutable**, and **a
locked plan holds exactly `dinners_per_week` selections**.

## Decision

1. **Removal takes the dinner's history with it.** Its `meal_history` rows and its plan selections
   are deleted, after the user has been told how many.
2. **One named function, `fn_remove_dinner`, owns that reach**, in one transaction: all of it, or
   none of it, or a refusal. A read-only `fn_dinner_removal_impact` reports what would go, so the
   warning is built from facts.
3. **The foreign keys stay non-cascading.** A `delete from dinners` from any other path still fails,
   and that is deliberate.
4. **This week's locked plan is the one thing removal will not break.** A dinner in a locked plan
   whose week has not ended (`start_date + 7 > current_date`) is refused with `P0001`, and the
   dialog says when it becomes removable and offers "Not interested" meanwhile.
5. **`fn_remove_dinner` is `security definer`**, with the household check written into it,
   `search_path = ''`, and a listing in `advisor_hardening_test.sql`. The impact function stays
   `invoker`.

## Rationale

**History goes because nothing reads the history of a dinner that no longer exists.** Every reader
of `meal_history` is per dinner: the "last made" label on a card, `dinner_last_chosen`, and lucky
pick's recency weighting (intent 016). For a removed dinner each has nothing left to label, weight
or pick. _Corrected:_ this originally said past weeks' plans are not browsable after rollover. They
are: `/plan` week navigation loads any past plan by start date (`useWeekByOffset`, intent 011), so a
removed dinner also disappears from every past week it was in. The product owner accepted that
consequence on 2026-09-17. Keeping history would
need a nullable `dinner_id` plus a snapshot of the name, or a tombstone, and every history reader
would then have to handle a "removed dinner". That is permanent cost for data with no reader. The
warning still states the count, so nothing goes silently.

**A function rather than `ON DELETE CASCADE`** because a cascade on those two references would make
_every_ dinner delete, from _any_ path, now or later, silently erase history and edit plans,
including this week's locked one. A foreign key cannot refuse one case, but a function can. Keeping
the reach in one named place also means a future reader can find everything that removal does by
reading one function.

**The locked-plan exception narrows Checkpoint 2 without contradicting it.** That decision was about
_permanence_: a cooked recipe stuck forever. A dinner in this week's locked plan is being cooked this
week, and becomes removable when the week ends. Removing it now would leave a locked plan with one
fewer dinner than the household plans for and change a shopping list someone may be shopping
from. It is the one place intent 018's construction narrowed an explicit decision, so it went back
to the product owner, who **confirmed it on 2026-09-17**.

**`definer`, even though ADR-13 argued for `invoker`.** ADR-13's function writes rows the existing
RLS insert policies already allow, so `invoker` kept those policies in force. This function must
delete trigger-owned `meal_history` rows that clients deliberately cannot delete. Making `invoker`
work would mean adding client DELETE policies, and then any client could delete history directly
through PostgREST, skipping the warning and the refusal. ADR-10's rule for opening a closed table
for one purpose is **a function that names the exception, not a grant or a policy**.

### Alternatives Considered

| Alternative                                        | Pros                         | Cons                                                                                                         | Why Rejected                                                 |
| -------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `ON DELETE CASCADE` on the two references          | No function; one line per FK | Every delete from any path erases history and edits locked plans; cannot refuse                              | Too much reach, and nowhere to put the one refusal           |
| Keep history: nullable `dinner_id` + name snapshot | The past stays literal       | A "removed dinner" state every history reader must handle, for data with no reader                           | Permanent cost, no benefit anyone can see                    |
| Tombstone (`removed_at`) instead of delete         | History intact; reversible   | Contradicts "deleted" in story 001; needs a partial unique index to free the name; overlaps "Not interested" | Blurs the one line the user must see clearly: hide vs remove |
| Refuse any dinner with history                     | Nothing is ever lost         | Exactly what Checkpoint 2 rejected                                                                           | Rejected by the product owner                                |
| `invoker` + client DELETE policies                 | Matches ADR-13's style       | Any client can delete history directly, bypassing the flow                                                   | ADR-10: name the exception in a function                     |

## Consequences

### Positive

- Any dinner can be removed except, temporarily, one in this week's locked plan. The catalog is now
  correctable.
- Removal is atomic and complete: no orphaned lines, steps, links, selections or history.
- The name is freed, so a corrected recipe can be re-imported under it.
- No other code path gained the ability to delete history. The foreign keys still refuse.

### Negative

- **History is gone for good.** If a future intent adds "what did we eat in March?", the history of
  removed dinners will not be in it. That intent would need a snapshot, or a different removal rule,
  and should read this ADR first.
- **Past weeks visibly shrink.** A removed dinner leaves every past plan it was in, so `/plan` week
  navigation shows a locked 3-dinner week as 2. Accepted by the product owner (2026-09-17).
- One more `security definer` function to keep hardened (ADR-12), and it has to stay on the advisor
  list.
- The week boundary is computed with the database's `current_date`, which is **UTC**, while the
  app's planning week is local. _Corrected:_ this originally said the refusal errs on the safe side.
  That holds only east of UTC. For a household behind UTC it lifts **early**: at UTC-4 with a Sunday
  week start, `start_date + 7 > current_date` stops being true at 20:00 local on Saturday. For the
  last hours of the week, a dinner in the current locked plan can be removed, and the selections
  guard allows it too, because its escape uses the same test. Accepted as low harm (the week's last
  evening). There is no stored household timezone to fix it with.

## Read When

- **Adding any way to delete a dinner.** Route it through `fn_remove_dinner`, never a new
  `delete from dinners`, and do not add `ON DELETE CASCADE` to `meal_history` or
  `weekly_plan_selections`.
- **Adding a feature that reads the past**: meal history reports, "what did we eat", or browsing past
  weeks. Removed dinners' history does not exist, and that feature may need a snapshot.
- **Changing locked-plan rules**, or adding unlock, since the refusal depends on "a locked plan is
  immutable".
- **Wondering why this function is `definer`** when ADR-13's is `invoker`.

See also: ADR-2 (history written at lock), ADR-10 (open a closed table with a function), ADR-12
(`search_path`), ADR-13 (the aggregate write this reverses), ADR-14 (what a stored quantity means).

## Stage 4 verification (against the real schema)

The design stage could not read code, so it listed five assumptions. Checked on the local database
with every migration applied:

| #   | Assumption                                         | Result                                                                                                                   |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Nothing blocks deleting a locked plan's selections | **FALSE.** `fn_weekly_plan_selections_guard` raises on _any_ delete from a locked plan, including every past week's plan |
| 2   | The items sync trigger ignores deletes             | ✅ `trg_dinner_ingredients_sync_item` is `AFTER INSERT/UPDATE` only                                                      |
| 3   | Nothing reads past plans or raw history            | ✅ The only history reader is the per-dinner `dinner_last_chosen` view; plans are fetched by current start date          |
| 4   | `meal_history` has no client DELETE policy         | ✅ Only INSERT and SELECT, so `definer` is needed                                                                        |
| 5   | The two references are plain `NO ACTION`           | ✅ Exactly as the design records said                                                                                    |

**Consequence of #1, anticipated by the design:** the guard is restated with **one narrow escape**.
It excuses a selection delete only when **all three** hold: it is a DELETE; the transaction-local
`app.dinner_removal = 'on'` is set (which only `fn_remove_dinner` sets); and the plan's week has
**ended**. So even the sanctioned path cannot touch this week's locked plan. That is a second
guard behind the function's own refusal, not a replacement for it. The rest of the guard (the
`for update` race fix, the locked check, the `dinners_per_week` cap) is restated unchanged, and all
411 existing pgTAP tests pass against it. ADR-12: `search_path = ''` is restated.

## Product owner review (2026-09-17)

Held after v0.15.0 reached production, against the live code and schema.

| Question                                                                 | Decision      |
| ------------------------------------------------------------------------ | ------------- |
| Keep the locked-plan exception (Decision 4), which narrows Checkpoint 2? | **Confirmed** |
| Accept that a removed dinner disappears from past weeks on `/plan`?      | **Accepted**  |

Two facts in the original text were found wrong during the review and are corrected in place: past
plans **are** browsable, and the UTC week boundary lifts the refusal **early**, not late, for a
household behind UTC. Neither changes the decision, so no code changes. For context, at review time
production's last three plans were 2026-09-13 (draft), 2026-09-06 (draft) and 2026-08-30 (locked),
so in practice the exception rarely applies.
