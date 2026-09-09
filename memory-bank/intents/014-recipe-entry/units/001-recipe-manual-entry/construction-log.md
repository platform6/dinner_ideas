---
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
created: '2026-09-08T22:55:00Z'
---

# Construction Log: 001-recipe-manual-entry

## Bolt 059 — recipe draft form (2026-09-08)

Stories 001, 002, 003, 004, 008. The page, the draft, and the four editors that fill it. Bolt 060
still owns the save, so nothing is written yet.

**427 / 427 vitest** (+74), `tsc -b`, `eslint`, `vite build` clean. No SQL.

### Findings

**1. `dinners.instructions` is required by the schema and rendered nowhere in the app.**
Story 002 asked the form to describe it as "the single line shown on the catalog card". It is not
on the card; a grep across `src/` finds only a code comment and the generated types. The column is
`not null` with no default, so it must be captured — but the hint says what the field is _for_ and
distinguishes it from the steps, without asserting a place it does not appear. Whether the card
should show it is intent 001's question, deliberately not answered here.

**2. Deriving the step number beats maintaining it.** The plan called for `renumberSteps`. The
draft turned out not to need a `step_number` field at all — array order is the order, and the
number is computed at render and at save. With no second copy of the ordering, removing a middle
step _cannot_ leave a gap, so `unique (dinner_id, step_number)` holds by construction rather than
by remembering to call a function. Recorded as a deviation because it is one; kept because it is
strictly safer.

**3. An assertion is only a test if a plausible defect would break it — fourth bolt running.**
The case justifying the entire stable-id scheme passed with the sabotage in place. Keying the
ingredient lines by array index broke nothing, because the inputs are **controlled**: React writes
the correct value back from state whatever the key is. Keys govern DOM node _identity_, not value.
Rewritten to assert node identity across a removal, it discriminates.

The three instances so far differ in mechanism and share a shape: bolt 065 asserted an absence
before load, bolt 066 clicked a control that was not yet enabled, bolt 059 asserted a value that
was never at risk. **"It passes" is not evidence until the sabotage has been run.**

**4. A test was deleted rather than made to pass.** A focus-retention case failed _restored_ —
clicking the remove button moves focus to that button, which then unmounts with its row, so focus
is never on the input at removal time. The UI does not preserve the caret and never claimed to.
Adjusting the test until it went green would have produced exactly the kind of assertion finding 3
is about.

**5. `Infinity` again, in a new place.** `Number('Infinity') > 0` is true, so a bare `> 0` check
accepts it and sends it at a `numeric` column. Bolt 066 met the same value as a weight in a
cumulative sum. Different mechanism, same lesson.

**6. Chakra's required indicator changes the accessible name.** `FormControl isRequired` renders
the `*` inside the `<label>`, so `getByLabelText('Name')` misses and an anchored regex is needed.
Five cases failed on this first. Worth knowing before the next form in this codebase.

### Decisions that bolt 060 inherits

- **The draft carries tag NAMES, not ids, and writes nothing.** Creating `tags` rows as they are
  typed would let an abandoned draft permanently pollute a shared household vocabulary that has no
  delete UI. Bolt 060 resolves names at save — `addTagToDinner`'s existing upsert is the pattern.
- **Numeric fields are strings in the draft**, parsed by `parsePositiveNumber`. Bolt 060 is that
  function's second caller; do not write a second parser.
- **`numberedSteps` is the single source of step numbering**, for display and for rows.
- The draft shape is unit 002's target. It is deliberately serializable.

### Left open

**Responsive layout is unverified.** The ingredient row switches `templateAreas` at `sm`, and jsdom
has no layout engine — every test passes at any width. The phone stacking needs a human eye on a
real device, and it is the sensible thing to check before bolt 060 builds on top of it.

---

## Bolt 060 — recipe save (2026-09-08)

Stories 005, 006, 007. The catalog becomes writable. **Unit 001 complete.**

**450 / 450 vitest** (+22), **394 / 394 pgTAP** on a clean-slate reset (+22), `tsc -b`, `eslint`,
`vite build` clean. One migration: `20260908230000_create_dinner_rpc.sql`.

### The decision (ADR-13)

A `security invoker` Postgres function writes all four tables in one transaction, called once over
RPC. The domain model settled it: seven of the Dinner aggregate's eight invariants are properties
of a **complete** Dinner, so a `dinners` row with no ingredients is not an incomplete Dinner — it
is not a Dinner. The aggregate boundary and the transaction boundary are the same boundary.

**The argument that actually decided it is not in any story.** Story 005 rejects client-side
compensation because the compensating delete can fail, which invites "so retry the delete". The
real reason is that **the window is a visibility window, not only a failure window**: between the
`dinners` insert and the children, the row is committed and queryable, so another member's catalog
lists a dinner with no ingredients and can pick it for the week — on the path where nothing goes
wrong at all. Compensation is cleanup for the failure case; this is the success case.

### Findings

**1. The migration this bolt was told it must ship had already shipped.** The brief says "the
migration is certain" and story 006 says `dinners.name` is unique globally. Intent 004 rescoped it
on 2026-08-28; production carries only `dinners_household_id_name_key UNIQUE NULLS NOT DISTINCT
(household_id, name)`. Resolved decision 3 was answered before intent 014 was written.

This mattered beyond a smaller migration: the brief's _supporting_ argument — "the function costs
no extra migration, so don't count that against it" — was false. The function does add a migration
compensation would have avoided. The decision stands because it was made on whether the invariant
holds, which was the brief's actual instruction. ADR-13 and the design doc were corrected rather
than left standing on a dead premise.

**Third stale spec premise in this unit**, after `dinners.instructions` and the `/store` route.
The pattern is worth naming: a story's technical notes describe the codebase _as it was when the
story was written_, and this project moves faster than its specs. Check, do not trust.

**2. `security invoker` against a 19:1 majority — and now a failing test if changed.** The other
19 functions are definer because they deliberately bypass RLS. This one must not: all five tables
carry household-scoped INSERT policies from intent 004, so `invoker` satisfies story 005's "no new
policy, no service_role" by construction. `advisor_hardening_test.sql` now asserts
`prosecdef = false`, so the "someone fixes it for consistency" hazard is caught rather than
commented.

**3. Contiguity made unrepresentable rather than enforced.** Steps arrive as an ordered `text[]`
and are numbered by `unnest(...) with ordinality`. There is no parameter in which a gap could be
expressed. Bolt 059 reached the same shape from the other end by deriving the number from array
position instead of storing it.

**4. A test whose harness was wrong, not its assertion.** "Goes to the catalog once it saves"
failed because the page was rendered bare in a `MemoryRouter` — `navigate('/')` changed the
location and unmounted nothing. Fixed by rendering through real `<Routes>`, which is also how the
app mounts it. The tempting alternative, mocking `useNavigate` and asserting it was _called_, would
have tested that a function ran rather than that the user ended up somewhere.

### Left for the deploy

- **`database.types.ts` is ahead of production**, exactly as in bolt 064. `fn_create_dinner` exists
  only locally until this migration ships; a routine `--linked` regen during the deploy window
  would revert it and break the build.
- **No end-to-end check.** That a saved dinner appears in the catalog, is pickable and cooks
  correctly is proven at the row level, not through the UI. Post-deploy smoke.
- **The responsive layout is still unverified** — carried from bolt 059, unchanged here.
