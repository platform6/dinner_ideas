---
intent: 019-ui-correctness-fixes
phase: inception
status: complete
created: '2026-09-17T15:43:09Z'
updated: '2026-09-17T16:05:35Z'
---

# Requirements: Fix what the UI gets wrong

## Intent Overview

Things on live screens that are simply wrong: numbers that don't match state, a default that
quietly misfiles ingredients, a layout that breaks, and two names for one action. They erode trust
in every other number on the page, so they go first.

**Type**: defect-fix (brown-field)
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17.

### What the code shows

- **Stale counts on `/plan`.** Intent 015 made the number of dinners a household setting
  (`dinners_per_week`), and `PlanPage` already uses it for "Pick N dinners to lock in your week"
  (`PlanPage.tsx:117`). Two strings were missed: "Locks these 3 dinners and adds them to your
  history" (`:131`) and "All three picked. Your shopping list is ready." (`:274`). A household
  planning 5 dinners sees both.
- **Every new ingredient line starts in Produce** (`recipe-entry/draft.ts:71`). Chicken thighs typed
  in and saved without a second look are filed under Produce, and the shopping list follows.
- **The only record of an ingredient's previous aisle is `dinner_ingredients.category`** on the
  household's saved dinners. The `items` registry holds names only (`name`, `name_key`,
  `reviewed_at`) and has no aisle. There are five aisles: Produce, Protein, Dairy, Grains, Pantry.
- **The catalog is a `SimpleGrid`** (1 / 2 / 3 columns at base / sm / xl, `CatalogPage.tsx:306`),
  so a row is as tall as its tallest card. Expanding Details on one card leaves its neighbour
  beside a tall empty space.
- **"Add dinner" vs "Add a dinner".** The catalog button's text is "Add dinner"
  (`CatalogPage.tsx:189`); its aria-label (`:175`) and the entry page heading
  (`RecipeEntryPage.tsx:215`) say "Add a dinner".
- **The shopping list's phone footer is sticky, not fixed** (`ShoppingListPage.tsx:429-430`:
  `position="sticky"`, `bottom="70px"`, lifted clear of the 70px tab bar). It holds the copy button
  and the lock nudge. Because it is sticky it takes space in the flow, so content passing beneath
  it mid-scroll is expected. What must not happen is content that can never be seen above it, or a
  focused control scrolled underneath it.
- **The card's action menu opens `bottom-end` from the top-right button** (`DinnerCard.tsx:274`).
  On a phone, card titles wrap to two lines, so the menu lands on the title's second line.

## Decisions taken at Checkpoint 1 (2026-09-17)

1. **Aisle for a new ingredient line: the household's history, otherwise the cook chooses.** Never
   a silent guess.
2. **An expanded card spans its row** and pushes later cards down.
3. **The Ctrl+A report is deferred.** The Name field is a plain controlled input with no key
   handling (`DinnerFieldsForm.tsx:41-43`); the report may be an artifact of the automated review.
   It is back in `tasks.md`, not in this intent.
4. **"Add a dinner" is the one wording.**

## Scope change after Checkpoint 3 (2026-09-17)

The product owner's mobile review (`mobile.md`) was triaged into existing and new intents:

- **Added here** as FR-6 and FR-7: the shopping-list footer covering items, and the card menu
  covering the card title. Both are small, both are wrong on screen, and both belong with this
  intent's other fixes.
- Already here: the "Locks these 3 dinners" / "All three picked" copy (FR-1).
- **Intent 021**: the catalog header wrapping on mobile, and the filter dropdown's mobile behaviour.
- **New intent 024** (mobile ergonomics): touch targets, Store setup row truncation, and the
  aisle-picker sheet.

## Functional Requirements

### FR-1: Plan page copy states the household's dinner count

- **Description**: Every count on `/plan` comes from `dinners_per_week`. No literal "3" or "three"
  remains in the plan page's copy.
- **Acceptance Criteria**:
  - **Given** `dinners_per_week` is N and the lock action is shown, **Then** its help text reads
    "Locks these N dinners and adds them to your history. You can still shop your list either
    way." For N = 1 it reads "Locks this dinner and adds it to your history. …"
  - **Given** the current week's plan holds N of N picks, **Then** the message reads "All N dinners
    picked. Your shopping list is ready." For N = 1 it reads "Your dinner is picked. Your shopping
    list is ready."
  - Tests assert the **rendered text** for N = 1, 3 and 5, and assert that neither "3" nor "three"
    appears in `/plan` copy when N ≠ 3.
  - `DinnerCard.tsx`'s doc comments that say "3 dinners" are corrected to say `dinners_per_week`.
- **Priority**: Must

### FR-2: A new ingredient line has no aisle until one is known or chosen

- **Description**: A blank line added in manual entry starts with **no aisle selected**. The dinner
  cannot be saved while any line has no aisle.
- **Acceptance Criteria**:
  - **Given** the user adds an ingredient line, **Then** its aisle control shows a "Choose aisle"
    placeholder, not Produce.
  - **Given** any line has no aisle, **When** the user saves, **Then** nothing is written, and that
    line shows "Choose an aisle" beside the control, the same way other per-line problems are shown.
  - **Given** every line has an aisle, **Then** saving behaves exactly as it does today.
  - The placeholder is not an aisle: it can't be chosen once a real aisle is selected, and it is
    never sent to the database.
- **Priority**: Must

### FR-3: A known ingredient's aisle is filled from the household's own dinners

- **Description**: When an ingredient name matches one the household has used before, its aisle is
  filled with the aisle the household last used for it.
- **Acceptance Criteria**:
  - **Match rule**: names match after trimming and lowercasing. This is the same rule as
    `items.name_key` and the shopping list's `nameKey`, so "Chicken thighs " and "chicken thighs"
    match. "chicken thighs, cubed" does **not**; merging similar names is intent 023.
  - **Given** a line's name matches, **And** the user has not chosen an aisle on that line, **Then**
    the aisle is set to the category of that ingredient on the household's **most recently created**
    dinner that has it.
  - **Given** the user has chosen an aisle on a line, **Then** nothing ever overwrites it, including
    a later name change.
  - **Given** an aisle was filled automatically, **When** the name changes, **Then** the aisle
    follows the new name: it refills if the new name matches, and returns to "Choose aisle" if not.
  - **Given** no match, **Then** the line stays at "Choose aisle" (FR-2).
  - A filled aisle looks the same as a chosen one. The cook can change it like any other value.
- **Priority**: Must

### FR-4: An expanded catalog card spans its row

- **Description**: Opening Details on a catalog card makes it take the full width of the grid, so
  no card sits beside empty space.
- **Acceptance Criteria**:
  - **Given** the catalog shows 2 or 3 columns, **When** Details is expanded on a card, **Then** that
    card spans every column, and the cards after it continue on the rows below.
  - **When** Details is collapsed, **Then** the card returns to a single column.
  - Card **order is unchanged**: the grid does not backfill. When the expanded card was not first in
    its row, the cards before it keep their row, and that row may have an empty cell. That is
    accepted, because reordering the catalog while someone reads it is worse.
  - At 1 column nothing changes.
  - Keyboard focus stays on the Details toggle through expand and collapse.
  - Several cards can be expanded at once. Each spans its own row.
- **Priority**: Should

### FR-5: One name for adding a dinner

- **Description**: The action is "Add a dinner" everywhere it is named.
- **Acceptance Criteria**:
  - The catalog button's visible text reads "Add a dinner". Its aria-label and the entry page heading
    stay as they are.
  - No user-facing string "Add dinner" remains in `src/` (a test or lint-style assertion guards
    this).
- **Priority**: Should

### FR-6: The shopping list's phone footer never hides content for good

- **Description**: On phone widths, the sticky footer (copy button and lock nudge) may pass over
  the list while scrolling, but every item can be read above it and nothing focused sits beneath it.
- **Acceptance Criteria**:
  - **Given** a phone-width shopping list of any length, **When** scrolled to the end, **Then** the
    last item, including its move-to-aisle control, is fully visible above the footer, and the
    footer is fully visible above the tab bar.
  - **Given** keyboard or screen-reader focus moves to an item, **Then** the page scrolls so that
    item is visible above the footer, not beneath it.
  - **Given** a section header scrolls under the footer, **Then** that is expected and not a
    defect; the header is reachable by scrolling.
  - At md+ nothing changes: the controls live in the page header.
  - Verified on a real phone-width viewport in the running app (jsdom has no layout).
- **Priority**: Should

### FR-7: A card's action menu never covers the card's title

- **Description**: Opening "More actions" on a catalog card leaves the dinner's name readable, so
  the cook can see which dinner "Not interested" or "Remove…" will act on.
- **Acceptance Criteria**:
  - **Given** a phone-width catalog and a card whose title wraps to two lines, **When** "More
    actions" opens, **Then** no part of the title is covered.
  - **Given** a card near the bottom of the viewport, **When** the menu opens, **Then** the title is
    still not covered, whichever way the menu is placed.
  - At md+ the menu still opens from its button and does not cover the title.
  - The menu remains keyboard operable and closes on Escape and on selecting an action, as today.
  - Verified on a real phone-width viewport in the running app.
- **Priority**: Should

## Non-Functional Requirements

### NFR-1: No schema change

- Nothing in this intent adds or alters a table, column, function or policy. FR-3 reads existing
  `dinner_ingredients` and `dinners` rows through their existing household-scoped SELECT policies.

### NFR-2: Aisle lookup doesn't query per keystroke

- The household's name → aisle map is fetched **at most once** each time the entry form opens, and
  cached with the app's existing query caching. Matching as the user types is local.
- **Metric**: typing a 20-character ingredient name makes zero additional network requests after
  the form has loaded.

### NFR-3: Accessibility doesn't regress

- The "Choose an aisle" error is linked to its control the way existing line errors are, so
  screen readers announce it.
- An automatically filled aisle is not announced as an error or a change the user must act on.
- An expanded card spanning its row keeps the reading order of the markup.

## Assumptions to confirm at Checkpoint 2

1. **Imported recipes keep the aisle the extraction proposes.** FR-3 applies to lines typed in
   manual entry and to names the cook edits. An imported line whose aisle came from the import is
   treated as already chosen. The alternative is that the household's history overrides the
   import's guess.
2. **"Most recent" means the most recently created dinner**, not the aisle used most often. It
   follows the household's latest correction.
3. **FR-4, FR-6 and FR-7 are `Should`**, and any of them could be cut from the release without
   invalidating the rest.

## Out of scope

- The Ctrl+A report (deferred; in `tasks.md`).
- Touch-target sizes, Store setup row truncation, and the aisle-picker sheet (intent 024).
- The catalog header's mobile layout and the filter dropdown's mobile behaviour (intent 021).
- Merging similar ingredient names (intent 023).
- Contrast, the "Full" state and other visual hierarchy (intent 020).
- Search, pagination and filters (intent 021).
