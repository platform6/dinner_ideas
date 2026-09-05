---
stage: test
bolt: 055-placement-review-state
created: '2026-09-05T19:00:00Z'
---

## Test Report: 001-placement-review-state

### Summary

| Check              | Command                                  | Result                                       |
| ------------------ | ---------------------------------------- | -------------------------------------------- |
| pgTAP, as-is       | `npx supabase test db`                   | ✅ **358 / 358** (20 files) — was 339 / 339  |
| pgTAP, clean slate | `supabase db reset` + `supabase test db` | ✅ 23-migration chain applies; **358 / 358** |
| Unit + component   | `npx vitest run`                         | ✅ **290 / 290** (32 files)                  |
| Type check         | `npx tsc -b`                             | ✅ clean                                     |
| Lint               | `npx eslint src`                         | ✅ clean                                     |
| Production build   | `pnpm run build`                         | ✅ clean; PWA precache 7 entries             |

New pgTAP file: `supabase/tests/database/item_review_state_test.sql` — 19 assertions.

The clean-slate run is the meaningful one. It applies all 23 migrations from nothing, which
means the new column, the backfill and the RPC land in sequence behind intent 010's cutover and
its equivalence gate, and the whole suite still passes on the far side.

### What the 19 assertions cover

**Schema shape (story 001)**

1. `items.reviewed_at` exists
2. it is **nullable** — null _is_ the unreviewed state, so it must be storable
3. it has **no default** — a default would mark every trigger-created item reviewed on arrival
   and empty the review queue permanently (INV-2)
4. `mark_item_reviewed(uuid)` exists
5. it is `SECURITY DEFINER` — with no UPDATE privilege on `items` there is nothing a security
   invoker function could use
6. `item_location_resolution` projects `reviewed_at`

**The trigger path (story 001)**

7. an item registered by `trg_dinner_ingredients_sync_item` arrives with `reviewed_at` NULL —
   with **no trigger change**, which is the point
8. the trigger still registers the item at all (the column did not disturb ADR-7's path)

**The write path — ADR-10's invariant (story 002)**

9. application code **cannot** write `items.name` → `42501`
10. application code **cannot** write `items.reviewed_at` directly either → `42501`
11. a household member **can** mark their own item through the RPC
12. and it actually set the timestamp
13. re-marking an already-reviewed item is legal and inert (INV-3)
14. marking another household's item returns normally, leaking nothing about whether that id
    exists
15. and it did **not** touch that item (INV-4)
16. a nonexistent id affects zero rows and returns normally
17. `authenticated` may execute the RPC
18. `anon` may **not**

**The backfill (story 001)**

19. no pre-existing item was left unreviewed — no day-one queue of the whole registry

### The two assertions that matter most

**9 and 10.** They are the reason this bolt used an RPC rather than a column grant. If either
ever starts passing an update through, ADR-7's single-writer guarantee is gone and grocery
identity has two authors — the failure ADR-10 chose a function specifically to keep loud. Test
10 exists because the obvious version of this feature _would_ have made a direct
`reviewed_at` update work; asserting that it does not is asserting that the door is the only
door, not merely the convenient one.

**14 and 15 together.** `security definer` bypasses RLS by construction, so the household check
is the function's own responsibility — forgetting it would be a cross-household **write**, not a
refused one. A test that only asserted "no error" would pass against a function that happily
marked someone else's row. 15 is the one that would catch it: it checks the foreign item is
still unreviewed after the call. Silence is not permission.

### Manual verification against real data

Run before the clean-slate reset, against the local stack holding the seeded 121-item registry:

| Check                                 | Result                                              |
| ------------------------------------- | --------------------------------------------------- |
| Backfill on apply                     | 121 items, 121 reviewed, 0 unreviewed               |
| New ingredient → new item             | arrives unreviewed                                  |
| RPC as member                         | marks reviewed                                      |
| Direct `update items set name`        | `permission denied for table items`                 |
| Direct `update items set reviewed_at` | `permission denied for table items`                 |
| Cross-household RPC call              | returns normally; foreign item untouched            |
| Grants on `items` after migration     | `REFERENCES, SELECT, TRIGGER, TRUNCATE` — unchanged |
| Backfill after clean reset            | 121 / 121                                           |

### Findings

**1 — ADR-10's premise verified, and it was stronger than assumed.** The technical design flagged
that `authenticated` might already hold a blanket `UPDATE` on `items`, in which case ADR-7's
invariant would not actually hold today. It does not: `items` carries
`REFERENCES, SELECT, TRIGGER, TRUNCATE` and nothing else, because intent 010's migration line 469
explicitly revokes the writes. Compare `stores` / `locations` / `dinners`, which all carry full
write grants. The invariant is a maintained property, not an accident — and the RPC is genuinely
required rather than merely preferred, since with no privilege there is nothing for a policy to
filter.

**2 — A second defect in intent 010's FR-13, previously unrecorded.** Found while writing the
supersede note. Its default scope is _"Items used in at least one recipe"_ intersected with
_unassigned_. Those predicates are contradictory: an Item with no surviving `dinner_ingredients`
rows cannot also be referenced by an active dinner. That list could never have shown anything,
**independently** of the empty-population problem that prompted intent 013. Two separate bugs
were stacked in one feature. Recorded in intent 010's requirements.

**3 — `TRUNCATE` is granted to `authenticated` on every table in the project**, `households` and
`profiles` included. It is the Supabase default-privileges pattern, predates all of this work,
and PostgREST exposes no TRUNCATE verb, so it is not reachable through the API surface. **Not
acted on** — out of scope for this bolt and not introduced by it. Recorded so it is on file
rather than silently passed over.

**4 — The rename question is confirmed but deferred.** Item identity is `name_key`, so renaming
an ingredient registers a _new_ Item and leaves the old one to become an orphan. This behaviour
shipped with intent 010's trigger and is unchanged here; this bolt only makes it **visible**,
because the new Item now surfaces in a review queue. Not fixed — fixing it means deciding what
happens to orphans, which intent 013 already carries as an out-of-scope open question.

### Corrections made during this bolt

**Story 001's third acceptance criterion could not be met as written**, and was renegotiated at
the Stage 2 checkpoint rather than quietly shipped against. It required that an Item inserted
during the migration window not be marked reviewed, via a backfill bounded to a snapshot of
pre-existing ids. Working the concurrency through: the statement sees only rows committed before
its own snapshot, so a row committing _after_ it stays null for free under READ COMMITTED; a row
committing _before_ it is indistinguishable from a genuinely pre-existing row by any means the
database has. The bound relocates the window rather than narrowing it. The migration uses
`where reviewed_at is null`, which earns its place for idempotency instead. Residual, accepted
and documented in the migration: an ingredient saved during the seconds the migration applies
may be marked reviewed and skip the queue once.

**Two fixture issues in the new test file**, both mine: `dinners` requires `cuisine_type`,
`cook_time_minutes` and `instructions`, and the initial `plan(18)` undercounted 19 assertions.
Both fixed; noted because the second produced a `FAIL` result while every assertion passed,
which is worth recognising quickly rather than debugging as a logic error.

**Four existing test fixtures needed `reviewedAt`.** Defaulted to _reviewed_, because that is
what production looks like after the backfill — only newly registered items are null. A fixture
defaulting to unreviewed would describe a state those suites never meet. Small, but it is the
same trap story 006 (bolt 057) exists to prevent, arriving early.

### Stories

| Story                               | State                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- |
| 001-reviewed-at-column-and-backfill | ✅ complete — AC 3 amended, see Corrections                            |
| 002-review-write-path               | ✅ complete                                                            |
| 003-correct-010-record              | ✅ complete — FR-6 corrected, FR-13 superseded, deployment plan linked |

### Not covered by automated tests

- **The residual backfill race.** Reproducing a commit landing inside the migration's snapshot
  window is not something a pgTAP transaction can stage honestly. Documented in the migration
  instead.
- **PostgREST's view of the RPC.** The tests exercise the function through SQL as
  `authenticated`; they do not exercise the HTTP path. The client wrapper is one `.rpc()` call
  and is covered when units 002/003 use it.
