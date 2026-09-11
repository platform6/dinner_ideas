---
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
phase: inception
status: complete
created: '2026-09-07T02:55:00Z'
updated: '2026-09-07T03:20:00Z'
---

# Unit Brief: Recipe Manual Entry

## Purpose

Make the dinner catalog writable. Since intent 001 it has had exactly one writer — a seed
migration — and no way to add the fifty-first dinner. This unit adds the page that does it, and
the save path underneath.

It is complete and useful on its own, for a household with no Anthropic key and no interest in
getting one.

## Scope

### In Scope

- A `/dinners/new` route and an entry point to it from the catalog
- The **recipe draft**: one client-side shape holding name, cuisine, cook time, summary line,
  ordered steps and ingredient lines, plus its validation rules
- The manual form: the dinner fields, an ingredient-line editor, a cooking-step editor, and a
  tag editor over the existing shared vocabulary
- The save: `dinners` + `dinner_ingredients` + `dinner_steps` + `dinner_tags`, atomically
- ~~An additive migration scoping `dinners.name` uniqueness to the household~~ — **already done by intent 004** (corrected 2026-09-08); the unit's migration is `fn_create_dinner` instead
- Duplicate-name handling in plain language

### Out of Scope

- Anything to do with Claude — unit 002 owns every line of that
- Editing or deleting an existing dinner (FR-9)
- **Inferring** tags — this unit provides the editor; unit 002 proposes the values
- Walking-path placement (that is `/store`, intent 013)
- Any change to `dinner_ingredients`, `dinner_steps` or the items trigger

---

## Assigned Requirements

| FR   | Title                            | Priority |
| ---- | -------------------------------- | -------- |
| FR-1 | A recipe entry page              | Must     |
| FR-2 | Manual entry of a dinner         | Must     |
| FR-3 | Ingredient lines with a category | Must     |
| FR-8 | Saving writes the existing shape | Must     |
| FR-9 | Editing out of scope (boundary)  | Must     |

Plus the tag editor from FR-2. (FR-8's `dinners.name` migration turned out to be unnecessary — see above.)

## Key Constraints

- **The founding format is the target, both layers.** A summary line _and_ 4–5 ordered steps. A
  dinner saved without steps is the only one in the catalog that would show "No steps available
  for this dinner yet." in the cooking view.
- **Ingredients are scaled to 3 servings.** Recorded only as a column comment on
  `dinner_ingredients`, so it is easy to lose. The form should make it visible, not assume it.
- **Category is a CHECK on five values** and drives shopping-list placement. Not free text.
- **`dinners.name` is unique per household** — `dinners_household_id_name_key`, already in place
  since intent 004 (corrected 2026-09-08; this unit owns no such migration). A clash within the
  household still reads as English, never as a Postgres error.
- **`tags.name` is lowercase-enforced** by a DB CHECK; reuse `normalizeTagName`, do not
  re-implement it.
- **Do not touch the items trigger.** Inserting ingredients registers groceries as a side effect
  (ADR-7). This unit's only obligation is not to interfere.

## The decision this unit owns

**How does a four-table save stay atomic from a browser?**

PostgREST inserts are separate HTTP calls; there is no client transaction. Either a Postgres
function does all the inserts in one transaction (one additive migration, correct by
construction, and what ADR-1's principle points at), or the client compensates on failure by
deleting the dinner (no migration, both children cascade, but the compensating delete can itself
fail — producing exactly the orphan FR-8 forbids).

**Resolved (ADR-13): the Postgres function.** And the decisive argument was neither of the two
above — it is that the compensation window is a _visibility_ window, not only a failure window: the
dinner row is committed and queryable before its children exist, so another member's catalog can
list and pick a dinner with no ingredients **on the path where nothing goes wrong at all**.

Note also: it is **four** tables, not three — `dinner_tags` and find-or-create on `tags` join
`dinners`, `dinner_ingredients` and `dinner_steps`.

Recorded as **ADR-13**.

> **Corrected 2026-09-08 (bolt 060).** This paragraph read: _"this unit ships a migration either
> way — resolved decision 3 scopes `dinners.name` uniqueness to the household, which no client-side
> approach avoids. So choose the atomicity mechanism on its merits, not on whether it adds a
> migration that is already there."_
>
> **Intent 004 had already scoped it**, on 2026-08-28. There was no certain migration, so the
> chosen function _does_ add one that compensation would have avoided.
>
> The instruction was still right and was followed — the mechanism was chosen on whether the
> invariant holds (ADR-13) — but it no longer rests on this premise, and the real cost is recorded
> in the ADR.

## Interfaces Consumed

| Interface                                                 | From                     | Notes                                  |
| --------------------------------------------------------- | ------------------------ | -------------------------------------- |
| `dinners` / `dinner_ingredients` / `dinner_steps` inserts | intent 001, RLS from 004 | Existing policies, unchanged           |
| `trg_dinner_ingredients_sync_item`                        | intent 010, ADR-7        | Fires on insert; never called directly |
| Catalog page                                              | intent 001               | Gains one entry-point control          |
| Cooking view                                              | intent 001 FR-8          | Reads the steps this unit writes       |

## Interfaces Produced

| Interface              | For      | Notes                                              |
| ---------------------- | -------- | -------------------------------------------------- |
| The recipe draft shape | unit 002 | The type an extraction must produce, tags included |
| The editable form      | unit 002 | Where a parsed draft lands for review (FR-7)       |

## Dependencies

**Requires**: none — every table, policy and trigger it uses already ships. The one schema
change it makes is its own.

**Enables**: `002-recipe-import`

## Definition of Done

- A dinner can be typed in and saved, with no Claude involvement anywhere in the path
- It appears in the catalog and can be picked for a week
- It renders in the cooking view with numbered steps, exactly like a founding dinner
- A save that fails partway leaves no dinner without its ingredients and steps
- A duplicate name **within the household** is reported in plain English
- Zero ingredients or zero steps cannot be saved
- Tags can be attached, detached and created by hand, and are written to `dinner_tags`
- New groceries appear unreviewed on `/store`, with no registry code written here
- `tsc -b`, `eslint`, `vitest` all green
