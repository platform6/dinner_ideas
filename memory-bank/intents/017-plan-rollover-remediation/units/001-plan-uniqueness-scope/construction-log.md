---
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
created: '2026-09-08T16:00:00Z'
last_updated: '2026-09-08T17:20:00Z'
---

# Construction Log: 001-plan-uniqueness-scope

## Status

✅ **Complete 2026-09-08.** Started and finished the same day, in response to a live production outage.

| Bolt                      | Stories       | Status      |
| ------------------------- | ------------- | ----------- |
| 067-plan-uniqueness-scope | 001, 002, 003 | ✅ complete |

## Log

- **2026-09-08T15:34:00Z**: story 003 performed ahead of the bolt — stale draft `bf0206d0…`
  locked at the product owner's direction to clear the block. `unlocked_plans` now 0.
- **2026-09-08T16:00:00Z**: 067-plan-uniqueness-scope started — Stage 1: model
- **2026-09-08T16:10:00Z**: 067 stage-complete — model → design
- **2026-09-08T16:25:00Z**: 067 stage-complete — design → adr-analysis
- **2026-09-08T16:40:00Z**: 067 stage-complete — adr-analysis → implement (ADR-11)
- **2026-09-08T16:55:00Z**: 067 stage-complete — implement → test
- **2026-09-08T17:20:00Z**: 067 completed — all 5 stages done

## Outcome

The index is rescoped to `(household_id, start_date)`. **The migration is written, not applied** —
production still runs the household-wide version, and applying it is Operations' step.

Two findings worth carrying forward:

**The old pgTAP case was weaker than its name.** It inserted two plans at the same `current_date`
and asserted the second was rejected — which holds under both the old and the new index. It never
exercised the household-wide scope, which is why the suite stayed green for two intents while the
rule and the application drifted apart.

**`supabase test db` does not re-apply migrations.** Two falsification runs appeared to pass with a
deliberately sabotaged migration; the schema simply had not changed. An explicit `supabase db reset`
is required between editing a migration and testing it — otherwise a migration ships
believed-tested and untested.

Docker was available for the first time in this project's history, so the suite ran locally on a
full clean-slate chain: **361/361**.
