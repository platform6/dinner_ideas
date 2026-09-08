# Roadmap / task inbox

Status as of 2026-09-07. Intents live in `memory-bank/intents/`.

Both roadmap items below are now **planned intents** with full inception artifacts. This file is
the inbox; the intents are the source of truth.

- **Add a household-level setting for the number of dinners you pick (with a settings page).**
  → **Now `015-dinners-per-week`.** Inception complete: 6 FRs, 2 units, 7 stories, bolts 063–065.

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
  → **Now `016-feeling-lucky`.** Inception complete: 5 FRs, 1 unit, 3 stories, bolt 066.
  **Blocked on 015** — it cannot fill to a number that does not exist yet.

  Scoped during inception: it fills empty slots rather than replacing picks (non-destructive, and
  intent 009's Clear Picks already covers a full re-roll), excludes suppressed dinners, and weights
  the draw away from recently-eaten ones using the existing `dinner_last_chosen` view.

---

## Not yet an intent

Nothing currently. Add new ideas here as bullets; they become intents via
`/specsmd-inception-agent`.

## Also outstanding (not roadmap items)

- **`004-account-model`** deployment status reads `production-live-fe-smoke-pending` — a frontend
  smoke check was never closed out. The oldest loose thread in the memory bank.
- **Intent 013's unit 003** (`bolt 058-shopping-list-move`) is built and committed but has not
  shipped in any release; v0.11.0 carried units 001–002 only.
- **Bolt 058's scroll-preservation check** — verified in logic only, because jsdom has no layout
  engine and the row offsets in its test are simulated. Needs a human on a real device; recorded
  in that bolt's test report.
- **`014-recipe-entry`** — inception complete (10 FRs, 2 units, 14 stories, bolts 059–062), not
  started. It is the catalog's first application write path.
