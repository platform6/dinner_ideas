---
stage: plan
bolt: 059-recipe-draft-form
created: '2026-09-08T21:30:00Z'
---

## Implementation Plan: 001-recipe-manual-entry

### Objective

The page, the draft, and the four editors that fill it — everything a user touches before pressing
save. Bolt 060 owns the save itself.

Since intent 001 the catalog has had exactly one writer: a seed migration. This bolt builds the
surface that makes it writable.

---

## Two things the stories get wrong about the current code

Both were found by reading the code rather than the story text, and one of them changes a
user-facing string.

### 1. `dinners.instructions` is required, and rendered NOWHERE

Story 002 asks the form to explain the summary field as **"the single line shown on the catalog
card"**. It is not shown on the catalog card. It is not shown anywhere:

```text
grep -rn "instructions" src/ --include=*.tsx --include=*.ts | grep -v .test.
→ a comment in FirstRunPanel.tsx, and three lines of database.types.ts. Nothing else.
```

`DinnerCard` renders ingredients, steps and tags. The cooking view renders `dinner_steps`. The
column is real and **`instructions text not null` with no default**, so a save that omits it fails
— but no screen displays it.

**Decision**: capture it, keep it required (the schema demands it), and **label it honestly**. The
hint will say it is a one-line summary of the dinner, not that it appears on the card. Writing
"shown on the catalog card" would be teaching the user something false about their own app.

Whether the card _should_ show it is a real question, and a good one — but it is intent 001's card,
not this bolt's, and answering it here would be scope creep. Flagged for the checkpoint.

### 2. The route shape is a genuinely new pattern

Story 001 says routing "follows whatever the app already does for `/store` and `/settings`". There
is no `/store` — it is `/store-config`. Every route in `App.tsx` is a single flat segment:
`/`, `/plan`, `/shopping-list`, `/cooking`, `/store-config`, `/suppressed`, `/settings`.

The unit brief specifies `/dinners/new`, which would be the **first two-segment route in the app**.

**Decision**: use `/dinners/new` anyway. The story's "no new pattern" is about auth and routing
_mechanism_ — it means "do not invent a route guard" — and `AuthGate` wraps `<Routes>` wholesale,
so a nested path inherits protection with no new mechanism whatsoever. The URL shape is the
conventional one for a create page and matches the unit brief. Recorded because it _is_ a
deviation from what the app looks like today, and the reason should outlive the decision.

---

## Technical Approach

### 1. A new feature folder: `src/features/recipe-entry/`

Unit 002 (import) fills the same draft this unit defines. Putting the draft under `dinners/` would
make the import feature reach into the catalog feature for its target shape. A folder that both
units share is the honest home.

```text
recipe-entry/
  draft.ts                     the shape, its factory, its validation — pure, no React
  draft.test.ts
  components/
    RecipeEntryPage.tsx        route component, entry-mode switch, submit wiring
    DinnerFieldsForm.tsx       story 002
    IngredientLinesEditor.tsx  story 003
    CookingStepsEditor.tsx     story 004
    TagEditor.tsx              story 008
```

`StoreConfigPage` is the precedent for the size and split: a 305-line page over sub-components of
50–250 lines each.

### 2. The draft shape is this bolt's most consequential output

`bolt.md` says it plainly: unit 002 fills the same shape, so **it is an interface, not an
implementation detail**. It gets designed as one — exported, documented, and carrying the tag names
that unit 002's inference will land in.

Two properties it must have:

- **Serializable.** No React state handles, no functions. Unit 002 produces one of these from a
  Claude response and hands it over.
- **Line identity independent of array position** — see below.

### 3. Stable line ids, NOT array indices

Story 003 spells out the failure: _"one is removed, the others keep their contents exactly — no
re-keying that silently shifts values between rows."_

That is the classic React list bug. If the `key` is the array index, removing line 2 makes old
line 3 inherit line 2's key, and any uncontrolled input state (cursor, IME composition, a field
mid-edit) follows the key rather than the data. **Every ingredient line and every step carries a
client-generated `id`** from `crypto.randomUUID()`, used as the React key and never sent to the
database — `dinner_ingredients.id` and `dinner_steps.id` are `gen_random_uuid()` server-side.

This is a test target, not just a convention: the test writes into three lines, removes the middle
one, and asserts the remaining two still hold their own values.

### 4. Validation and renumbering are pure functions over the draft

Not component logic. `draft.ts` exports:

- `validateDraft(draft)` → the list of problems, each naming its field
- `renumberSteps(steps)` → contiguous from 1

The lesson from bolt 066 is fresh: `drawLucky` was answerable only because it was pure and took its
inputs as arguments. Validation has the same shape — a function from a draft to a verdict — and
testing it through the DOM would be testing the DOM.

**Renumbering guards two real constraints**: `check (step_number > 0)` and
`unique (dinner_id, step_number)`. Per ADR-1 the database remains the enforcement; this keeps the
client from ever sending a value it knows is bad.

Refused before any network call, per the stories: zero ingredients, zero steps, a blank step
instruction, non-positive cook time, non-positive quantity, missing name / cuisine / summary.
**Each problem names its field** — story 002's AC rules out a generic "form invalid".

### 5. Tags: the draft carries NAMES, and creates nothing

The sharpest call in this bolt. `addTagToDinner` (`dinners/api.ts:135`) does find-or-create-and-
attach — but it needs a `dinnerId`, and a draft has none.

- **Rejected — create tag rows eagerly as they are typed.** Abandoning a half-finished draft would
  permanently pollute a shared, household-wide vocabulary that has no delete UI. The cost of a
  mistake is paid by everyone in the household, forever.
- **Chosen — the draft holds normalized tag _names_; bolt 060 resolves them at save.** Nothing is
  written until the user commits. This also keeps the draft serializable for unit 002.

`normalizeTagName` is reused, never re-implemented (story 008's AC). Attaching the same tag twice
is made **impossible in the UI** rather than left to `unique (dinner_id, tag_id)` — selecting an
attached tag detaches it.

The existing vocabulary comes from `useAllTags()`, which already exists.

### 6. Reuse, not re-declaration

| Need                | Source                                               | Note                                                  |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| The five categories | `INGREDIENT_CATEGORIES` — `store-config/types.ts:20` | A second copy would diverge from the CHECK constraint |
| Tag normalization   | `normalizeTagName` — `dinners/tags.ts`               |                                                       |
| Existing tags       | `useAllTags()` — `dinners/hooks.ts:56`               |                                                       |
| Cuisine suggestions | derived from `useDinners()`                          | `CatalogPage.tsx:127-129` already does exactly this   |

Units stay free text with suggestions (`lb`, `cups`, `each`, `tbsp`, `tsp`, `cloves`, `packet`,
`oz`) — the schema does not constrain them and neither will the form.

### 7. Two conventions must be VISIBLE, not merely honoured

`bolt.md` is explicit that both live only in schema comments today, "which is exactly how
conventions get lost":

- **Quantities are for 3 servings** (2 adults + 1 small child) — stated in the ingredient section
- **The summary line is not the method** — stated on the summary field, distinguishing it from the
  steps editor

### 8. The paste path is visible and inert

Story 001's last AC: both ways in are visible from the first load, and **the page's shape must not
have to change when unit 002 lands**. So the entry-mode affordance ships now, with the paste side
disabled and honestly labelled. Unit 002 fills it in; it does not restructure the page.

### 9. The catalog entry point

The header `HStack` already carries five things: the count badge, `LuckyPickControl`,
`ClearPicksControl`, and the suppressed `IconButton`. A sixth needs care at phone widths.

Plan: an **"Add dinner"** control reading as _add_, not _import_ (story 001's technical note), using
`uiIcons.add`. If the header cannot take it cleanly on a narrow viewport, it becomes an icon-only
button with an `aria-label`, matching the suppressed control beside it.

---

## What this bolt must NOT do

- **No save.** No write of any kind — bolt 060 owns `dinners` + `dinner_ingredients` +
  `dinner_steps` + `dinner_tags`.
- **No migration.** ~~`dinners.name` is still globally `unique`; scoping it to the household is
  bolt 060's~~ — **corrected 2026-09-08 (bolt 060): it was already per-household**, rescoped by
  intent 004 on 2026-08-28. This bolt still ships no migration; the claim about _why_ was wrong.
  Duplicate-name handling remains story 006's.
- **Nothing Claude-related.** Unit 002 owns every line of that.
- **No edit or delete** of an existing dinner (FR-9).
- **No walking-path placement**, and no write to `items`, `item_placements` or
  `category_placements`. The items registry is trigger-owned (ADR-7).

---

## Acceptance Criteria

- [ ] `/dinners/new` renders, reachable from a discoverable control on the catalog
- [ ] Unauthenticated access behaves exactly as every other route — no new auth mechanism
- [ ] Usable at the app's existing phone breakpoints
- [ ] Both ways in are visible; the paste side may be inert
- [ ] Dinner fields: name, cuisine (suggested from the catalog, free text), cook time, summary
- [ ] Ingredient lines: quantity / unit / name / category, category from `INGREDIENT_CATEGORIES`
      as a **choice, never free text**
- [ ] Steps: add, edit, remove, reorder; **removing a middle step renumbers contiguously from 1**
- [ ] Tags: existing vocabulary offered, select toggles, new names creatable, `normalizeTagName`
      reused, no near-duplicates, **nothing written to `tags`**
- [ ] Validation refuses — naming the field — zero ingredients, zero steps, a blank instruction,
      non-positive cook time, non-positive quantity, and missing required fields, **before any
      network call**
- [ ] Removing one line leaves every other line's contents untouched
- [ ] "3 servings" and "summary, not the method" are both visible in the UI
- [ ] The draft shape is exported and documented as unit 002's target, tags included
- [ ] `tsc -b`, `eslint`, `vitest` green

---

## Out of Scope

- The save path, the name migration, duplicate handling — bolt 060, stories 005 / 006
- Everything in unit 002 (import, extraction, review handoff)
- Making `dinners.instructions` appear anywhere in the app — flagged above, intent 001's surface
