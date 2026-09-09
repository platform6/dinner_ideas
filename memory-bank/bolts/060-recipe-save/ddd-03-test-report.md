---
stage: test
bolt: 060-recipe-save
created: '2026-09-08T23:55:00Z'
---

## Test Report: 001-recipe-manual-entry (the save)

### Summary

- **vitest**: 450 / 450 (37 files) — was 428, **+22**
- **pgTAP**: 394 / 394 (21 files) on a clean-slate `db reset` — was 372, **+22**
- **`tsc -b`**, **`eslint src`**, **`vite build`**: clean

### Test Files

- [x] `supabase/tests/database/create_dinner_rpc_test.sql` — 22 cases, new file
- [x] `src/features/recipe-entry/api.test.ts` — 14 cases, new file: payload shaping and `mapSaveError`
- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx` — +8 cases: the save journey
- [x] `supabase/tests/database/advisor_hardening_test.sql` — +2 assertions (stage 4)

---

### The one test this bolt exists for

ADR-13's whole claim is that a save writes a complete Dinner or nothing. Asserting that requires a
failure that happens **after** the `dinners` insert has already succeeded inside the function — an
ingredient category outside the CHECK set does exactly that:

```sql
select throws_ok($$ ... category: "NotACategory" ... $$, '23514', ...);
select is((select count(*)::int from public.dinners where name = 'Test Orphan Dinner'), 0,
  'NO dinners row survives that failure');
```

Falsified directly. Wrapping the ingredient insert in `begin ... exception when others then null;
end` — the SQL equivalent of the compensation this ADR rejected, and a shape a well-meaning
"let's not fail the whole save" edit would produce — leaves the dinner row behind. **Tests 18 and
19 failed, and nothing else did.** The assertion is aimed exactly at the invariant and at nothing
else.

### Falsification

| Sabotage                                             | Expected to break       | Result                                                    |
| ---------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| Ingredient insert failure swallowed (atomicity gone) | the orphan check        | Failed **18–19** — the two atomicity cases, nothing else  |
| Step numbers reversed                                | order and contiguity    | FAIL                                                      |
| Tag names not deduped or lowercased                  | tag reuse               | Failed **14, 16** — the reuse case and the collapse count |
| `security definer` instead of `invoker`              | the hardening assertion | FAIL — caught by `advisor_hardening_test.sql`             |
| `mapSaveError` returns the raw Postgres message      | story 006's messages    | Failed 8 cases across both files                          |
| The draft is cleared on a failed save                | draft preservation      | Failed 6, including "KEEPS the whole draft"               |
| Steps sent in reverse order from the client          | displayed order         | Failed 1, precisely                                       |
| Restored                                             | —                       | 450 / 450 and 394 / 394                                   |

Seven sabotages, all caught. The `security definer` one is worth noting: it was caught by the
assertion added in stage 4 for exactly that purpose, so the "someone fixes it for consistency"
hazard named in ADR-13 is now a failing test rather than a comment.

---

### What the pgTAP suite covers

**Atomicity** (above), plus:

- All four tables written, one row per line / step / tag
- `household_id` is the caller's, from the column default — never a parameter
- **Step order round trip**: the stored order IS the given order, numbered 1..n contiguously
- A **fractional** quantity survives as `numeric` rather than truncating to an integer
- Tags: a new one created once; `TEST-WEEKNIGHT`, `  test-weeknight  ` and `test-weeknight`
  collapse to **one** tag and two attachments, not three
- **The items registry filled itself** — the ingredient produced a grocery item, written by
  intent 010's trigger with no application code (ADR-7)
- INV-1 and INV-2 refused by the function itself, not by a column constraint
- A duplicate name raises `23505` per household
- `prosecdef = false` — `security invoker`, so RLS applies

### What the client tests cover

- **One RPC call**, with `expect(rpc).toHaveBeenCalledTimes(1)` — the aggregate goes in one trip
- Quantities and cook time sent as **numbers**, not strings; text trimmed; steps in displayed order
- `mapSaveError` for `23505`, `23514`, `42501` and the fallback, including a case asserting the raw
  text `duplicate key value violates unique constraint "dinners_household_id_name_key"` **cannot**
  reach the interface
- `42501` maps to permission and explicitly **not** to "try again" — retrying never fixes a grant
- The duplicate-name journey end to end: plain message, no Postgres text, **the whole draft
  preserved**, still on the page
- Navigation to the catalog on success — which required rendering through real `<Routes>`

### A test that needed the harness fixed, not the assertion

"Goes to the catalog once it saves" failed at first: the page was rendered bare inside a
`MemoryRouter`, so `navigate('/')` changed the location and unmounted nothing. The assertion was
right and the setup was wrong.

Rendering through real routes — `/dinners/new` and a `/` stub — fixes it and is closer to how the
app actually mounts the page. Worth recording because the tempting alternative was to mock
`useNavigate` and assert it was _called_, which tests that a function ran rather than that the user
ended up somewhere.

---

### Acceptance Criteria Validation

**Story 005 — atomic save**

- ✅ All four tables written from one valid draft
- ✅ A hand-typed tag is created lowercase; an existing one is reused, never duplicated
- ✅ `dinners.name` uniqueness is per household — **already true** since intent 004; see below
- ✅ **No partial dinner survives a failure** — falsified, not assumed
- ✅ `household_id` from the caller; existing RLS insert policies used unchanged, no new policy
- ⚠️ Appears in the catalog and can be picked — **post-deploy check**, see Not covered
- ⚠️ Cooking view renders its steps — **post-deploy check**
- ✅ A new ingredient appears as an unreviewed grocery, written only by the trigger

**Story 006 — duplicate name**

- ✅ Plain-language message
- ✅ No raw Postgres text reaches the interface
- ✅ The rest of the draft is preserved intact
- ✅ The save path handles the constraint; there is no check-then-insert race, because there is no
  pre-check at all — the constraint is the only enforcement

**Story 007 — tests**

- ✅ Validation cases: zero ingredients, zero steps, non-positive cook time, non-positive quantity,
  blank step — refused before any network call (bolt 059's suite, plus "does NOT call the save when
  the draft is incomplete")
- ✅ Middle step removed → remaining steps contiguous from 1
- ✅ All tables written with the draft's contents; `step_number` matches displayed order
- ✅ A failing save leaves no partial dinner
- ✅ Duplicate name: message and draft preserved
- ✅ Categories come from the shared `INGREDIENT_CATEGORIES` (bolt 059's suite asserts the five)
- ✅ The Postgres function has pgTAP coverage

---

### The bolt's stated migration was already shipped

Recorded here because it changed the deliverable. The brief says "the migration is certain" and
story 006 says `dinners.name` is "unique **globally**". Intent 004 rescoped it on 2026-08-28
(`20260828231000_account_model_household_id_columns.sql`), and production carries exactly one unique
constraint: `dinners_household_id_name_key UNIQUE NULLS NOT DISTINCT (household_id, name)`.

So this migration carries the function alone, and ADR-13's cost list was corrected: the function
_does_ add a migration compensation would have avoided. The decision stands, because it was made on
whether the invariant holds — but the supporting argument the brief offered was false, and is no
longer being leaned on.

### Not covered

- **No end-to-end check against a real browser.** That a saved dinner appears in the catalog, can
  be picked, and cooks correctly is asserted at the database level (the rows exist, correctly
  shaped) but not through the UI. It is the post-deploy smoke, as it was for intents 015 and 016.
- **Concurrency is untested.** Two devices saving the same dinner name simultaneously is guarded by
  `unique (household_id, name)`, and a two-session race cannot run inside one pgTAP transaction —
  the same limitation recorded for the `20260827002830` `for update` guarantee in intent 015.
- **`database.types.ts` is ahead of production**, exactly as in bolt 064: `fn_create_dinner` exists
  only locally until this migration ships. A routine `--linked` regen during the deploy window
  would revert it and break the build. The trap disappears the moment the migration is applied.
- **The responsive layout is still unverified** — carried over from bolt 059, and unchanged by this
  bolt. jsdom has no layout engine.
