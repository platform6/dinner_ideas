---
stage: model
bolt: 030-household-data-model
created: 2026-08-29T03:04:00Z
---

## Static Model: household-data-model (bolt 030 — finalize the intent)

Last bolt of unit `001-household-data-model`. No new schema. Two pieces of "close it out" work:

1. **Founding-household migration** (story 008): a one-time migration that folds all existing
   pre-intent data into a single household owned by `garrett.peter.conn@gmail.com`, then flips
   every direct `household_id` column to `not null` and promotes
   `category_row_assignments`'s interim unique to a real primary key.
2. **Standards-doc updates** (story 010): retire the "single shared login" language in
   `system-architecture.md`, `tech-stack.md`, `coding-standards.md`; add a `decision-index.md`
   entry.

### Domain concept: the Founding Household

- **FoundingHousehold**: the one `households` row that all data existing before intent 004
  belongs to. It is _not_ special in the schema — no flag, no distinguished type — just the first
  row, created with a fixed known UUID so a dev re-run is idempotent. Its owner is the identity
  behind today's shared login (`garrett.peter.conn@gmail.com`). After this migration it behaves
  exactly like any household created by `handle_new_user()`: same tables, same RLS, same seed
  shape (its catalog _is_ the shipped seed, already present — it is stamped, not re-seeded).

### Process model: the cutover

| Step | Action                                                                                        | Guard / invariant                                                   |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Resolve `auth.users` id for `garrett.peter.conn@gmail.com`                                    | **raise and abort** if absent — never guess an owner                |
| 2    | Create the founding `households` row (fixed UUID)                                             | skip whole migration if that row already exists (dev re-run safety) |
| 3    | Create the founding `profiles` row + `household_members` (`owner`)                            | `on conflict do nothing` (a prior partial run)                      |
| 4    | `update <t> set household_id = <founding> where household_id is null` for the 6 direct tables | child tables need nothing — they inherit via parent FK              |
| 5    | `alter column household_id set not null` on the 6 direct tables                               | step 4 guarantees zero nulls first                                  |
| 6    | Promote `category_row_assignments` unique `(household_id, category)` → primary key            | `household_id` is now `not null`, so a composite PK is legal        |

### Invariants after this bolt

- Exactly one `households` row exists (in production; dev may differ).
- The founding user is its `owner`.
- `select count(*) from <domain table> where household_id is null` → `0` for every table
  (child tables: assert their parent's `household_id` is non-null).
- Logging in as the founding user shows the **byte-for-byte same** catalog, current plan, locked
  history, and store layout as before the intent.
- New signups (`handle_new_user()`) are unaffected — they create their own households.

### Multi-user note

If several people ever used the shared login, only `garrett.peter.conn@gmail.com` becomes the
founding `owner`; any other `auth.users` rows are left without a membership and can be added by
hand later. Recorded as an assumption in `requirements.md`.

### Ubiquitous Language

- **Founding household / founding user / founding migration**: the one-time cutover of existing
  data.
- **Stamp** (vs. seed): the founding migration _stamps_ `household_id` onto rows that already
  exist; `seed_default_household_catalog()` _creates_ rows for a brand-new household. The founding
  migration never calls the seeder.
- **Cutover**: the moment `026 → 030` is pushed — the app goes from global to household-scoped in
  one deploy.

### Relevant Prior Decisions

- `ADR-1`: the whole intent's enforcement model.
- **New — `ADR-3`**: adopting a one-founding-household cutover run against live production data,
  with a hard-fail when the founding user is missing and a fixed-UUID idempotency guard. Recorded
  because it is a one-shot, irreversible-in-practice data operation whose "why" (no down-migration
  of real user data; do not guess an owner) future readers will need.
