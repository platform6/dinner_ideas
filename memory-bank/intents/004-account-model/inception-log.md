---
intent: 004-account-model
created: 2026-08-28T00:00:00Z
completed: null
status: in-progress
---

# Inception Log: account-model

## Overview

**Intent**: Introduce a real three-tier account model (`auth.users` → `profiles` → `households`)
beneath the app — household + profile + membership tables, a `household_id` on every domain table,
a full RLS rewrite, a reusable default-catalog seeding routine, a `handle_new_user()` provisioning
trigger, and a one-time migration folding all existing data into a single founding household.
First of three "Tier 2" intents; the existing shared login keeps working (public sign-up is `006-auth-flows`,
settings is `007-account-settings`).
**Type**: refactoring (data model + authorization; brown-field, no user-facing feature)
**Created**: 2026-08-28

## Artifacts Created

| Artifact       | Status                      | File                                                                                               |
| -------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Requirements   | ✅ (approved, Checkpoint 2) | requirements.md                                                                                    |
| System Context | ✅                          | system-context.md                                                                                  |
| Units          | ✅                          | units.md + units/001-household-data-model/unit-brief.md + units/002-account-model-ui/unit-brief.md |
| Stories        | ✅                          | units/001-household-data-model/stories/_.md (10) + units/002-account-model-ui/stories/_.md (2)     |
| Bolt Plan      | ✅                          | memory-bank/bolts/026–031/bolt.md (6)                                                              |

## Summary

| Metric                      | Count                                                        |
| --------------------------- | ------------------------------------------------------------ |
| Functional Requirements     | 11                                                           |
| Non-Functional Requirements | 4 groups (Security, Reliability, Performance, Compatibility) |
| Units                       | 2                                                            |
| Stories                     | 12                                                           |
| Bolts Planned               | 6                                                            |

## Units Breakdown

| Unit                     | Stories | Bolts       | Priority |
| ------------------------ | ------- | ----------- | -------- |
| 001-household-data-model | 10      | 5 (026–030) | Must     |
| 002-account-model-ui     | 2       | 1 (031)     | Must     |

## Decision Log

| Date       | Decision                                                                                                                                                                  | Rationale                                                                                                                                                    | Approved |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 2026-08-28 | Pursue "Tier 2" full per-user accounts, split into 3 intents: `004-account-model`, `006-auth-flows`, `007-account-settings`                                               | Settings alone don't need the refactor, but the user wants real multi-user; splitting de-risks the migration before sign-up UI lands                         | Yes      |
| 2026-08-28 | Three-tier model: `auth.users` + `profiles` (identity) → `households` + `household_members` (sharing boundary) → `household_id` on every domain table                     | Earlier framing conflated "the user's login" with "the shared container"; the user called this out and asked for an explicit linking household               | Yes      |
| 2026-08-28 | All domain data is household-scoped (catalog, tags, store config, weekly plans, meal history) — no per-user domain data in `004`                                          | Follows from "shared household weekly plan" + "one household per user"; keeps every existing DB invariant and the "one shopping list per week" model         | Yes      |
| 2026-08-28 | One household per user in this intent, enforced by `household_members.unique (profile_id)`                                                                                | Avoids a household-switcher and per-query household context; multi-household is explicitly a later intent                                                    | Yes      |
| 2026-08-28 | Weekly plans stay a single shared household plan per week (not private per-user)                                                                                          | The app is built around one current plan → one shopping list, with DB-enforced exactly-3-to-lock; private plans would break those invariants for little gain | Yes      |
| 2026-08-28 | `dinners_per_week` setting (ships in `006`) will be household-level; container hangs off `households`                                                                     | Consistent with the shared catalog/plan direction                                                                                                            | Yes      |
| 2026-08-28 | Public email/password registration; each sign-up creates a fresh household seeded with the default catalog; owner then invites others                                     | User's stated model. Registration works via a `handle_new_user()` trigger on `auth.users` (Supabase-only, no server code)                                    | Yes      |
| 2026-08-28 | `household_invites` table + the "join existing household instead of creating one" trigger branch live in `004`; the invite-sending UI + email live in `005`               | Keeps all DB/provisioning logic in one intent and independently testable; `005` becomes UI-only                                                              | Yes      |
| 2026-08-28 | Existing data migrates into one founding household owned by `garrett.peter.conn@gmail.com`; migration aborts if that user is absent from `auth.users`                     | No data loss; existing login still shows everything; fail-loud rather than guess an owner                                                                    | Yes      |
| 2026-08-28 | The founding-household migration stamps existing rows; it does NOT call `seed_default_household_catalog()` (that routine is for households created after the model ships) | The data is already present — it only needs a `household_id`                                                                                                 | Yes      |

## Scope Changes

| Date       | Change                                                                                                    | Reason                                                                                                | Impact                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-08-28 | Re-scoped from a 2-tier "account" model to a 3-tier "household" model mid-inception (before Checkpoint 3) | User feedback: tags / "last made" belong at a shared household level, not an individual-account level | Requirements rewritten; +1 concept (`households` vs `profiles` split); no change to intent count |

## Ready for Construction

**Checklist**:

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [ ] Human review complete (Checkpoint 3)

## Next Steps

1. Checkpoint 3 — user reviews context + units + stories + bolt plan
2. On approval → mark inception complete, update `requirements.md` status
3. Begin Construction: Unit `001-household-data-model`, bolt `026-household-data-model`
4. `/specsmd-construction-agent --unit="001-household-data-model" --bolt-id="026-household-data-model"`

## Dependencies

- Depends on `001-weekly-dinner-planner` (complete) — this intent rescopes every table, function,
  and policy that intent created.
- `002-account-model-ui` depends on `001-household-data-model` (bolts 026–028 in practice).
- Blocks `006-auth-flows` and `007-account-settings`.
