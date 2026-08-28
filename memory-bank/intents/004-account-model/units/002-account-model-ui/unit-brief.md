---
unit: 002-account-model-ui
intent: 004-account-model
phase: inception
status: stories-defined
created: '2026-08-28T00:00:00Z'
updated: '2026-08-28T00:00:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Account Model UI

## Purpose

Wire the frontend to the new household-scoped schema. No new screens — extend `useAuth` to expose
the caller's household context, fix the one insert site whose conflict target changed, regenerate
the DB types, and keep the existing test suite green.

## Scope

### In Scope

- `useAuth` loads the caller's `profile`, `household_id`, and `role` after the session resolves
  and exposes them on `UseAuthResult` (FR-10)
- Audit of all 12 `supabase.from(...)` / `.rpc(...)` sites: confirm reads need no change under
  RLS; update `category_row_assignments` upsert (`onConflict: 'household_id,category'`, pass
  `household_id`) (FR-10)
- Regenerate `src/shared/lib/database.types.ts` against the new schema (FR-10)
- Update any test fixtures/mocks that assumed unscoped tables

### Out of Scope

- Registration / login / password-reset / invite UI → `007-auth-flows`
- `/settings` page → `008-account-settings`
- Any visual or UX change — this unit ships no component markup

---

## Assigned Requirements

| FR    | Requirement                | Priority |
| ----- | -------------------------- | -------- |
| FR-10 | Frontend ownership context | Must     |

---

## Domain Concepts

### Key Entities

_None new. Consumes `profiles` / `households` / `household_members` for the `useAuth` context
query; all other entities are unchanged in shape (only a `household_id` column is added, handled
by the DB default)._

### Key Operations

| Operation              | Description                                                 | Inputs                             | Outputs                          |
| ---------------------- | ----------------------------------------------------------- | ---------------------------------- | -------------------------------- |
| Load household context | After `getSession`, query the caller's profile + membership | session user id                    | `{ profile, householdId, role }` |
| Assign category to row | Store-config upsert with the new composite conflict target  | `category`, `rowId`, `householdId` | upserted assignment              |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 2     |
| Must Have     | 2     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                              | Title                                                   | Priority | Status  |
| ------------------------------------- | ------------------------------------------------------- | -------- | ------- |
| 001-useauth-household-context         | `useAuth` exposes profile / householdId / role          | Must     | Planned |
| 002-insert-site-audit-and-types-regen | Insert-site audit, store-config upsert fix, types regen | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                       | Reason                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001-household-data-model` | Needs `household_members` / `profiles`, `current_user_household_id()`, the `household_id` columns, and household-scoped RLS to exist (bolts 026–028) |

### Depended By

| Unit                      | Reason                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `007-auth-flows` (future) | Registration / invite UI builds on the exposed `useAuth` shape |

### External Dependencies

| System             | Purpose                                      | Risk |
| ------------------ | -------------------------------------------- | ---- |
| Supabase JS client | `useAuth` context query, store-config upsert | Low  |

---

## Technical Context

### Suggested Technology

Existing stack — `@supabase/supabase-js`, TanStack Query, Vitest/RTL. `database.types.ts` is
regenerated with the Supabase CLI (`supabase gen types typescript`), per `standards/data-stack.md`.

### Integration Points

| Integration                       | Type     | Protocol    |
| --------------------------------- | -------- | ----------- |
| `001-household-data-model` schema | Consumed | Supabase JS |

### Data Storage

None owned. `useAuth`'s household context is in-memory React state alongside the existing session.

---

## Constraints

- No new screens or visual change.
- Reads must not need per-call scoping — RLS does it. Only inserts whose shape/constraints changed
  are touched (`category_row_assignments`).
- The existing `useAuth` test contract (session load, sign-in/out) must keep passing; new
  assertions only for the added context fields.

## Success Criteria

### Functional

- [ ] `useAuth` consumers can read `householdId` and `role`; both are populated whenever a session
      exists and the user has a membership, `null` otherwise
- [ ] Store-config category assignment works against the new `(household_id, category)` PK
- [ ] `database.types.ts` reflects the new tables and `household_id` columns
- [ ] All existing frontend tests pass; store-config upsert test covers the new conflict target

### Non-Functional

- [ ] The context query runs once per session resolution, not per render
- [ ] No regression in catalog / plan / shopping-list / cooking / store-config behaviour

### Quality

- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                 | Type   | Stories  | Objective                                                                      |
| -------------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| 031-account-model-ui | Simple | 001, 002 | All of FR-10 in one bolt — `useAuth` context + insert-site audit + types regen |

Sequence: after bolts 026–028 of `001-household-data-model`.

---

## Notes

Kept as a separate unit (not folded into the backend unit) to preserve the DDD-vs-simple bolt-type
split `catalog.yaml` prescribes, and because it can be scheduled independently once the schema
foundation lands. It is deliberately tiny.
