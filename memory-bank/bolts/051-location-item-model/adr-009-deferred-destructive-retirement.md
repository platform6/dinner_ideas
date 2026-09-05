---
bolt: 051-location-item-model
created: 2026-09-04T20:55:53Z
status: accepted
superseded_by: null
---

# ADR-9: Split a Cutover Into an Additive Migration and a Deferred Destructive One

## Context

Intent 010 replaces `grocery_store_rows` + `category_row_assignments` with the
Store→Location→Item model. Bolt 050 built the new tables; bolt 051 carries the existing
configuration across. Story 007's final criterion is that the old tables be _"dropped (same
migration or a documented follow-up)"_.

The obvious reading is: carry the data across and drop the old tables in one migration. The
new model is proven, the data is verified equivalent, the old tables have no remaining purpose.

The complication is that **the old tables are still load-bearing**. The live store-config page
reads them, and its replacement (units 002 and 003) has not been built yet — this intent's own
UI work comes after its data work, by design.

When this was raised, the user's initial position was reasonable and explicit: _"It is ok if
store page does not show between deployment as we are in active development."_ A temporarily
broken page is a normal cost of active development.

**That premise turned out to be wrong — not about the tolerance, but about the consequence.**
Checking before acting on it:

```ts
// src/features/store-config/types.ts
export type GroceryStoreRow = Database['public']['Tables']['grocery_store_rows']['Row'];
```

`database.types.ts` is generated from the live schema. Drop the table, regenerate, and that
index type has nothing to resolve to — a **compile error**, not a runtime one. `tsc -b` fails,
so `pnpm build` fails, so **no deploy can go out at all**, including deploys of entirely
unrelated work. The blast radius is not "the store page is blank for a few days"; it is "the
project cannot ship anything until a feature module that belongs to a different unit has been
rewritten."

Forces at play:

- **Generated types couple the frontend's compilability to the live schema.** This is normally
  a feature — it is how a schema change surfaces as a type error instead of a runtime crash.
  During a destructive migration it inverts into a deployment blocker.
- **`supabase/migrations/` is not a staging area.** Everything in it is applied by
  `supabase db reset` and by every deploy. A migration file's mere existence is its execution.
- **Dropping a table is the one genuinely irreversible act** in this project's migration
  history. Everything else — policies, functions, columns, even the founding-household
  cutover (ADR-3) — can be reconstructed from the migration files. Dropped rows cannot.
- **The data-then-UI ordering is deliberate** and correct; it just means there is always a
  window where the old readers outlive the old model's necessity.

## Decision

**Split the cutover in two.**

**Migration A** (`20260904190000_location_item_model_cutover.sql`, this bolt): purely additive.
Seed stores, carry the path across, carry category placements across, backfill the registry,
and verify equivalence against the still-present old model — aborting the transaction if the
resolved order differs. Deployable immediately and safely, because it changes nothing any
running code reads.

**Migration B** (retirement): written in full by this bolt, but stored at
`memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql` — **deliberately
not** in `supabase/migrations/`, where its existence alone would execute it. Its header states
the preconditions. Landing it is an explicit act by whoever finishes unit 002: move the file
into `supabase/migrations/` with a current timestamp, regenerate types, delete the old feature
code and its pgTAP files.

The general rule, for the next cutover:

> A cutover that removes a load-bearing table is two migrations, not one. The additive half
> ships as soon as it is verified. The destructive half is written at the same time, kept
> outside `supabase/migrations/`, and gated on its last reader being gone.

And the check that produced this decision:

> Before dropping a table, ask what stops _compiling_, not just what stops _working_.

## Rationale

### Why not simply accept the breakage

Because the accepted breakage and the actual breakage were different things. The user accepted
a degraded page; the real cost was a total deploy freeze on an unrelated axis. Accepting a cost
requires knowing what it is, which is why this was worth checking rather than acting on the
stated tolerance.

### Why migration B is written now rather than later

A "documented follow-up" that is only a sentence in a design doc is a TODO, and TODOs about
dropping production tables age badly — the person who lands unit 002 will not have this bolt's
context. Writing the actual SQL now, with its preconditions in the header, means the follow-up
is a file to move rather than a decision to re-derive. The reasoning is captured while it is
fresh, by the person who verified the equivalence.

### Why it must live outside `supabase/migrations/`

This is the detail most likely to be got wrong by someone applying this pattern later. There is
no "pending" or "disabled" state for a Supabase migration — the directory is the queue. A
migration written "for later" and placed there is a migration that runs on the next
`db reset`, silently, in whatever environment resets first. The memory-bank is the natural
holding area: version-controlled, adjacent to the reasoning, inert.

### Alternatives Considered

| Alternative                                                   | Pros                                                         | Cons                                                                                                                            | Why Rejected                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **One migration, drop included**                              | Simplest; story 007's primary reading; no follow-up to track | Breaks `tsc -b` → blocks every deploy until unit 002's teardown lands; the equivalence baseline is destroyed in the same breath | The cost is a deploy freeze on unrelated work, not a degraded page                                         |
| **Drop, and remove the old feature code in this bolt**        | Build stays green; nothing left dangling                     | Pulls unit 002's teardown into a data-layer bolt; leaves the app with no store-config UI at all until 002 ships                 | Scope theft — and it makes a data bolt's completion depend on UI work                                      |
| **Drop, leave the build broken**                              | Fastest to write                                             | `dev` cannot build or deploy at all                                                                                             | Blocks unrelated work for the duration; no upside over deferring                                           |
| **Write migration B into `supabase/migrations/` "for later"** | Follow-up impossible to lose                                 | It is not "for later" — it runs on the next `db reset` or deploy                                                                | Defeats the entire decision; the directory has no pending state                                            |
| **Keep the old tables forever, unread**                       | Zero risk                                                    | Two models in the schema indefinitely; every future reader must ask which is authoritative                                      | Defers the decision rather than making it; the retirement is real work that should stay queued and visible |

## Consequences

### Positive

- Migration A deploys immediately, so the cutover's real risk — data equivalence — is retired
  early, against production data, while the old model still exists to check against.
- The equivalence check is _possible at all_. Had the drop been in the same migration, the
  baseline would be destroyed in the same transaction that needed it.
- `dev` keeps building and deploying throughout; unrelated work is unblocked.
- The retirement is written, reviewed, and queued rather than remembered.
- Rollback of migration A is deleting the rows it created — there is no irreversible step in
  the deployable half.

### Negative

- Two models coexist in the schema for a while, and a reader has to know which is
  authoritative. Mitigated by migration A's header and story 008's standards update.
- A follow-up exists that a future person must act on. Mitigated by writing the SQL rather than
  a note, but not eliminated.
- Story 007 is completed via its secondary path ("documented follow-up") rather than its
  primary one, so "the old tables are dropped" is not literally true when the bolt closes.

### Risks

- **The follow-up is forgotten and the old tables live indefinitely.** _Mitigation_: the file
  exists with preconditions in its header; story 008's standards update names it; and unit 002
  cannot ship a working store-config page without confronting it.
- **Someone moves migration B into `supabase/migrations/` before its preconditions hold**,
  reproducing exactly the failure this ADR avoids. _Mitigation_: the preconditions are the
  first thing in the file, stated as a checklist.
- **Migration A's verification passes vacuously** for a household with no category
  assignments. _Mitigation_: pgTAP covers a seeded fixture with a known non-trivial ordering,
  which the production check cannot guarantee to exercise.

## Related

- **Stories**: `007-cutover-migration` (the "documented follow-up" clause this ADR exercises),
  `008-standards-and-decision-docs`
- **Standards**: candidate line for `system-architecture.md` — _"a cutover that removes a
  load-bearing table is two migrations; the destructive half waits outside
  `supabase/migrations/` until its last reader is gone."_
- **Previous ADRs**: **ADR-3** (the previous one-time cutover — purely additive, so it never
  faced retirement; this ADR covers the half ADR-3 did not need), **ADR-7** / **ADR-8** (bolt
  050's model, which migration A fills), **ADR-1** (invariants live in Postgres — which is why
  the equivalence check is an in-migration `raise`, not an application-level assertion)
