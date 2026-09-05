---
unit: 001-location-item-model
bolt: 051-location-item-model
stage: test
status: complete
updated: '2026-09-04T21:10:00Z'
---

# Test Report - Location/Item Model Cutover

## Summary

| Suite                               | Result             | Notes                                                                                |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| **pgTAP — this bolt**               | **30/30 passed**   | `supabase/tests/database/location_item_model_cutover_test.sql`                       |
| **pgTAP — bolt 050**                | **53/53 passed**   | Unaffected                                                                           |
| **pgTAP — pre-existing (17 files)** | **256/256 passed** | Includes both `grocery_store_config` files — the old model is untouched, as designed |
| **pgTAP — total**                   | **339/339 passed** | `Files=19, Tests=339 … Result: PASS`                                                 |
| **`tsc -b`**                        | Clean              | No type regeneration needed — this bolt changes no schema                            |
| **Clean-slate `db reset` + suite**  | Pass               | Full 22-migration chain applied from scratch, then green                             |

The migration's own step-5 equivalence gate also passed against the founding household's real
data on every `db reset` — if it had not, the migration would have aborted and no test would
have run at all.

---

## Acceptance Criteria Validation

### Story 007 — Cutover migration

- ✅ **Exactly one `stores` row per household, `is_active = true`** — asserted for the founding
  household, for the fixture household, and for a household with **no rows at all** (which
  still gets an empty Store, per the story's first edge case)
- ✅ **Every `grocery_store_rows` row → a `locations` row**, `name` and `position` preserved
  verbatim — asserted row-for-row via a `not exists` counter-check, not just by count
- ✅ **`type` inferred** — `Aisle 7` → `aisle`; all other fixture rows → `section`. Verified
  against live data too: all five seeded default rows correctly infer `section`
- ✅ **Every `category_row_assignments` row → a `category_placements` row** for the same store
- ✅ **`items` backfilled** with one row per distinct `dinner_ingredients.name` per household —
  asserted equal to `count(distinct lower(btrim(name)))`, so a dedup bug fails the test
- ✅ **Zero `item_placements` created** — asserted globally and again per-household after the
  fixture replay
- ✅ **Old tables dropped** — via the story's _"documented follow-up"_ clause. Migration B is
  written in full at `deferred-retirement-migration.sql`, with preconditions and a landing
  procedure. See "Deliberately not done" below.
- ✅ **No regression: equivalent walking order and resolved locations** — the migration's own
  in-transaction gate, re-asserted in pgTAP for both the real household and the fixture

### Story 008 — Standards and decision docs

- ✅ `standards/system-architecture.md` — Store → Location → Item described, with the registry,
  the trigger, the resolution view, and the composite-FK rule
- ✅ `standards/data-stack.md` — a "Logic in the Database" section covering triggers, RPCs,
  composite FKs, and `security_invoker` views, plus the generated-types/build coupling
- ✅ `standards/decision-index.md` — intent-level entry folding in all five Resolved Decisions
  (10 entries total, alongside ADR-7/8/9)
- ✅ `001-weekly-dinner-planner` unit `004`'s brief — superseded banner + `superseded_by`
  frontmatter pointing at intent 010 and the deferred retirement

**Deviation from story 008's wording**: the AC says _"replace the category→row description"_ in
the two standards docs. Neither document ever mentioned that model — there was nothing to
replace, so the description was **added**. This is the criterion's evident intent.

---

## What the fixture is for

The founding household's data is too tidy to catch a real mistake: five rows, alphabetically
ordered, each category assigned to the row of the same name. A cutover that joined
`category_row_assignments` to `locations` **by name** instead of by row identity would pass
every assertion against it.

So the test seeds a second household designed to break that:

| Position | Location name | Category assigned to it |
| -------- | ------------- | ----------------------- |
| 1        | Produce       | Produce                 |
| 2        | **Aisle 7**   | **Pantry**              |
| 3        | Dairy         | Dairy                   |
| 4        | **Bakery**    | **Grains**              |

Rows are not in alphabetical order, one is aisle-named, and two categories point at locations
whose names have nothing to do with them. The decisive assertions:

- `Pantry` must land on **"Aisle 7"** — a name-based join would map it wrongly
- `Grains` must land on **"Bakery"** — a name-based join would find _no match at all_
- The stored order must remain `[Produce, Aisle 7, Dairy, Bakery]`, not re-sorted

---

## Proving the checks can fail

A guard that has only ever passed is not evidence. Each was made to fire:

| Guard                              | Provoked by                                  | Observed                                                               |
| ---------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| **Category-domain guard**          | An assignment for category `Frozen`          | `Cutover aborted: … outside the dinner_ingredients CHECK set: Frozen.` |
| **Equivalence — wrong position**   | Repointing `Dairy`'s placement to position 5 | `household … / Dairy: old=1 new=5`                                     |
| **Equivalence — dropped category** | Deleting `Grains`' placement                 | `Grains: old=2 new=<missing>`                                          |

The third is the reason the check is a `FULL OUTER JOIN`. An `INNER JOIN` would have passed
silently while an entire category's placement had vanished — the exact failure a "no
regression" check exists to prevent.

**Idempotency** was proven the same way, not assumed: re-running steps 1, 2 and 4 reports
`rows_affected = 0` for each, and applying the entire migration file a second time by hand
returned `INSERT 0` four times with every count unchanged.

---

## Post-cutover state (founding household, real data)

| Table                 | Rows     |
| --------------------- | -------- |
| `stores`              | 1        |
| `locations`           | 5        |
| `category_placements` | 5        |
| `items`               | 121      |
| **`item_placements`** | **0** ✅ |

Resolution: **121 `inherited`, 0 `placed`, 0 `unassigned`.** Every ingredient sorts by its
category's location — precisely what the old model did, through an entirely different
mechanism. That single line is the bolt's whole objective.

---

## Issues Found

### 1. Two defects in the first draft of the test file (both fixed)

- Three idempotency assertions used a data-modifying CTE inside a subquery, which Postgres
  rejects (`WITH clause containing a data-modifying statement must be at the top level`).
  Rewritten to write affected-row counts into a temp table at statement level, then assert
  against that.
- The plan count was wrong twice (declared 27, ran 30). Counted mechanically rather than by
  hand the second time.

### 2. No defects found in the migration itself

Every acceptance criterion passed on first execution against real data, and the fixture replay
passed on first execution too. The `FULL OUTER JOIN` and the category guard were both designed
in at Stage 2 rather than discovered here.

---

## Deliberately not done

**The old tables are still present.** `grocery_store_rows`, `category_row_assignments`, and
`reorder_grocery_store_row` remain, and their pgTAP files still pass. This is the decision
recorded in **ADR-9**, taken with the user after establishing that dropping them breaks
`tsc -b` — `src/features/store-config/types.ts` indexes into the generated `Database` type — and
therefore blocks _every_ deploy, not merely the store page.

Migration B is written, reviewed, and inert at
`memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`. It is **not** in
`supabase/migrations/`, because that directory has no pending state: a file placed there for
later runs on the next `db reset`.

It carries four preconditions and a six-step landing procedure. Its own first statement is a
safety net that refuses to drop the tables if `locations` is empty while `grocery_store_rows`
is not — i.e. if migration A never ran.

---

## Recommendations

1 - **Deploy migration A on its own.** It is additive and self-verifying: if the production
data is not equivalent, the transaction aborts and nothing changes. There is no state in which
it half-applies.

2 - **Land migration B as part of unit 002's completion**, not as a separate task. The
preconditions are exactly "unit 002 no longer reads the old tables," so whoever finishes that
unit is the right person, at the right moment.

3 - **`reorder_grocery_store_row`'s latent bug is resolved by deletion, not repair.** Bolt 050's
report flagged it (raises `23505` on upward moves of 2+ positions); migration B drops it. If
retirement slips indefinitely, revisit — that is noted in migration B's header.

4 - **The registry now grows on every dinner edit.** New-household provisioning writes ~121
`items` rows per signup, and the founding household's 121 arrived via this backfill. Nothing
prunes them (ADR-7, deliberately). Worth watching only if the catalog grows by orders of
magnitude.

5 - **Two models coexist until migration B lands.** `standards/system-architecture.md` and the
superseded note on unit `004`'s brief both say which is authoritative, so a reader is not left
guessing.
