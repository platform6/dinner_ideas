---
intent: 004-account-model
phase: inception
status: units-decomposed
updated: 2026-08-28T00:00:00Z
---

# Account Model - Unit Decomposition

## Units Overview

Two units, split on the backend/frontend seam that `catalog.yaml` defines for `full-stack-web`.
The intent is overwhelmingly a database change, so the backend unit carries FR-1..FR-9 and FR-11;
the frontend unit is a thin client-wiring unit for FR-10 (extend `useAuth`, audit insert sites,
regenerate types). No new screens exist in this intent, so the frontend unit is small.

### Unit 1: `001-household-data-model`

**Description**: The whole schema + authorization change. New `households` / `profiles` /
`household_members` / `household_invites` tables; a `current_user_household_id()` helper;
`household_id` on all 10 domain tables with reworked constraints; a rewrite of all 35
`using (true)` RLS policies to household-scoped ones; a reusable `seed_default_household_catalog()`
routine; the `handle_new_user()` provisioning trigger; the founding-household data migration;
scoping fixes for `fn_weekly_plans_record_meal_history`, `reorder_grocery_store_row`, and
`dinner_last_chosen`; and the standards-doc updates that record the model change.

**Unit Type**: backend
**Default Bolt Type**: ddd-construction-bolt

**Deliverables**:

- New migrations under `supabase/migrations/` (append-only): new tables + RLS; `household_id`
  columns + constraint reworks + indexes; `current_user_household_id()`; RLS rewrite;
  `seed_default_household_catalog()`; `household_invites` + `handle_new_user()`; founding-household
  data migration; function/view scoping updates
- Updated `supabase/tests/database/*.sql` — per-table cross-household isolation cases; seed-routine
  parity check; provisioning-trigger cases (fresh household + invited join)
- `memory-bank/standards/system-architecture.md`, `standards/tech-stack.md`,
  `standards/coding-standards.md`, `standards/decision-index.md` updates

**Dependencies**:

- Depends on: `001-weekly-dinner-planner` (complete) — rescopes every table it created
- Depended by: `002-account-model-ui` (this intent); `007-auth-flows`, `008-account-settings` (future)

**Estimated Complexity**: L — large migration surface (10 tables, 35 policies, 3 functions/1 view),
a data migration that must not lose rows, and a provisioning trigger on `auth.users`. Individual
steps are well-understood Postgres/RLS work with no novel algorithms.

### Unit 2: `002-account-model-ui`

**Description**: Client wiring for the new model. Extend `useAuth` to load and expose the caller's
`profile`, `householdId`, and `role`; audit the 12 `supabase.from(...)` / `.rpc(...)` sites (reads
need no change under RLS; `category_row_assignments` upsert needs its `onConflict` target updated
and `household_id` passed); regenerate `src/shared/lib/database.types.ts`; keep the existing
frontend test suite green.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/auth/useAuth.ts` (+ test) — post-session query for profile/household/role, new
  fields on `UseAuthResult`
- `src/features/store-config/api.ts` (+ test) — `assignCategory` upsert `onConflict:
'household_id,category'`, passes `household_id`
- `src/shared/lib/database.types.ts` — regenerated against the new schema
- Any test fixtures/mocks that assumed unscoped tables

**Dependencies**:

- Depends on: `001-household-data-model` — needs the new columns, RLS, helper, and
  `household_members` table to exist (bolts 026–028 in practice)
- Depended by: `007-auth-flows` (future) — builds its registration/invite UI on the exposed
  `useAuth` shape

**Estimated Complexity**: S — one hook change, one api change, a types regen, and test upkeep. No
new components.

## Unit Dependency Graph

```text
[001-weekly-dinner-planner (complete)]
        │
        ▼
[001-household-data-model] ──► [002-account-model-ui] ──► (007-auth-flows, 008-account-settings)
```

## Execution Order

1. `001-household-data-model` — schema, RLS, provisioning, migration, docs (bolts 026–030)
2. `002-account-model-ui` — client wiring (bolt 031); can begin once bolts 026–028 land

## Requirement-to-Unit Mapping

- **FR-1** (Household / profile / membership tables) → `001-household-data-model`
- **FR-2** (`current_user_household_id()` helper) → `001-household-data-model`
- **FR-3** (`household_id` on every domain table) → `001-household-data-model`
- **FR-4** (RLS rewrite) → `001-household-data-model`
- **FR-5** (`seed_default_household_catalog()` routine) → `001-household-data-model`
- **FR-6** (`household_invites` table + join-by-invite branch) → `001-household-data-model`
- **FR-7** (`handle_new_user()` provisioning trigger) → `001-household-data-model`
- **FR-8** (Founding-household data migration) → `001-household-data-model`
- **FR-9** (SQL function / trigger / view scoping updates) → `001-household-data-model`
- **FR-10** (Frontend ownership context) → `002-account-model-ui`
- **FR-11** (Update project standards docs) → `001-household-data-model`
