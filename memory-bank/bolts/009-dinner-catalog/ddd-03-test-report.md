---
stage: test
bolt: 009-dinner-catalog
created: 2026-08-27T03:15:00Z
---

## Test Report: dinner-catalog (follow-up: generic tags)

### Summary

- **Schema Shape Verification**: 3/3 passed (via generated types, see below)
- **Constraint Tests**: ⚠️ Not executed this time — see Execution Note
- **Security Tests (RLS)**: ⚠️ Not executed this time — see Execution Note
- **Build Impact Check**: 1/1 run — ❌ **found a real, expected break** (see Issues Found)
- **Performance Tests**: N/A — trivial volume, no performance testing warranted at this scale

### Execution Note

Unlike bolts `001`/`007`, this session had no way to run assertions directly against the live "dinner ideas" project — the connected Supabase MCP tooling only exposes two unrelated projects, and Docker is not running locally (same limitation noted in prior bolts' reports), so the pgTAP suite (`supabase/tests/database/dinner_catalog_tags_test.sql`, written as the durable regression suite) could not be executed either.

What **was** verified: the user applied the migration themselves via `supabase db push` (confirmed via `supabase migration list` showing `20260827020000` in both `local` and `remote`), and I ran `supabase gen types typescript --linked` against the real project to pull the actual live schema shape — this is a genuine read of the live database, just not a full constraint/RLS test run.

**Recommendation**: next time Docker is available locally, run `supabase test db` to execute the pgTAP suite for real constraint/RLS coverage. Until then, constraint and RLS behavior are implemented-per-design but not independently verified.

### Acceptance Criteria Validation

**Story 004-generic-tags-schema**

- ✅ `dinners.rosie_approved` no longer exists — Confirmed: absent from `supabase gen types typescript --linked` output
- ✅ New tags schema exists (`tags`, `dinner_tags`) — Confirmed: both tables present in generated types, with the `dinner_tags` ↔ `tags`/`dinners` relationships shown
- ⚠️ Lowercase normalization enforced at the DB layer — Implemented as designed (`CHECK (name = lower(name))` in the migration); not independently re-verified live this session (see Execution Note)
- ⚠️ Pre-existing dinners start with zero tags (no auto-migration) — Implemented as designed (migration contains no data-migration step); not independently re-verified live this session
- ⚠️ Removing a tag from a dinner doesn't delete the shared `Tag` row — Implemented as designed (`dinner_tags` delete only); not independently re-verified live this session

### Schema Shape Verification (detail)

| Check                                                                    | Result                           |
| ------------------------------------------------------------------------ | -------------------------------- |
| `tags` table present in live schema                                      | ✅ Confirmed via generated types |
| `dinner_tags` table present in live schema, with FKs to `dinners`/`tags` | ✅ Confirmed via generated types |
| `dinners.rosie_approved` absent from live schema                         | ✅ Confirmed via generated types |

### Issues Found

**Build is currently broken** — this is an expected, known consequence of a schema-only bolt that removes a column the UI still reads, not a defect in this bolt's own scope:

Ran `npx tsc -b` after regenerating `src/shared/lib/database.types.ts` against the live schema. Result: **15 compile errors across 8 files**, all `Property 'rosie_approved' does not exist` / `'rosie_approved' does not exist in type`:

- `src/features/dinners/components/DinnerCard.tsx`
- `src/features/dinners/filters.ts`
- `src/features/dinners/filters.test.ts`
- `src/features/dinners/components/CatalogPage.test.tsx`
- `src/features/cooking-view/components/CookingViewPage.test.tsx`
- `src/features/shopping-list/components/ShoppingListPage.test.tsx`
- `src/features/shopping-list/aggregate.test.ts`
- `src/features/weekly-plan/components/PlanPage.test.tsx`
- `src/features/weekly-plan/toggle-selection.test.ts`

**This is exactly bolt `012-weekly-dinner-planner-ui`'s job** (stories `011-catalog-card-expandable-details`, `012-tag-management-ui`) — it replaces every `rosie_approved` reference with the new tag UI. Flagging clearly because **the app cannot currently be rebuilt or redeployed** until bolt `012` lands; a `git push` that triggers a Netlify rebuild right now would fail CI. Recommend treating `012` as the immediate next bolt, not a "whenever" follow-up.

### Recommendations

- Prioritize bolt `012-weekly-dinner-planner-ui` next — the live app's rebuildability depends on it now, not just the tag UI feature itself.
- Get Docker running in this dev environment so `supabase test db` can execute the pgTAP suite locally (and eventually in CI) — this is the second bolt in a row where that gap prevented direct constraint/RLS verification.
- Once bolt `012` lands, re-run `npx tsc -b` to confirm the build is clean again before any deploy.
