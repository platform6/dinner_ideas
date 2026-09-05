---
stage: design
bolt: 055-placement-review-state
created: '2026-09-05T18:10:00Z'
---

## Technical Design: 001-placement-review-state

### Architecture Pattern

**Narrow write RPC over a trigger-owned table**, plus one additive column and a view projection.

The Item table is deliberately not application-writable (ADR-7). Rather than open it and then
constrain what was opened, this design keeps `items` closed to application DML entirely and adds
a single `security definer` function that writes exactly one column.

**Decision D-1 — `security definer` RPC, not a column-scoped grant.**

Both candidates named in the unit brief satisfy INV-1 on the day they ship:

1 - **Column grant**: `grant update (reviewed_at) on public.items to authenticated` plus a
household-scoped RLS `UPDATE` policy. An update touching `name` is refused at the column
privilege layer.
2 - **RPC**: `public.mark_item_reviewed(p_item_id uuid)`, `security definer`, whose body sets
`reviewed_at` and nothing else.

Chosen: **the RPC**. Two reasons, in order of weight:

- **The invariant becomes positive rather than negative.** Under the grant approach, INV-1 holds
  because a privilege is _absent_. Absence is fragile: a later `grant all on public.items`, a
  Supabase default-privileges change, or a well-meaning migration re-granting the table would
  silently dissolve it, and nothing would fail loudly. Under the RPC, `items` stays with no
  application write privilege at all, and the only writer names the one column in its body. The
  protection is a thing that exists, not a thing that was withheld.
- **It is what this schema already does for constrained writes.** `reorder_location`,
  `set_ai_model_override`, `set_ai_daily_call_limit`, `set_household_ai_key`,
  `clear_household_ai_key` are all narrow `security definer` RPCs. A column grant here would be
  the odd one out, and consistency is worth more than the handful of lines it saves.

Cost accepted: one more function to maintain, and the client calls `.rpc()` rather than
`.update()`. Both are trivial next to the invariant.

**This decision is ADR-worthy** — see Stage 3.

### Layer Structure

```text
┌─────────────────────────────┐
│      Presentation           │  units 002 / 003 — OUT OF SCOPE HERE
├─────────────────────────────┤
│      Application            │  markItemReviewed() thin client wrapper
├─────────────────────────────┤
│        Domain               │  ReviewMarking service = the RPC body
├─────────────────────────────┤
│     Infrastructure          │  items.reviewed_at, view projection, grants
└─────────────────────────────┘
```

| Layer          | Responsibility in this bolt                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Presentation   | None. Units 002 and 003 own every caller                                                                          |
| Application    | One exported client function so consumers have something to call, matching the unit brief's "Interfaces Provided" |
| Domain         | The RPC body: authorize, set, return. No branching beyond the household check                                     |
| Infrastructure | Column, backfill, view projection, execute grant                                                                  |

### API Design

- **`public.mark_item_reviewed(p_item_id uuid) -> void`**
  - Language `plpgsql`, `security definer`, `set search_path = ''` (matching
    `fn_dinner_ingredients_sync_item` and `reorder_location`)
  - Behaviour: resolve the caller's household; update `public.items set reviewed_at = now()`
    where `id = p_item_id` **and** `household_id` matches the caller's. Return void.
  - **Cross-household call**: affects zero rows. Returns normally rather than raising — the
    caller learns nothing about whether that id exists in another household. Absence of an error
    is not a claim that the row was updated.
  - **Already-reviewed**: sets the timestamp again. Inert by INV-3. No `where reviewed_at is
null` guard — re-marking is legal and the extra predicate would only invite a caller to
    believe the call means something it does not.
  - **Missing id**: zero rows, no error. Same reasoning.
  - `grant execute` to `authenticated` only.

- **Client**: `markItemReviewed(itemId: string): Promise<void>` — a thin `.rpc()` wrapper. No
  optimistic state, no cache invalidation; the consuming feature owns its own refetch.

### Data Model

- **`public.items`** — Columns: existing + `reviewed_at timestamptz null`
  - Comment stating null means _unreviewed_, and explicitly that it does **not** mean unplaced
  - No default. Null on insert is exactly INV-2, so the sync trigger needs no change
  - No index yet. The queue read is `where reviewed_at is null and household_id = ...` over a
    registry of ~121 rows behind an existing `household_id` index. A partial index is premature;
    revisit past roughly 5,000 Items per household. Recorded so the omission is a decision

- **`public.item_location_resolution`** — `create or replace view`, adding `i.reviewed_at` to the
  select list. Resolution logic untouched.
  - Rationale: unit 002's queue and its all-groceries list read the same rows; a second query
    keyed by item id would have to be joined client-side for no benefit
  - `create or replace view` permits **appending** a column. It cannot reorder or drop, and this
    change does neither

- **Backfill** — a single statement in the same migration:
  `update public.items set reviewed_at = now() where reviewed_at is null;`

  **Correction to the inception-stage specification.** Story 001's third acceptance criterion
  requires that an Item inserted by the trigger _during the migration window_ is not marked
  reviewed, and the unit brief prescribes bounding the update to a snapshot of pre-existing ids.
  Working the concurrency through, that bound does not do what I claimed at inception:

  - The statement sees only rows committed before its own snapshot. An insert committing
    **after** it is invisible and stays null — the desired behaviour, and it comes free from
    READ COMMITTED, not from any bound.
  - An insert committing **before** the statement is, by every means available in the database,
    indistinguishable from a row that predates the migration. A snapshot of ids taken moments
    earlier does not classify it better; it only moves the same window earlier in time.

  So the bound adds ceremony without narrowing the race. What remains is a genuinely small
  residual: an ingredient saved during the seconds a migration is applying may have its Item
  marked reviewed and skip the queue once. Cost of that: one grocery never asked about.

  `where reviewed_at is null` earns its place for a different reason — it makes the statement
  idempotent, so `supabase db reset` and any re-application are no-ops rather than re-stamping
  every row with a new timestamp.

  **Story 001's third AC should be amended** to describe the real guarantee: rows committed
  after the backfill statement remain unreviewed. Flagged at the Stage 2 checkpoint rather than
  quietly shipped against an AC this design does not meet as written.

### Security Design

- **Household isolation**: enforced inside the RPC via the household lookup, not by RLS — the
  function is `security definer` and therefore bypasses RLS by construction. The check is the
  function's own responsibility and must be in its body, not assumed from the table.
- **INV-1 (`name` unwritable)**: `items` gains **no** application `UPDATE`/`INSERT`/`DELETE`
  privilege. The RPC body names `reviewed_at`; nothing else can be reached through it.
- **`set search_path = ''`**: prevents search-path capture in a `security definer` function.
  Every object it references is schema-qualified. This matches the existing convention and is
  what the intent 008 advisor hardening established.
- **Execute grant**: `authenticated` only. Not `anon`.
- **Verification, not assumption**: Stage 4 must confirm that `authenticated` does not already
  hold a blanket `UPDATE` on `items` from a Supabase default-privileges grant. If it does, the
  RPC is still correct but INV-1 would not actually hold, and that is a finding to raise —
  exactly the kind of silent-absence failure D-1 was chosen to avoid.

### NFR Implementation

| Requirement          | Design Approach                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mark round-trip      | Single-row update by primary key inside one function call. No read-modify-write                                                                              |
| Idempotency          | No guard in the RPC; re-marking is defined as legal, so callers never branch                                                                                 |
| Queue read           | Served by the existing resolution view with one extra projected column — no new query, no new round trip                                                     |
| Backfill correctness | Idempotent via `where reviewed_at is null`; residual race documented above rather than papered over                                                          |
| Migration safety     | Purely additive. No destructive DDL. `grocery_store_rows` / `category_row_assignments` untouched — ADR-9 retirement stays gated on intent 010's Checkpoint 4 |
| Concurrency          | Two members marking the same Item: last write wins, both succeed, no constraint involved                                                                     |

### Integrations

| Integration                        | Notes                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trg_dinner_ingredients_sync_item` | **Unchanged.** New rows arrive with `reviewed_at` null because there is no default. Touching the trigger would risk ADR-7's invariant for no gain |
| Unit 002 queue                     | Reads `reviewed_at` off the resolution view; calls `markItemReviewed` on accept and on move                                                       |
| Unit 003 shopping-list move        | Same client function; no additional surface                                                                                                       |
| Intent 010 record corrections      | Story 003. Documentation only, no code coupling                                                                                                   |

### Resolution of Stage 1's Domain Questions

1. **Does renaming an ingredient mint a new Item?** By identity-as-NameKey, yes — a rename
   registers a new Item and leaves the old one to become an orphan once nothing references its
   name. **This behaviour already exists in production**; it shipped with intent 010's trigger.
   This bolt does not cause it — it makes it _visible_, because the new Item now surfaces in a
   queue. **Not fixed here.** Fixing it means deciding what happens to orphans, which intent 013
   already records as an out-of-scope open question. Stage 4 confirms the trigger behaviour and
   the finding is carried to that question rather than absorbed into this bolt.
2. **Per-Item or per-Store review?** Per-Item, as modelled. Correct while a household has one
   active Store, which the schema enforces today via `stores_one_active_per_household`. If
   multiple Stores ever ship, `reviewed_at` would need a store dimension. Accepted and recorded.
3. **View projection or separate read?** **View projection.** Appending `reviewed_at` to
   `item_location_resolution` costs one column on a query unit 002 already runs.

### Completion Criteria

- [x] Architecture pattern selected and documented, with the rejected alternative and why
- [x] All layers designed with responsibilities
- [x] API contract defined, including behaviour on cross-household, missing and repeat calls
- [x] Database schema designed — column, projection, backfill, and the index deliberately omitted
- [x] NFRs addressed
- [x] Security patterns applied, with one item flagged for verification rather than assumed
- [x] All three Stage 1 domain questions resolved or explicitly deferred with a reason
