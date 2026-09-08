---
stage: plan
bolt: 064-dinners-per-week-setting-ui
created: '2026-09-08T19:50:00Z'
---

## Implementation Plan: 005-settings-control

### Objective

One owner-editable control on `/settings` for `households.dinners_per_week`, following the pattern
`week_start_day` established in bolt 045.

---

### ⚠ Blocker to clear first: the generated types

`src/shared/lib/database.types.ts` **does not contain `dinners_per_week`.** It is generated from
**production**, and bolt 063's migration is applied locally only. Any `.select('dinners_per_week')`
or `.update({ dinners_per_week })` fails `tsc` today.

Fix: regenerate from the **local** stack, which has the migration:

```bash
npx supabase gen types typescript --local > src/shared/lib/database.types.ts
```

This deliberately puts the committed types **ahead of production** for the first time in this
project — every prior regen was `--linked` ("regen database.types.ts from prod after v0.11.0").
That is correct here: the types must describe the schema the code targets, and that schema ships in
the same release. Worth stating in the walkthrough so the next `--linked` regen is not mistaken for
a revert.

Check the diff for unrelated drift before committing it.

---

### Range: 1–7

Matches the `check (dinners_per_week between 1 and 7)` from bolt 063, requirements FR-1, and the
resolved decision recorded at inception. **The entry range and the storage range are the same**,
which means there is no second rule to keep in step.

Briefly amended to 3–7 during this stage and reverted the same day: _"Someone might want just one
dinner."_ Noted only because a reader comparing this plan against the conversation would otherwise
find a gap.

A household planning one dinner a week is a coherent thing to want, and the app has no reason to
refuse it.

---

### Deliverables

- `src/shared/lib/database.types.ts` — regenerated from local
- `src/features/settings/api.ts` — `fetchDinnersPerWeek`, `updateDinnersPerWeek`
- `src/features/settings/hooks.ts` — `useDinnersPerWeek`, `useUpdateDinnersPerWeek`
- `src/features/settings/PlanningWeekCard.tsx` — the control
- `src/features/settings/PlanningWeekCard.test.tsx` — new cases appended

No new files. No new dependencies.

---

### Technical Approach

#### 1. Where the control goes: inside `PlanningWeekCard`

Not a new card. The card is titled **"Planning week"** and already reads _"Your dinner plan starts
fresh each Sunday."_ — it is where the shape of the planning week is configured. When the week
starts and how many dinners it holds are the same subject, and a separate card for a single number
would be heavier than the setting deserves.

The alternative — a dedicated card — was considered and rejected on those grounds. Easy to change
later if the card grows.

#### 2. `api.ts` — mirror `week_start_day` exactly

```
fetchDinnersPerWeek(): Promise<number>          — select, maybeSingle, default 3 on no row
updateDinnersPerWeek(householdId, n): Promise<void>  — plain PostgREST update
```

A plain update, not an RPC, for the same reason `updateWeekStartDay` is: `dinners_per_week` is not
a protected column, and the "Household updatable by an owner" policy is the real gate. The existing
comment on `updateWeekStartDay` says this; the new one should say the same rather than leave the
reader to infer it.

#### 3. `hooks.ts` — and one thing to get right

```
useDinnersPerWeek()                — query
useUpdateDinnersPerWeek(householdId) — mutation
```

**Invalidation must include `['weekly-plan']`**, not just the setting's own key.
`useUpdateWeekStartDay` already does this, with the comment "so the catalog / plan surfaces
re-derive the current planning window immediately after a mid-week change".

The same applies here for a different reason: changing N changes whether the current plan is
**full**, which drives the lock control, the plan page's nudge, and the shopping-list and
cooking-view gates. Without it, the setting would appear to save and the rest of the app would
disagree until a refetch — exactly the "takes effect immediately" criterion failing.

#### 4. The control

A `Select` with options 1..7, matching the weekday `Select` beside it. A select rather than a
number input: the range is small and closed, and it makes an out-of-range value unreachable by
construction rather than by validation.

- `aria-label="Dinners per week"`
- `isDisabled={!isOwner || loading || pending}` — same as the weekday control
- Value driven by the query, so a failed write leaves the shown number unchanged
- Non-owners get the existing "Ask a household owner to change this." line, which already covers
  the card

#### 5. Say what it affects

The story's note asks for this, and it is not obvious that one number moves four screens. A line
under the control: the plan, the shopping list and the cooking view all follow it.

---

### Acceptance Criteria

- [ ] The control sits with the other household settings, in `PlanningWeekCard`
- [ ] Only 1..7 is selectable, matching the database `check` exactly
- [ ] An owner can change it; a member sees it disabled with the existing explanation
- [ ] A change invalidates `['weekly-plan']`, so dependent screens re-derive immediately
- [ ] A failed save shows a short message and the displayed value returns to what is stored
- [ ] The copy states that the plan, shopping list and cooking view follow this number
- [ ] `tsc -b`, `eslint`, `vitest` green

---

### Out of Scope

- Every client site that **reads** the number — that is unit 002 (bolt 065). This bolt writes it.
- Any change to bolt 063's migration or its `check` constraint.
