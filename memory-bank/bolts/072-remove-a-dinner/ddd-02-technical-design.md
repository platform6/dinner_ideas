---
stage: design
bolt: 072-remove-a-dinner
created: '2026-09-11T18:10:32Z'
---

## Technical Design: 003-remove-a-dinner

### Architecture Pattern

**One named Postgres function owns the whole destructive reach**, with a read-only companion that
reports the impact first. This is ADR-13's shape run in reverse: the aggregate was written in one
transaction, and it is removed in one.

**Why a function, and not `ON DELETE CASCADE` on the two plain references.** Changing
`meal_history.dinner_id` and `weekly_plan_selections.dinner_id` to cascade would make _every_
delete of a dinner, from any path, now or in the future, silently erase history and edit plans,
including this week's locked one. A function keeps the destructive reach in **one place with a
name**, and it can **refuse** the locked-plan case, which a foreign key cannot. The foreign keys stay
exactly as they are. A stray `delete from dinners` still fails loudly, which is the right default
for everything except the one sanctioned path.

---

### Layer Structure

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Presentation                                                          │
│   catalog card menu: "Not interested" (existing, reversible)          │
│                      "Remove…" (new, permanent, visibly different)     │
│   RemoveDinnerDialog: loads the impact, states it, then confirms       │
├──────────────────────────────────────────────────────────────────────┤
│ Application                                                           │
│   fetchRemovalImpact / removeDinner (dinners/api), useRemoveDinner     │
├──────────────────────────────────────────────────────────────────────┤
│ Domain (Postgres)                                                     │
│   fn_dinner_removal_impact(id) — read only                            │
│   fn_remove_dinner(id)         — all of it, or none, or a refusal      │
├──────────────────────────────────────────────────────────────────────┤
│ Infrastructure                                                        │
│   dinners (+ CASCADE children), weekly_plan_selections, meal_history   │
│   — foreign keys UNCHANGED                                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

### API Design

**`fn_dinner_removal_impact(p_dinner_id uuid) returns jsonb`**, `stable`:

```json
{ "history_count": 3, "past_plan_count": 2, "in_current_draft": true, "in_current_locked_plan": false }
```

**`fn_remove_dinner(p_dinner_id uuid) returns void`**, which in one transaction:

1. Finds the dinner **in the caller's household** and locks the row (`for update`). If it is not
   there (missing, or another household's), it raises **`P0002` not found**, so a caller can never
   tell another household's dinner from one that does not exist
2. If the dinner is in a **locked plan whose week has not ended**, it raises **`P0001`
   `in_current_locked_plan`** and nothing changes
3. Deletes the dinner's `meal_history` rows
4. Deletes the dinner's `weekly_plan_selections`, which covers past plans and this week's draft
5. Deletes the `dinners` row, and its lines, steps and tag links follow by the existing cascades

**"A week that has not ended"** means `start_date + 7 > current_date`. A plan covers seven days
from its start, whatever `week_start_day` is, so this needs no weekday arithmetic. It also covers a
future plan, if the planning window ever allows one. Known imprecision: `current_date` is UTC, so the
boundary can be a few hours off local midnight, and only on the last day of a week. The error
there is refusing a removal a few hours longer than necessary, which is the safe direction.

---

### Security: `security definer`, deliberately, per ADR-10

ADR-13 made `fn_create_dinner` **invoker** so the existing insert policies applied. This function
cannot simply follow it:

- `meal_history` is **trigger-owned** (ADR-2). Its rows are written by the lock trigger and
  deliberately not deletable by clients. **[verify at Stage 4: no client DELETE policy]**
- Adding client DELETE policies to `meal_history` and `weekly_plan_selections` so that an invoker
  function could work would let **any client delete history directly through PostgREST**, bypassing
  the removal flow, its warning and its locked-plan refusal.

ADR-10's answer to "open a closed table for one sanctioned purpose" is **a function that names the
exception, not a grant or a policy**. So:

- **`security definer`**, with the household check **written into the function**, keyed off
  `current_user_household_id()`, the same helper the RLS policies use
- **`set search_path = ''`** and fully qualified names throughout (ADR-12). It is added to
  `advisor_hardening_test.sql`, or that suite silently covers one function fewer than it appears to
- `revoke execute … from public, anon`, and `grant execute … to authenticated`
- The impact function stays **`security invoker`**. It only reads, and the existing SELECT policies
  already scope every count to the household

**Any household member may remove**, not only owners. That matches who may _add_ a dinner (bolt 060
lets any member save). The shared catalog is the whole household's, in both directions.
**[verify at Stage 4: dinners insert is member-level, and match it]**

---

### What Stage 4 must verify before writing anything

The design stage cannot read the schema. These are the assumptions, and the design changes if any
of them is false:

1. **Is there a trigger blocking deletes of selections in a _locked_ plan?** Past weeks' plans are
   locked, so step 4 would hit it. If one exists, the function needs a narrow, transaction-local
   escape (a `set_config('app.dinner_removal', 'on', true)` checked by that trigger, following the
   `app.provisioning_disabled` precedent). That would mean restating the trigger function with
   `search_path` (ADR-12)
2. **Does the items sync trigger (ADR-7) do anything on ingredient DELETE?** The model says items must
   survive
3. **Does anything surface past weeks' plans or raw `meal_history`?** The decision that history goes
   rests on "no remaining reader"
4. **Is there a `meal_history` DELETE policy?** The case for `definer` rests on there being none
5. **Do the design records' foreign key rules match the actual migrations?** The whole model rests on
   the two plain `REFERENCES`

---

### Data Model

**One migration**, which adds two functions and changes no table, column, constraint or foreign key.
If check 1 finds a blocking trigger, the migration also restates that trigger function with the
narrow escape. That would be recorded as a deviation.

---

### The dialog

- **"Remove…"** sits in the card menu **below** "Not interested", visually destructive (red), and
  with the ellipsis that means "asks before it acts"
- Opening it **loads the impact first**. Nothing is enabled until the impact is known
- It states, in plain words, only the lines that apply:
  - _"This can't be undone."_ (always)
  - _"It's been cooked 3 times — that history goes with it."_
  - _"It's in this week's plan — it'll be taken off, and this week's shopping list will change."_
  - _"It's in this week's locked plan, so it can't be removed until the week is over."_ When this
    applies, **Remove is disabled**, and _Not interested_ is offered as what to do now
  - _"To just hide it, use Not interested instead — that can be undone."_ (always), so the two
    actions are visibly different choices
- **Cancel** is the default focus. A permanent action should never be one Enter key away

After removal: the catalog, the plan and the shopping list are invalidated
**[verify the query keys at Stage 4]**, and the dialog closes.

---

### NFR Implementation

- **NFR-3 (atomic, no orphans)**: one function, one transaction; the children go by the existing
  cascades; the refusal raises before anything is deleted
- **Tags and items survive**: by construction for tags (the cascade runs the other way), and by
  verification for items (check 2)
- **Name reusable**: a hard delete frees `(household_id, name)`; pgTAP re-inserts the same name
- **Isolation**: another household's dinner gives `P0002`, the same as a missing one

---

### Testing Approach (for Stage 5)

**pgTAP** (`remove_dinner_test.sql`):

- a never-planned dinner goes with all three child row types; tags and items remain; the name can be
  reused
- history and past selections go
- this week's draft selection goes
- **this week's locked plan refuses with `P0001`, and nothing changes**, checked by counting the
  dinner, its children, the history and the selections before and after
- another household's dinner gives `P0002`, and nothing changes
- the impact function returns the right four values for each case
- `fn_remove_dinner` is `security definer`, with `search_path = ''`, and is listed in
  `advisor_hardening_test.sql`

**Vitest**: the dialog shows only the lines that apply, disables Remove for the locked case, puts
Cancel first, and is visibly distinct from "Not interested"; the API maps `P0001` and `P0002` to
plain messages.

**Sabotage** (the project's standing rule): drop the locked-plan refusal and confirm the refusal test
fails; switch the function to invoker and confirm history deletion fails for lack of a policy.

---

### Candidate ADR for Stage 3

**"Removing a dinner removes its history; one named function owns that reach, and the current week's
locked plan is the one thing it will not break."** It records three decisions a future change could
easily undo by accident: history goes with the dinner; the foreign keys stay non-cascading, so no
other path can do this; and `definer` is used here even though ADR-13 argued for `invoker`, per
ADR-10.
