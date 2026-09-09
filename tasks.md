# Roadmap / task inbox

Status as of 2026-09-08. Intents live in `memory-bank/intents/`.

Both roadmap items below are now **planned intents** with full inception artifacts. This file is
the inbox; the intents are the source of truth.

- **Add a household-level setting for the number of dinners you pick (with a settings page).**
  → **`015-dinners-per-week` — SHIPPED as v0.12.0, 2026-09-08** (PR #20). The column and both
  triggers, the owner-editable control on `/settings`, and the client sweep across seven files.
  pgTAP 370/370, vitest 331/331. **End-to-end verified on production 2026-09-08** — the setting changed and the catalog,
  plan and shopping list all followed. Nothing outstanding.

  The 2026-09-01 note called this "a small follow-up". Inception found otherwise: "3" is an
  invariant enforced by two Postgres triggers, one of which already carries a concurrency fix
  (`20260827002830`) after two writers could race past a `< 3` check and land a plan at four
  selections. Three pgTAP files assert it, and the lock function is literally named
  `fn_weekly_plans_require_three_on_lock`.

  The column and the `/settings` control _are_ small — `households.week_start_day` (intent 011) is
  a direct precedent, needing no new RLS. The trigger work is not, which is why bolt 063 is a DDD
  bolt and the client sweep is kept apart in bolt 065.

- **Add an "I'm feeling lucky" UI element to the dinner catalog which auto picks the number of
  dinners set in the settings page, selecting randomly from the catalog.**
  → **`016-feeling-lucky` — DELIVERED 2026-09-08 (v0.13.0)** (bolt 066). A "Surprise me" control fills the
  week's empty slots, weighted away from recently-eaten dinners via the existing
  `dinner_last_chosen` view. Non-destructive, so no confirm. vitest 353/353. Live on prod, smoke
  passed: the draw picks dinners not eaten recently without simply returning the oldest three, and
  pressing it twice gives different sets.

  Scoped during inception: it fills empty slots rather than replacing picks (non-destructive, and
  intent 009's Clear Picks already covers a full re-roll), excludes suppressed dinners, and weights
  the draw away from recently-eaten ones using the existing `dinner_last_chosen` view.

---

## Not yet an intent

Nothing currently. Add new ideas here as bullets; they become intents via
`/specsmd-inception-agent`.

## Also outstanding (not roadmap items)

- **`017-plan-rollover-remediation` unit 002** (`bolt 068`) — the catalog still advises retrying a
  failure that cannot be retried. `Should`, cuttable; that specific failure is now unreachable
  since v0.11.2, so its value is the next unforeseen constraint failure.

- **`004-account-model`** — the frontend smoke was **performed 2026-09-08** and passed on every
  screen; add-tag verified in production and cleaned up; zero console output on load. One item
  ("assign-category works again") could not be checked as written, because v0.11.0 replaced the
  page it referred to. **Still open**: the dashboard advisor re-run, which needs the product
  owner's Supabase account.
- ~~Intent 013's unit 003 unreleased~~ — **shipped as v0.11.1**, PR #18, 2026-09-08.
- ~~Bolt 058's scroll-preservation check~~ — **verified on production 2026-09-08.** Single-column
  at 500px: the moved row travelled 599px up the document and stayed on the same viewport pixel
  (0px drift); checked items preserved. At desktop width the check is not applicable — the
  two-column layout fits the whole list, so the page does not scroll.
- **`014-recipe-entry`** — **UNIT 001 BUILT 2026-09-08** (bolts 059, 060). **The catalog is
  writable for the first time in the project's life.** `/dinners/new` with the recipe draft and
  four editors, an "Add dinner" control on the catalog, and a save that writes `dinners` +
  `dinner_ingredients` + `dinner_steps` + `dinner_tags` in **one transaction** via
  `fn_create_dinner` (ADR-13). 450/450 vitest, 394/394 pgTAP. **Not yet deployed** — carries a
  migration. Bolts 061–062 (unit 002, Claude import) are still planned and remain cuttable: unit
  001 is a complete, useful page on its own.

  Carried forward, unresolved: `dinners.instructions` is required by the schema but rendered
  nowhere in the app (the form captures it, honestly labelled, and does not claim it appears on the
  catalog card — whether the card _should_ show it is an open question for intent 001); and the
  ingredient row's phone layout is unverified, because jsdom has no layout engine — worth an
  eyeball on a real device.

  Note for the deploy: **`database.types.ts` is ahead of production**, as in bolt 064. A routine
  `supabase gen types --linked` before the migration ships would revert it and break the build.
