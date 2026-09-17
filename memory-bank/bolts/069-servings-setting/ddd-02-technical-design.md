---
stage: design
bolt: 069-servings-setting
created: '2026-09-11T16:47:19Z'
---

## Technical Design: 001-serving-size-setting

### Architecture Pattern

**Follow the pattern that already exists, and add nothing new.** A household preference in this
codebase is a column on `households` with a check constraint, protected by the existing RLS, read and
written through a plain fetch/update pair in `settings/api.ts`, wrapped in a query hook and a
mutation hook, and shown as a control on `/settings`. `week_start_day` (bolt 045) set the pattern and
`dinners_per_week` (bolts 063/064) followed it exactly. This bolt is the third instance.

The design work is in the places that _read_ the value, which is where the domain model found more
than a digit to replace.

---

### Layer Structure

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Presentation                                                          │
│   /settings: a "Servings per dinner" control, owner-editable           │
│   /dinners/new: the ingredients guidance and the unscaled caveat       │
│                 read N instead of 3                                    │
├──────────────────────────────────────────────────────────────────────┤
│ Application                                                           │
│   useServingsPerDinner / useUpdateServingsPerDinner (settings/hooks)   │
│   buildSystemPrompt(vocabulary, servings), called by extractRecipe     │
├──────────────────────────────────────────────────────────────────────┤
│ Domain                                                                │
│   ServingSize 1..12, enforced by the column (ADR-1)                    │
├──────────────────────────────────────────────────────────────────────┤
│ Infrastructure                                                        │
│   households.servings_per_dinner smallint, existing RLS               │
└──────────────────────────────────────────────────────────────────────┘
```

---

### API Design

There is no new endpoint. PostgREST on an existing table, following `dinners_per_week`'s functions
exactly:

- **fetchServingsPerDinner(householdId)**: `select servings_per_dinner from households where id = …`
  → `number`
- **updateServingsPerDinner(householdId, servings)**: `update households set servings_per_dinner = …
where id = …` → `void`. A non-owner is refused by the owner-UPDATE policy, and an out-of-range value
  is refused by the check constraint. Both come back as ordinary PostgREST errors.

**Why a plain `.update()` and not an RPC.** ADR-6 applies to tables with column-level grants.
`households` has none, according to bolt 063's design record, only member-SELECT and owner-UPDATE
row policies. **Stage 4 must confirm this against the migrations before writing the call**, because
the design stage cannot read code and an ADR-6 miss fails with a 42501 that looks like a permissions
bug.

---

### Data Model

**One additive migration**, named from the real clock at Stage 4:

```sql
alter table public.households
  add column if not exists servings_per_dinner smallint not null default 3
    check (servings_per_dinner between 1 and 12);

comment on column public.households.servings_per_dinner is
  'How many people this household cooks a dinner for. 1..12; default 3, which is what the app '
  'hard-coded before intent 018. The TARGET offered when scaling an imported recipe on review, and '
  'the guidance shown when typing quantities in. It does NOT describe stored dinners: a dinner''s '
  'quantities are what the household actually cooks (intent 018, bolt 069 domain model, reading 1).';
```

- `smallint` and `not null default 3`, like its sibling. Existing rows get 3, so behaviour is
  unchanged.
- **The comment records reading 1.** The column's meaning is the thing most likely to be
  misunderstood later, and a comment on the column is where someone reading the schema will look.
- No function, no trigger, and **no new RLS policy**. ADR-12 does not apply because nothing is
  replaced.

**Generated types.** `database.types.ts` is regenerated from the **local** stack after the migration
runs, as bolt 064 did. Regenerating from production would lack the column until the migration is
deployed.

---

### Where N replaces 3

The domain model widened story 003 from "replace a digit" to "replace a claim". Design for each site:

**1. The manual-entry guidance** (`IngredientLinesEditor`, currently _"Quantities are for 3
servings — two adults and one small child."_)

- New wording: **"Enter quantities for {N} — the number your household cooks for."** It reads as
  guidance for what you are typing, not as a statement about every dinner in the catalog (reading 1).
- **"two adults and one small child" is removed, not derived.** No number maps back to a particular
  family, and inventing one ("five people") says less than the number already does.
- N comes in as a prop from `RecipeEntryPage`, which reads it through `useServingsPerDinner`. The
  editor stays a presentational component with no data fetching of its own.

**2. The unscaled caveat** (bolt 062, currently _"…they have NOT been adjusted to 3 servings"_)

- Uses the same N. Bolt 071 will redesign this area around the scale control. In 069 only the
  literal changes.

**3. The extraction prompt** (`prompt.ts`, currently _"Quantities are for 3 servings (2 adults and 1
small child). If the source states a serving count, rescale every quantity to 3…"_)

- **Sequencing decision: parameterise it here, and let bolt 070 delete it.**
  `buildSystemPrompt(vocabulary)` becomes `buildSystemPrompt(vocabulary, servings)`, the rule says N,
  and the family description goes.
- _Why not skip it, since 070 removes the rule anyway:_ if 069 ships on its own, a household that sets
  5 would get imports rescaled to 3. That leaves the app wrong between releases. Parameterising is one
  argument and a few words, and FR-6 plus this bolt's Definition of Done both say no prompt still
  says 3.
- `extractRecipe` gains the same argument, and `RecipeEntryPage.handleExtract` passes the household's
  N.

**4. Anything else.** Stage 4 runs a grep for `3 servings|three servings|2 adults|two adults|small
child` across `src/` and **treats every hit as in scope** until shown otherwise. The known list
above comes from memory of earlier bolts, not from a search, and a missed site is exactly how FR-6
fails quietly.

---

### The Settings control

- **A new card, not a third control on `PlanningWeekCard`.** That card is titled "Planning week" and
  holds `week_start_day` and `dinners_per_week`, which are both facts about the _week_. How many
  people you cook for is not about the week. The domain model's language rule (ServingSize and
  dinners-per-week "must never share a control or a label") is the reason to keep them visibly
  apart.
- Proposed title **"Recipes"**, holding a single **"Servings per dinner"** number control, 1–12.
- **It explains itself** (Checkpoint 1: "make it explain itself"): _"How many people you usually
  cook for. Used as the target when you choose to scale an imported recipe, and as the guidance when
  typing quantities in. Changing it never alters recipes you have already saved."_ The last sentence
  is NFR-1, said where the user makes the change.
- Non-owners see the value read-only with the same owner hint the existing cards use (bolt 064
  consolidated that line). There is no new access rule.

---

### Security Design

- **Authorization**: the existing owner-UPDATE and member-SELECT policies on `households` cover the
  new column automatically. No policy is added, and none is loosened.
- **Validation**: the `check` constraint is the enforcement. The control's 1–12 bound is a
  convenience that avoids a round trip, and never the guarantee.
- **No new surface**: no function, no grant, and nothing `security definer`.

---

### NFR Implementation

- **NFR-1 (existing data untouched)**: the migration only adds a column with a default. No `update`
  touches any dinner row. The column comment and the Settings copy both say so.
- **Deployment order (ADR-9)**: the frontend selects `servings_per_dinner`, so **the migration must
  reach production before the frontend.** It is additive and nothing calls it until the FE ships,
  which is the same safe order v0.14.0 used.
- **Performance**: one extra column on an existing single-row-per-household read. Nothing to design.

---

### Integration Points

- **`claude-proxy`**: unchanged. The prompt gets one argument, and it stays the same size or slightly
  shorter once the family description is removed.
- **Bolt 070**: receives a parameterised prompt and deletes the rescaling rule. It also inherits
  the ServingSize/yield naming rule from the domain model.
- **Bolt 071**: reads `useServingsPerDinner` as the scaling target and replaces the unscaled caveat.

---

### Testing Approach (for Stage 5)

- **pgTAP**: the column exists, defaults to 3, accepts 1 and 12, rejects 0 and 13. An owner can
  update it and a member cannot, proved through the existing policies rather than assumed.
- **Vitest, asserted on rendered text with N ≠ 3** (story 003's AC): with a mocked setting of 5, the
  entry form shows 5 and **does not contain "3 servings" or "small child"**. The absence is the
  assertion that catches a surviving literal.
- **Prompt**: `buildSystemPrompt(vocab, 5)` contains 5 and no "3 servings" and no "small child". The
  existing prompt test that pins 3 servings is updated, not deleted.
- **Settings card**: shows the value, an owner can change it, a non-owner sees it read-only.

**Known test churn, stated in advance**: `RecipeEntryPage.test.tsx` has a unit 001 test asserting
"Quantities are for 3 servings". It changes deliberately. This intent changes that copy, and bolt
062's "unit 001 tests pass unmodified" rule belonged to that bolt, not to this one.

---

### Candidate ADR for Stage 3

**"A stored dinner's quantities mean what the household cooks, not quantities for N people."** This
is the domain model's reading 1. It constrains future work: anything that scales a _saved_ dinner
must first add a per-dinner yield. It is easy to break by accident: a later "rescale everything when
the setting changes" feature would be natural to write and wrong. That is the shape of a decision the
decision index exists to record.
