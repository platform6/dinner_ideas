---
intent: 023-shopping-list-consolidation
phase: inception
status: complete
created: '2026-09-17T15:43:09Z'
updated: '2026-09-24T16:38:31Z'
---

# Requirements: A shopping list you can shop from without merging lines in your head

## Intent Overview

Generating a usable grocery list is the app's core job, and near-duplicate lines undermine it.

**Type**: brown-field
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17. Clarified at Checkpoint 1 on 2026-09-24.

## What the code does today

- `shopping-list/aggregate.ts` merges on `lower(trim(name))` + `lower(trim(unit))`. "chicken thighs"
  and "chicken thighs, cubed" are two lines. So are "2 lb chicken thighs" and "4 chicken thighs".
- Each line finds its aisle and its registry item (the one the "Where do you find it" sheet edits) by
  `nameKey(name)`, the same key as `items.name_key` in the database. Every distinct raw name is its
  own registry item, so "chicken thighs, cubed" may have a placement that "chicken thighs" doesn't.
- Store setup shows "Nothing here yet" under every aisle with nothing in it. Aisles can already be
  deleted one by one, with a confirmation step.

## Checkpoint 1 decisions (2026-09-24)

| Question                                | Decision                                                  |
| --------------------------------------- | --------------------------------------------------------- |
| Which lines count as the same?          | Strip prep notes: text after a comma, and prep words      |
| Different units on matching lines?      | One line, both amounts, with no conversion                |
| Show prep notes or dinners on the list? | No. Just the total; the cooking view keeps the prep notes |
| Empty aisles in Store setup?            | Hidden behind a toggle; nothing deleted                   |

## Functional Requirements

### FR-1: Lines that differ only by a prep note after a comma merge into one

- **Description**: When the shopping list is built, two ingredient lines are the same item if their
  names match after removing everything from the first comma on.
- **Acceptance Criteria**:
  - "chicken thighs" and "chicken thighs, cubed" produce one line
  - "onion", "onion, diced" and "onion, finely chopped" produce one line
  - Case and surrounding spaces still don't matter, as today
  - Plurals are not merged: "onion" and "onions" stay two lines (a deliberate choice for precision)
  - A prep word **before** the name is kept: "diced tomatoes" and "tomatoes" stay two lines
  - A name that is only a note, like ", diced", is never reduced to an empty key. It keeps its raw
    name
  - The cooking view and the dinner's own ingredient list are unchanged. Prep notes stay there
- **Priority**: Must
- **Changed during construction (bolt 080, 2026-09-24)**: the approved rule also removed prep words
  anywhere in the name. Run against the household's catalog, a leading prep word almost always
  named how the product is sold ("diced tomatoes" is a can, "shredded cheese" is a bag), and
  canned diced tomatoes merged into fresh ones. No leading prep word in the catalog should have
  merged. The product owner chose the comma-only rule.

### FR-2: A merged line shows one amount per unit, side by side

- **Description**: Quantities in the same unit are added together, as today. Quantities in different
  units stay separate amounts on the same line. Nothing is converted.
- **Acceptance Criteria**:
  - 1 lb + 1 lb of chicken thighs → "2 lb chicken thighs"
  - 2 lb + 4 (no unit) of chicken thighs → one line reading "2 lb + 4 chicken thighs"
  - 1 tbsp + 2 tsp → "1 tbsp + 2 tsp", not converted
  - A unit's singular and plural are the same unit: 4.5 cups + 4.5 cup → "9 cups" (added during
    bolt 080 by the product owner, after the catalog showed "4.5 cups + 4.5 cup")
  - Amounts appear in a stable order (the order each unit first appears across the week's dinners),
    so the line doesn't reshuffle when the list re-renders
  - Copy to clipboard uses the same text as the screen
- **Priority**: Must

### FR-3: A merged line shows the plain name, with no prep notes

- **Description**: The merged line is labelled with the ingredient's name with prep notes removed,
  using the capitalization from its first appearance. It doesn't list which dinners it's for, or
  which prep notes were merged.
- **Acceptance Criteria**:
  - "chicken thighs, cubed" + "Chicken Thighs" → labelled from whichever appeared first, with no
    ", cubed"
  - A line that merged nothing looks exactly as it does today, apart from losing its prep notes
- **Priority**: Must

### FR-4: A merged line keeps its aisle, and the aisle sheet still works

- **Description**: Merging must not lose a placement the household already made. A merged line takes
  its aisle, and its registry item for the "Where do you find it" sheet, from the first of these that
  exists:
  1. the registry item whose name is exactly the plain name
  2. otherwise, the first contributing raw name that has an explicit placement
  3. otherwise, the first contributing raw name
- **Acceptance Criteria**:
  - If "chicken thighs, cubed" is placed in Aisle 4 and no "chicken thighs" item exists, the merged
    line sorts into Aisle 4
  - Tapping the merged line opens the sheet for that same registry item, and a move made there
    re-sorts the merged line
  - A line's checked state survives a move, as today
- **Priority**: Must

### FR-5: Store setup hides empty aisles behind a toggle

- **Description**: In the Store setup walking path, an aisle with no items and no category placed in
  it is hidden by default. A toggle at the end of the path reads "Show N empty aisles" and reveals
  them in their normal position. Nothing is deleted.
- **Acceptance Criteria**:
  - An aisle holding only a category placement is not empty and is always shown
  - With the toggle on, the path looks as it does today, and every existing action (rename, reorder,
    delete) works on the revealed aisles
  - A newly added aisle is always visible, even though it's empty, until the page is left
  - When there are no empty aisles, the toggle doesn't appear
  - The "Where do you find it" sheet still lists every aisle, including empty ones, so an item can be
    placed in one
  - The toggle's state isn't remembered: it starts hidden on each visit
- **Priority**: Should

## Non-Functional Requirements

### NFR-1: No schema change

- **Metric**: `git diff origin/main..dev -- supabase/` is empty at release. Merging happens in the
  client when the list is built. `items.name_key` and the registry are unchanged, so Store setup's
  list of groceries still shows each raw name. Merging them there is out of scope.

### NFR-2: Precision over recall

- **Metric**: A test fixture of false friends stays unmerged. These are pairs that share a head noun
  but aren't the same grocery (for example "tomato sauce" vs "tomato paste", "chicken broth" vs
  "chicken thighs"). The same principle as `similarity.ts`: a missed merge costs one extra line, and
  a wrong merge costs a missing grocery.

### NFR-3: Deterministic output

- **Metric**: The same dinners always produce the same lines, labels and amount order, whatever order
  the dinners load in. Asserted by a test that builds the list from shuffled input.

## Out of scope

- Plural merging ("onion" / "onions"), and any fuzzy or similarity-based merging
- Unit conversion
- Merging duplicate items in Store setup's list of groceries (would need `name_key` to change)
- Items assigned to the other intents in 019–023
- Cooking mode improvements, which are deferred and kept in `tasks.md`
