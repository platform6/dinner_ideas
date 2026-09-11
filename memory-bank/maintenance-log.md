# Maintenance Log

## 2026-08-29T00:00:00Z - Status Sync

**Triggered by**: analyze-context integrity check (`/specsmd-master-agent` activation)

**Context**: All 36 bolts, all 12 units, and all 6 intents are `status: complete`, and every story file carries `status: complete` / `implemented: true`. Only the global `story-index.md` roll-up was stale — the 15 stories under intents `004-account-model` and `006-dino-branding` were still shown as `✅ GENERATED` and the summary counters were never re-stamped after those bolts landed.

| Artifact                                       | Old Status                  | New Status                 | Reason                                                                                                                                                                               |
| ---------------------------------------------- | --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| memory-bank/story-index.md (Overview counts)   | Completed 58 / Generated 15 | Completed 73 / Generated 0 | Every story file is `status: complete`; all 36 bolts, 12 units, 6 intents complete                                                                                                   |
| memory-bank/story-index.md (Stories by Status) | Completed 58 / Generated 15 | Completed 73 / Generated 0 | Same                                                                                                                                                                                 |
| memory-bank/story-index.md (15 story lines)    | `✅ GENERATED`              | `✅ COMPLETE`              | 12 under intent `004-account-model` (10 in unit `001-household-data-model`, 2 in `002-account-model-ui`), 3 under `006-dino-branding` — all backed by `status: complete` story files |

---

## 2026-08-28T16:00:00Z - Status Sync

**Triggered by**: analyze-context integrity check (`/specsmd-master-agent` activation)

**Context**: All 21 bolts and all 39 stories across both intents are complete, but four roll-up artifacts were never re-stamped after the last post-completion bolts (`009`, `020`, `021`) landed.

| Artifact                                                              | Old Status                                     | New Status                                   | Reason                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| memory-bank/story-index.md (summary + status counts)                  | Completed 33 / Planned 6                       | Completed 39 / Planned 0                     | Every story file is `status: complete`; all 21 bolts complete                             |
| memory-bank/story-index.md (`004-generic-tags-schema` line)           | `[ ]` PLANNED                                  | `[x]` COMPLETE                               | Story file `status: complete`, `implemented: true`; bolt `009-dinner-catalog` complete    |
| .../001-dinner-catalog/construction-log.md (bolt `009` row + summary) | `009` in-progress; completed 2 / in progress 1 | `009` completed; completed 3 / in progress 0 | `bolts/009-dinner-catalog/bolt.md` is `status: complete` (completed 2026-08-27T18:38:12Z) |
| intents/002-kitchen-table-theme/units.md                              | units-decomposed                               | complete                                     | Sole unit `001-kitchen-table-ui` + all 6 bolts (`014`–`019`) complete                     |
| intents/002-kitchen-table-theme/inception-log.md                      | in-progress; completed null                    | complete; completed 2026-08-27T23:15:48Z     | Same — intent fully built                                                                 |

---

## 2026-08-27T06:00:00Z - Status Sync + Root-Cause Fix

**Triggered by**: `bolt-complete.cjs` cascade after completing bolt `010-weekly-planning` (same false-positive as the 2026-08-27T05:00:00Z entry below, recurring)

| Artifact                                          | Old Status | New Status   | Reason                                                                                |
| ------------------------------------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------- |
| intents/001-weekly-dinner-planner/requirements.md | complete   | construction | Units 003 and 004 still have pending bolts (013, 011) — same false positive as before |

**Root cause fixed this time**, not just patched: `bolt-complete.cjs`'s `updateIntentStatus` and `status-integrity.cjs`'s `checkIntentStatus` both trusted `unit-brief.status === 'complete'` alone, but this project deliberately keeps that field `complete` across a reopened unit's newer, still-pending bolts (see `001-dinner-catalog`'s unit-brief Notes for the established precedent). Both functions now cross-reference each unit's actual bolt statuses — a unit only counts as complete when its unit-brief says so **and** all of its own bolts are `complete`. Verified via a fresh `status-integrity.cjs` run: the intent-level false positive is gone; only the separate, already-known unit-level heuristic gaps remain (which reflect the same convention question, not a bug, and are left as informational).

---

## 2026-08-27T05:00:00Z - Status Sync

**Triggered by**: `bolt-complete.cjs` cascade after completing bolt `012-weekly-dinner-planner-ui`

**Context**: Fixed a CRLF-line-ending bug in `bolt-complete.cjs`/`status-integrity.cjs`/`artifact-validator.cjs`'s frontmatter regex earlier in this session (it silently failed to parse CRLF files, e.g. `requirements.md`, `units/*/unit-brief.md`). With the fix, the intent-status cascade could run for the first time and set `requirements.md` to `complete` because every unit-brief currently says `status: complete` — but that check doesn't account for units that still have planned-but-not-started bolts (`010-weekly-planning`, `011-grocery-store-config`, `013-weekly-dinner-planner-ui` are all still pending). Corrected back manually.

| Artifact                                          | Old Status | New Status   | Reason                                                                                                                                  |
| ------------------------------------------------- | ---------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| intents/001-weekly-dinner-planner/requirements.md | complete   | construction | 3 bolts (010, 011, 013) are still planned, not built — "complete" was a false positive from the script's naive all-units-complete check |

---

## 2026-08-27T00:00:00Z - Status Sync

**Triggered by**: analyze-context integrity check

| Artifact                                   | Old Status                   | New Status                   | Reason                                                                                            |
| ------------------------------------------ | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| intents/001-weekly-dinner-planner/units.md | units-decomposed             | complete                     | All 3 units are complete                                                                          |
| memory-bank/story-index.md                 | Generated: 16 / Completed: 0 | Generated: 0 / Completed: 16 | All 16 stories individually marked `status: complete`; index markers updated GENERATED → COMPLETE |

---

## 2026-08-26T20:15:00Z - Status Sync

**Triggered by**: analyze-context integrity check

| Artifact                                                                           | Old Status         | New Status   | Reason                                                                               |
| ---------------------------------------------------------------------------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------ |
| intents/001-weekly-dinner-planner/units/003-weekly-dinner-planner-ui/unit-brief.md | draft              | in-progress  | Bolt 003-weekly-dinner-planner-ui (its first bolt) is in-progress                    |
| intents/001-weekly-dinner-planner/requirements.md                                  | inception-complete | construction | Unit 003-weekly-dinner-planner-ui is in-progress; intent has moved into Construction |

---

## 2026-08-27T23:03:25.752Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                                             | Old Status         | New Status      | Reason                            |
| ------------------------------------------------------------------------------------ | ------------------ | --------------- | --------------------------------- |
| memory-bank\intents\002-kitchen-table-theme\units\001-kitchen-table-ui\unit-brief.md | draft              | stories-defined | Unit has 6 bolts (3/6 complete)   |
| memory-bank\intents\002-kitchen-table-theme\requirements.md                          | inception-complete | units-defined   | Intent has 1 units (0/1 complete) |

---

## 2026-08-28T13:55:25.610Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                                                       | Old Status | New Status      | Reason                            |
| ---------------------------------------------------------------------------------------------- | ---------- | --------------- | --------------------------------- |
| memory-bank\intents\001-weekly-dinner-planner\units\003-weekly-dinner-planner-ui\unit-brief.md | complete   | stories-defined | Unit has 8 bolts (7/8 complete)   |
| memory-bank\intents\001-weekly-dinner-planner\units\004-grocery-store-config\unit-brief.md     | complete   | stories-defined | Unit has 2 bolts (1/2 complete)   |
| memory-bank\intents\001-weekly-dinner-planner\requirements.md                                  | complete   | construction    | Intent has 4 units (2/4 complete) |

---

## 2026-08-28T13:55:37.596Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                      | Old Status   | New Status    | Reason                            |
| ------------------------------------------------------------- | ------------ | ------------- | --------------------------------- |
| memory-bank\intents\001-weekly-dinner-planner\requirements.md | construction | units-defined | Intent has 4 units (2/4 complete) |

---

## 2026-08-28T20:33:10.222Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                                                       | Old Status         | New Status      | Reason                            |
| ---------------------------------------------------------------------------------------------- | ------------------ | --------------- | --------------------------------- |
| memory-bank\intents\001-weekly-dinner-planner\units\003-weekly-dinner-planner-ui\unit-brief.md | complete           | stories-defined | Unit has 9 bolts (8/9 complete)   |
| memory-bank\intents\001-weekly-dinner-planner\requirements.md                                  | complete           | construction    | Intent has 4 units (3/4 complete) |
| memory-bank\intents\004-account-model\requirements.md                                          | inception-complete | units-defined   | Intent has 2 units (0/2 complete) |

---

## 2026-08-28T20:33:43.163Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                      | Old Status   | New Status    | Reason                            |
| ------------------------------------------------------------- | ------------ | ------------- | --------------------------------- |
| memory-bank\intents\001-weekly-dinner-planner\requirements.md | construction | units-defined | Intent has 4 units (3/4 complete) |

---

## 2026-08-31T21:31:36.007Z - Status Sync

**Triggered by**: status-integrity script

| Artifact                                                                                                | Old Status  | New Status      | Reason                            |
| ------------------------------------------------------------------------------------------------------- | ----------- | --------------- | --------------------------------- |
| memory-bank\intents\008-claude-proxy-review-remediation\units\001-claude-proxy-hardening\unit-brief.md  | draft       | stories-defined | Unit has 2 bolts (0/2 complete)   |
| memory-bank\intents\008-claude-proxy-review-remediation\units\002-settings-ai-remediation\unit-brief.md | draft       | stories-defined | Unit has 1 bolts (0/1 complete)   |
| memory-bank\intents\008-claude-proxy-review-remediation\requirements.md                                 | in-progress | units-defined   | Intent has 2 units (0/2 complete) |

---

## 2026-09-07T00:00:00Z - Status Sync

**Triggered by**: analyze-context integrity check (master agent)

| Artifact                                                                                       | Old Status                                      | New Status                                               | Reason                                              |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| memory-bank/intents/013-placement-edit-control/units/001-placement-review-state/unit-brief.md  | ready                                           | complete                                                 | All bolts complete (055); 3/3 stories done          |
| memory-bank/intents/013-placement-edit-control/units/002-store-placement-control/unit-brief.md | ready                                           | complete                                                 | All bolts complete (056, 057); 6/6 stories done     |
| memory-bank/intents/013-placement-edit-control/units/003-shopping-list-move/unit-brief.md      | ready                                           | deferred                                                 | Bolt 058 deferred, unstarted; excluded from v0.11.0 |
| memory-bank/story-index.md (013 header)                                                        | "IN PROGRESS (bolt 055; 056, 057, 058 planned)" | "SHIPPED v0.11.0 (055, 056, 057 complete; 058 deferred)" | Header stale after bolts 056-057 and release        |

**Note**: intent 013 `requirements.md` left at `status: complete` — matches project convention where intent status tracks inception completion (all 13 intents read `complete`).

---

## 2026-09-10T19:12:03Z - Status Sync

**Triggered by**: analyze-context integrity check (master agent)

| Artifact                                                                   | Old Status               | New Status                       | Reason                                                                 |
| -------------------------------------------------------------------------- | ------------------------ | -------------------------------- | ---------------------------------------------------------------------- |
| memory-bank/bolts/061-recipe-extraction/bolt.md                            | stages_completed: [plan] | + implement; current_stage: test | `implementation-walkthrough.md` exists and reports all work items done |
| memory-bank/intents/014-recipe-entry/units/002-recipe-import/unit-brief.md | ready                    | in-progress                      | Bolt 061 in-progress (implement done, test pending); 062 planned       |

**Note**: intent 014 `requirements.md` left at `status: complete` — matches project convention where intent status tracks inception completion (all 17 intents read `complete`).

---

## 2026-09-11T15:24:53Z - Status Sync

**Triggered by**: `status-integrity.cjs` (read-only run) after bolts 061 and 062 were found closed by hand

| Artifact                                                                                         | Old Status                   | New Status                  | Reason            |
| ------------------------------------------------------------------------------------------------ | ---------------------------- | --------------------------- | ----------------- |
| memory-bank/intents/014-recipe-entry/units/002-recipe-import/stories/001-paste-box-and-sizing.md | complete, implemented: false | complete, implemented: true | Bolt 061 complete |
| memory-bank/intents/014-recipe-entry/units/002-recipe-import/stories/002-extraction-prompt.md    | complete, implemented: false | complete, implemented: true | Bolt 061 complete |
| memory-bank/intents/014-recipe-entry/units/002-recipe-import/stories/003-response-parsing.md     | complete, implemented: false | complete, implemented: true | Bolt 061 complete |

**Cause**: bolts 061 and 062 were closed by hand-editing statuses instead of running
`bolt-complete.cjs`, which `bolt-start.md` Step 10 makes a hard gate. The hand edit for 061 set
`status` but not `implemented`; the script sets both. 062's hand edit happened to set both.

**How it was fixed**: `bolt-complete.cjs 061` was run first and refused ("Bolt is already
complete" — `validateBoltStatus` rejects closed bolts), so the script has no path for a bolt closed
out of band. `status-integrity.cjs --fix` was NOT used, because it would also rewrite the six
convention items below. The one missing field was set to exactly the value the script writes.

**Left deliberately**: 6 items flagged by the script remain — unit-briefs at `ready` (script wants
`stories-defined`) and `requirements.md` at `complete` (script wants `units-defined`) for intents
017 and 018. This is the project convention recorded in the 2026-09-07 entry above, not drift.

---

## 2026-09-11T16:38:40Z - Timestamp Correction

**Triggered by**: reading the real clock at bolt 069 start and finding memory-bank times later than it

13 timestamps written on 2026-09-11 were estimated rather than read from the clock, and each was
**later than the commit that recorded it** — impossible for a creation or completion time. Each was
replaced with that commit's time, which is a hard upper bound. The true times are not recoverable.

| Recorded by commit             | Commit time (UTC)    | Guessed values replaced                  |
| ------------------------------ | -------------------- | ---------------------------------------- |
| fd66c42 (bolt 062)             | 2026-09-11T13:56:03Z | 14:05, 14:45, 15:30                      |
| f0e7c58 (014 deployment plan)  | 2026-09-11T14:11:31Z | 16:00, 16:20                             |
| d843d49 (story-index gap fix)  | 2026-09-11T15:24:53Z | 19:10, 19:20                             |
| c9a5c50 (intent 018 inception) | 2026-09-11T16:24:16Z | 18:00, 18:15, 18:20, 18:25, 18:30, 19:40 |

**Known loss**: bolt 062's plan/implement/test stage times now all read 13:56:03Z. Its real order
is plan → implement → test, as the artifacts themselves show; the times no longer distinguish them,
and inventing an ordering would repeat the original error.

**Found by**: comparing every timestamp each 2026-09-10/11 commit added against that commit's own
time. Commits 8e286f7 and c292f11 were clean. From here, timestamps come from `date -u`.

---
