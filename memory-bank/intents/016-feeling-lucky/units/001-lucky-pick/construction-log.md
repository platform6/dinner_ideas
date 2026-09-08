---
unit: 001-lucky-pick
intent: 016-feeling-lucky
created: '2026-09-08T22:00:00Z'
last_updated: '2026-09-08T22:50:00Z'
---

# Construction Log: 001-lucky-pick

## Status

✅ **Complete 2026-09-08** — started immediately after intent 015 shipped as v0.12.0 and unblocked it.

| Bolt           | Stories       | Status      |
| -------------- | ------------- | ----------- |
| 066-lucky-pick | 001, 002, 003 | ✅ complete |

## Log

- **2026-09-08T22:00:00Z**: 066-lucky-pick started — Stage 1: plan
- **2026-09-08T22:10:00Z**: 066 stage-complete — plan → implement
- **2026-09-08T22:40:00Z**: 066 stage-complete — implement → test
- **2026-09-08T22:50:00Z**: 066 completed — all 3 stages done

## Outcome

Intent 016 is built. A "Surprise me" control fills the week's empty slots, weighted away from
recently-eaten dinners, keeping existing picks and creating the plan exactly once.

**Three findings worth carrying:**

`Infinity` is a valid sort key and a fatal weight. `daysSinceForSort` returns it for never-made
dinners; one `Infinity` in a cumulative sum makes every later comparison meaningless. Sabotage
proved it does not merely skew the odds — it removes the randomness entirely, which the
"is a draw, not a ranking" case caught.

Adding K dinners must not be K toggles. `useLuckyPick` resolves the plan once; sabotaging it to
create inside the loop produced three plans for three dinners — the hazard `CatalogPage` already
carried a comment about, and a cousin of intent 017's outage.

**`find*` proves existence, never readiness.** Third occurrence in three bolts. Here the click
landed on a still-disabled button and every integration case passed with zero mutations until the
test waited for loaded content first.

## Not deployed

No migration; frontend only. Ships whenever convenient.
