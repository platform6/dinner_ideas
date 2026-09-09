---
stage: design
bolt: 060-recipe-save
created: '2026-09-08T22:55:00Z'
---

## Technical Design: 001-recipe-manual-entry (the save)

### The demand this design must meet

From stage 1: **no mechanism may leave the catalog holding a row that is not a Dinner.** Everything
below is chosen against that, and the losing option is described honestly rather than strawmanned.

---

### Architecture Pattern

**A Postgres function holding the whole aggregate write in one transaction**, called over
PostgREST's RPC endpoint. The client keeps validation for the interface; the database keeps it for
the truth.

This follows ADR-1 — an invariant that must hold regardless of caller belongs in Postgres — and it
is the same shape as every other rule in this project: the selection cap, the lock rule, the plan
uniqueness index.

#### Why not client-side compensation

The story frames compensation as "insert the dinner, then the children, delete the dinner if
anything fails", and notes the compensating delete can itself fail. That is true and sufficient,
but it undersells the problem in a way worth writing down, because the weaker version invites the
reply "so retry the delete".

**The window is not only a failure window. It is a visibility window.**

Between the `dinners` insert and the `dinner_ingredients` insert, the row is committed and
queryable. Not hypothetically: the catalog is a live react-query cache in two households members'
phones, and `dinner_ingredients` is what the shopping list aggregates. During that window —

- another member's catalog can list a dinner with no ingredients and no steps
- that dinner can be **picked for the week**, because picking only needs its id
- the shopping list will then aggregate nothing for it, silently
- the cooking view shows "No steps available for this dinner yet"

and all of that happens on the path where **nothing goes wrong at all**. A perfectly successful
client-side save still publishes a non-Dinner for as long as the round trips take, which on a phone
on bad signal is exactly when the household is standing in a kitchen using the app.

Compensation cannot fix this. It is a cleanup for the failure case; the visibility problem is in
the success case. Only a transaction makes the window not exist, because only a transaction keeps
the intermediate states unpublished.

The failure-case argument stands too, and is worse than "the delete might fail": the delete is most
likely to fail _for the same reason the insert did_ — the connection that just dropped. Compensation
is at its least reliable precisely when it is needed.

**The bolt brief warns against picking for convenience**, and this design honours that: the choice
is made on whether the invariant holds.

The brief also offers a supporting argument — that the migration ships regardless, so the function
costs nothing extra. **That argument turned out to be false** (see Data Model below: the constraint
was already rescoped by intent 004). The function does add a migration compensation would avoid.
The decision is unchanged, because it never rested on that; but the real cost is recorded rather
than left standing on a premise that does not hold.

---

### Layer Structure

```text
┌─────────────────────────────────────────────────────────┐
│  Presentation   RecipeEntryPage — draft state, messages │
├─────────────────────────────────────────────────────────┤
│  Application    useSaveDinner — mutation, cache          │
│                 mapSaveError — Postgres code → English   │
├─────────────────────────────────────────────────────────┤
│  Domain         draft.ts — the aggregate and its rules   │
│                 (bolt 059; unchanged, gains a caller)    │
├─────────────────────────────────────────────────────────┤
│  Infrastructure api.ts — one RPC call                    │
│                 fn_create_dinner — THE TRANSACTION       │
└─────────────────────────────────────────────────────────┘
```

Responsibilities, stated so the boundaries are not blurred later:

- **Presentation** owns the draft and renders rejections. It performs no writes.
- **Application** turns one draft into one RPC call and one cache invalidation. It does not
  re-validate; `validateDraft` already said whether the draft is complete.
- **Domain** is bolt 059's `draft.ts`, untouched. `parsePositiveNumber` and `numberedSteps` gain
  their second caller here — that was the point of exporting them.
- **Infrastructure** is a single function call. There is no place in this design where a caller
  can insert one member of the aggregate on its own.

---

### API Design

**`public.fn_create_dinner(...) returns uuid`** — the new dinner's id, so the interface can send
the user to it.

| Parameter             | Type      | Note                                    |
| --------------------- | --------- | --------------------------------------- |
| `p_name`              | `text`    |                                         |
| `p_cuisine_type`      | `text`    |                                         |
| `p_cook_time_minutes` | `integer` |                                         |
| `p_instructions`      | `text`    | the one-line summary                    |
| `p_ingredients`       | `jsonb`   | `[{quantity, unit, name, category}]`    |
| `p_steps`             | `text[]`  | **ordered**; the number is the position |
| `p_tag_names`         | `text[]`  | normalized names; find-or-create        |

**Typed where typing is cheap, `jsonb` only where the shape has four fields.** Steps are an ordered
list of strings and tags a list of strings, so arrays say exactly what they are; ingredients would
need a composite type to be equally honest, and a composite type is a schema object to maintain for
one caller.

**`security invoker`, deliberately.** Every insert then runs as the calling user, so the existing
RLS insert policies apply unchanged — story 005's "no new policy, no `service_role` path" is met by
construction rather than by care. A `security definer` function would bypass RLS and oblige this
function to re-derive the household checks that policies already make, which is more code and more
ways to be wrong.

**`set search_path = ''`, with every reference schema-qualified**, per ADR-12 from this session.
Restated in the function body, not inherited.

#### Three things the function gets for free

1. **Atomicity.** A plpgsql function body is one transaction. Any exception rolls back every insert,
   including ones the trigger performed.

2. **Contiguous step numbers.** `unnest(p_steps) with ordinality` numbers the array 1..n. INV-3 is
   not enforced, it is _unrepresentable_ — there is no parameter in which a gap could be expressed.

3. **The grocery registry.** The items trigger fires on `dinner_ingredients` insert, inside this
   transaction. Per ADR-7 the function writes nothing to `items` and must not be "helped".

#### What the function must still check itself

INV-1 and INV-2 — at least one ingredient, at least one step — have no column constraint to lean
on. An empty array is a perfectly valid `text[]`. The function raises, which is the ADR-1 position:
the client's validation is for the person typing, and this is for everyone else, including unit
002's importer and anything future that calls the RPC directly.

---

### Data Model

**One migration, carrying only the function.**

> **Correction, found during implementation.** This section originally specified a constraint swap:
> `dinners.name` from globally unique to `unique (household_id, name)`, per the bolt brief's "the
> migration is certain" and story 006's note that the constraint is global.
>
> **It has already been done.** Intent 004 rescoped it on 2026-08-28 in
> `20260828231000_account_model_household_id_columns.sql`, and production confirms `dinners` carries
> exactly one unique constraint: `dinners_household_id_name_key UNIQUE NULLS NOT DISTINCT
(household_id, name)`. Resolved decision 3 was answered before intent 014 was written; the story
> and the brief simply had not caught up.
>
> Two consequences. The migration is smaller — it carries `fn_create_dinner` and nothing else. And
> ADR-13's cost list is corrected: this decision _does_ add a migration compensation would have
> avoided, which is recorded there rather than quietly dropped.

The relevant constraint, already live:

```sql
alter table public.dinners
  add constraint dinners_household_id_name_key
  unique nulls not distinct (household_id, name);
```

A duplicate name therefore raises `23505` on `dinners_household_id_name_key` — per household, which
is the behaviour story 006 wants. Nothing to change; the client maps the code to English.

**No new table, no new column, no RLS change.** The four tables written are `dinners`,
`dinner_ingredients`, `dinner_steps`, `dinner_tags`, plus find-or-create on `tags`.

**Down path**, documented as every prior migration's is: reversing the constraint swap is safe only
while no two households share a dinner name. The moment a second household names a dinner the first
already has, the global constraint cannot be restored without deleting data. **Asymmetric**, like
bolt 067's index — and the note belongs in the migration header where the person reverting will
read it.

---

### Security Design

| Concern              | Approach                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row access           | `security invoker` — existing RLS policies apply to every insert unchanged                                                                                  |
| Household assignment | `household_id` defaults to the caller's household, as today; the function never accepts one as a parameter, so a caller cannot write into another household |
| `search_path`        | `set search_path = ''` restated in the function, all references schema-qualified (ADR-12)                                                                   |
| Privilege escalation | None: no `security definer`, no `service_role`, no new grant beyond `execute` to authenticated                                                              |
| Injection            | Parameterized throughout; no dynamic SQL anywhere in the body                                                                                               |

**The hardening test.** This project has a pgTAP file asserting `proconfig` on its hardened
functions. A new function with `set search_path = ''` belongs in that assertion, or the guarantee
quietly covers six functions out of seven. Adding it is part of stage 5, and is the kind of thing
that is invisible until someone writes a migration that drops the setting.

---

### NFR Implementation

| Requirement        | Approach                                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atomicity          | The transaction. This is the whole design.                                                                                                                                                                                                           |
| Round trips        | **One**, versus four or more for compensation. On a phone on bad signal — the case where compensation is least reliable — this is also the fastest.                                                                                                  |
| Double submission  | The mutation's in-flight state disables the button; `unique (household_id, name)` is the actual guarantee. Story 005 asks for both, and is right to: the UI guard is a courtesy, the constraint is the enforcement.                                  |
| Error legibility   | `mapSaveError` maps SQLSTATE to English. `23505` → "A dinner called X already exists." `23514` (check violation) → a message naming the field. Anything else → a generic message; **the raw Postgres text never reaches the interface** (story 006). |
| Draft preservation | The mutation never clears the draft. A rejection leaves the page exactly as it was, so a name clash costs one edit, not a re-entry of every ingredient.                                                                                              |

---

### Integration Points

- **The items trigger** (ADR-7) — fires inside the transaction; nothing to do, and doing something
  would be a defect.
- **The catalog and shopping-list caches** — invalidated on success. The dinner must appear without
  a manual refresh (story 005's "appears and can be picked").
- **Unit 002's importer** — produces the same draft, so it will call the same `useSaveDinner`.
  Nothing here may assume the draft was typed by hand.

---

### Design Decisions For The Checkpoint

1. **A Postgres function, not client compensation.** Argued above; the ADR in stage 3 records it.
2. **`security invoker`, not `definer`.** RLS unchanged, no new policy.
3. **`jsonb` for ingredients, `text[]` for steps and tags.** Typed where typing is cheap.
4. **The function validates INV-1 and INV-2 itself**, rather than trusting the client.
5. **`unique (household_id, name)` replaces the global constraint**, with an asymmetric down path
   recorded in the migration header.
