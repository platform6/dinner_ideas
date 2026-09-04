---
bolt: 050-location-item-model
created: 2026-09-04T17:32:00Z
status: accepted
superseded_by: null
---

# ADR-7: An Items Registry Derived From Free-Text Ingredients, Deduped Exactly, Synced by Trigger

## Context

Intent 010 lets a user place an **individual ingredient** at a Location on their store's
walking path. Placing "black beans" once must then sort black beans correctly on every future
shopping list that contains them.

That requires something this app does not have: a **stable identity for an ingredient across
dinners**. Today `dinner_ingredients` is free text — `(dinner_id, name, quantity, unit,
category)` — with no dedup and no identity. "Black Beans" in one dinner and "black beans" in
another are unrelated rows. There is nothing for a placement to point at.

`storeconfig.md`, the source spec, assumes an `items` catalog already exists ("existing catalog
row"). It doesn't. This intent builds it.

Forces at play:

- **No application server.** Anything that must hold regardless of caller has to live in
  Postgres (ADR-1).
- **A future recipe-import intent is coming** — URL- and Claude-assisted ingredient extraction
  — that will write `dinner_ingredients` through code paths that do not exist yet and that
  this intent cannot see. Whatever keeps the registry in sync must already cover them.
- **Import text is messier than hand-typed text.** An LLM extracting from a recipe page yields
  "black beans, drained" where a person types "black beans".
- **A separate similarity engine already exists in the plan** (FR-7, unit 002): a client-side
  fuzzy match that suggests "place this like that one," always one tap to accept, never
  automatic.
- **`dinner_ingredients` must not change.** It is upstream of this context and owned by the
  dinner catalog.

Three questions had to be answered together, because each constrains the others: _should a
registry exist at all_, _what makes two names the same Item_, and _what keeps it in sync_.

## Decision

**1 — A derived registry entity.** Add `items (id, household_id, name, name_key, created_at)`,
household-scoped, as this context's own model of the upstream ingredient text. Placements
reference `items.id`. `dinner_ingredients` is read, never written, never altered.

**2 — Dedup by exact normalized name.** `name_key` is a stored generated column,
`lower(btrim(name))`, with `unique (household_id, name_key)`. Two names that differ only in
case or surrounding whitespace **are** the same Item. Anything else is a different Item.

**3 — Sync by database trigger, not application code.**

```sql
create trigger trg_dinner_ingredients_sync_item
after insert or update of name on public.dinner_ingredients
for each row execute function public.fn_dinner_ingredients_sync_item();
```

The `security definer` function resolves `household_id` via `dinner_id → dinners.household_id`
and performs `insert into items … on conflict (household_id, name_key) do nothing`. No
application code path calls anything for an Item to exist.

The registry and the similarity engine are **deliberately separate layers**: the registry
dedups exactly and structurally; the similarity engine suggests fuzzily and never merges a
registry row.

## Rationale

### Why a registry rather than joining on ingredient text

A placement keyed on `lower(trim(name))` text would work, briefly. It has no referential
integrity (nothing stops a placement for a name no dinner uses), no cascade story, and it
spreads the normalization rule across every query that touches it — so the day the rule
changes, placements silently detach. An entity with a real primary key makes the FK, the
cascade, and the uniqueness the database's problem rather than every future query's.

### Why exact dedup, given that a fuzzy matcher exists anyway

This is the decision most likely to be revisited, so the reasoning matters most here.

Fuzzy matching at the **registry** level and fuzzy matching at the **suggestion** level are
different risks pointing in opposite directions. A wrong suggestion costs one dismiss tap. A
wrong registry merge is **silent, structural, and hard to undo** — two genuinely different
ingredients collapse into one Item, and every placement, every shopping list, and every future
dinner inherits the error with no visible symptom.

Exact matching also has properties fuzzy matching cannot have:

- **Deterministic** — the same text always produces the same key, so `on conflict` is a real
  constraint rather than a heuristic.
- **Expressible as a constraint** — a fuzzy key cannot be a unique index, so the invariant
  would move into application code, which is exactly where this codebase can't enforce things.
- **Source-agnostic** — manual entry and a future import converge on the same key with no
  per-source tuning.

The cost is bounded and self-healing: a messier import name creates **one extra Item**, which
the similarity engine then offers to place identically in one tap. An extra row a user can fix
with one tap is not a data-integrity problem. A silent merge is.

### Why a trigger rather than application code

ADR-2 already established the principle for this codebase: a derived write that must happen
whenever something occurs belongs **on the occurrence**, not inside whichever function happens
to be today's caller. That ADR concerned a state transition on `weekly_plans`.

Here the argument is stronger, because **the motivating caller does not exist yet**. Putting
`getOrCreate` in the dinner-save path would make registry sync a rule that today's code
happens to follow. The recipe-import intent would then have to know it exists, and would break
the registry by simply not knowing. On the write itself, it is a property of the data: an Item
exists because an ingredient name was written, full stop.

The trigger is `AFTER`, not `BEFORE` — an Item is a consequence of a committed ingredient row,
never a precondition. Registry sync failing must never block a user from saving a dinner.

### Alternatives Considered

| Alternative                                                         | Pros                                                       | Cons                                                                                                         | Why Rejected                                                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **No registry** — placements keyed on normalized ingredient text    | Zero new tables; no sync problem at all                    | No FK, no cascade, normalization rule duplicated in every query; placements silently detach on a rule change | Trades a one-table cost for a permanent correctness tax on every downstream query                                  |
| **Registry, but synced from application code** (`getOrCreate` call) | Explicit and greppable; no `security definer` function     | A rule today's callers happen to follow; the known-future import path breaks it by omission                  | Contradicts ADR-1/ADR-2 and fails the one requirement stated up front — that a future writer needs no changes here |
| **Fuzzy dedup key** (trigram / the FR-7 normalization)              | Fewer near-duplicate rows from messy import text           | Not expressible as a unique constraint; silent irreversible merges; needs `pg_trgm`; per-source tuning       | A wrong merge is invisible and structural; a wrong suggestion costs one tap. Wrong risk to take structurally       |
| **`BEFORE` trigger**                                                | Item guaranteed to exist before the ingredient row commits | Registry failure blocks saving a dinner                                                                      | Inverts the dependency — the ingredient is the fact; the Item is the consequence                                   |
| **Expression index instead of a generated column**                  | One less stored column                                     | Not visible in `\d items`; awkward as an `on conflict` target; normalization rule stays implicit             | The key **is** the identity, so it should be a visible column, not a hidden index expression                       |

## Consequences

### Positive

- The recipe-import intent needs **zero changes** in this area — the acceptance criterion that
  drove the design.
- Placement gains real referential integrity: FKs, cascades, and uniqueness enforced by the
  database.
- The dedup rule lives in exactly one place, visible in `\d items`.
- Concurrency is free: two dinners adding the same new ingredient simultaneously produce
  exactly one Item via `on conflict do nothing` — no lock, no retry.
- Case and whitespace variants of a name unify with no user action.

### Negative

- **The registry only grows.** Renaming an ingredient leaves the old Item in place, possibly
  unreferenced. Pruning is deliberately out of scope — an orphaned Item may still carry a
  placement the user made, so deleting it would silently discard a user decision.
- Near-duplicates from messy text are real (`"black beans"` vs `"black beans, drained"`) and
  are resolved by a user tap, not automatically.
- One more `security definer` function to keep `search_path`-pinned.
- The registry is derived state that could, in principle, drift from `dinner_ingredients` if
  the trigger were ever dropped.

### Risks

- **Trigger silently dropped or not applied** → the registry stops growing with no error
  anywhere. _Mitigation_: pgTAP asserts the trigger exists and that an insert through the
  normal path produces an Item (Stage 5).
- **An ingredient row whose dinner has no household** → the function returns without inserting
  rather than raising, so it can never block a write. _Mitigation_: covered by test; the
  condition is unreachable given `dinners.household_id` is `NOT NULL` since intent 004.
- **`security definer` search-path injection** → `set search_path = public` on the function,
  matching every other definer function in this codebase.
- **Import text degrading registry quality over time** → accepted and bounded; the similarity
  engine (FR-7) plus dismissals (FR-8) are the designed remedy, not an afterthought.

## Related

- **Stories**: `002-items-registry-and-sync-trigger`, `003-item-and-category-placements`,
  `004-location-resolution-query`, `007-cutover-migration` (the one-time backfill, bolt 051)
- **Requirements**: FR-3; Resolved Decisions 1 and 2
- **Standards**: candidate for `system-architecture.md` — "a derived entity kept honest by a
  trigger" is now a second instance of the same pattern and is becoming this codebase's
  convention rather than a one-off
- **Previous ADRs**: **ADR-1** (invariants belong in Postgres — no server to hold them),
  **ADR-2** (derived writes belong on the occurrence, not in today's caller — this ADR
  generalizes it from a state transition to any write, including writes from callers that
  don't exist yet)
- **Superseded by this design**: nothing — `dinner_ingredients` is untouched
