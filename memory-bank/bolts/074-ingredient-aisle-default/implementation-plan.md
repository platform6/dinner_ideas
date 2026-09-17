---
stage: plan
bolt: 074-ingredient-aisle-default
created: '2026-09-17T16:23:00Z'
---

## Implementation Plan: ingredient-aisle-default

### Objective

A new ingredient line starts with no aisle and cannot be saved until it has one. When its name
matches an ingredient the household has saved before, the aisle is filled from the most recently
created dinner that used it. Nothing ever changes an aisle the cook picked or an import supplied.

### What the code shows

- `DraftIngredient.category` is a required `IngredientCategory`, and `createIngredientLine()` sets
  it to `'Produce'` (`draft.ts:43`, `:71`). The draft is an interface shared by manual entry,
  import (`parse.ts`), scaling (`scale.ts`, which spreads each line) and save (`api.ts`).
- `validateDraft` already rejects a category outside the five (`draft.ts:187`), with the message
  "Pick which part of the store this comes from." The editor never shows it, because the `Select`
  has no `FormControl` or error slot and a value outside the five can't be chosen today.
- The entry page's `useDinners()` loads **active** dinners only (`fetchActiveDinners`). A dinner
  marked "Not interested" still holds aisles the household chose, so the history needs its own read.
- `nameKey` (`shopping-list/reorder.ts`) is the trim-and-lowercase rule shared with `items.name_key`.
  Matching reuses it rather than making a third copy.
- Saving invalidates `['dinners']`, so a history query keyed under it refreshes after every save
  for free.

### Deliverables

1. **Draft contract** (`draft.ts`)
   - `category: IngredientCategory | null`
   - New `categorySource: 'unset' | 'history' | 'chosen'`. A plain string keeps the draft
     serializable, as its doc comment requires.
   - `createIngredientLine()` returns `category: null, categorySource: 'unset'`.
   - `validateDraft`: a `null` category gives `ingredients.<id>.category` → **"Choose an aisle"**.
     A non-null value outside the five keeps the existing message.
2. **Aisle history, pure** (`draft.ts`, beside the other draft rules)
   - `buildAisleHistory(rows)`: turns rows of name, category and dinner creation time into a map
     from name key to aisle. The most recently created dinner wins, and rows whose category isn't
     one of the five are ignored.
   - `renameIngredientLine(line, name, history)`: sets the name. If `categorySource` is `'chosen'`,
     nothing else changes. Otherwise a hit sets the category and `'history'`, and a miss sets `null`
     and `'unset'`.
   - `chooseAisle(line, category)`: sets the category and `'chosen'`.
3. **Import** (`parse.ts`): every extracted line is `categorySource: 'chosen'`, so history never
   touches an imported aisle.
4. **Read** (`recipe-entry/api.ts`): `fetchAisleHistory()` selects `name, category, dinners(created_at)`
   from `dinner_ingredients` under existing RLS, returning flat rows. No schema change (NFR-1).
5. **Hook** (`recipe-entry/hooks.ts`): `useAisleHistory()`, key `['dinners', 'aisle-history']`,
   `select` → `buildAisleHistory`, `refetchOnWindowFocus: false`.
6. **Save** (`api.ts`): `createDinner` sends `line.category`. The type is now nullable, and
   `validateDraft` has already refused a `null`, so a `null` here throws a plain error rather than
   sending a guess. This is the same stance as the existing `?? 0` comment, but a category has no
   honest default.
7. **Editor** (`IngredientLinesEditor.tsx`)
   - New required prop `aisleHistory: ReadonlyMap<string, IngredientCategory>`, passed in like
     `servingsPerDinner` so the editor stays presentational.
   - Name `onChange` → `renameIngredientLine`; `Select` `onChange` → `chooseAisle`.
   - The `Select` gets a first `<option value="" disabled>Choose aisle</option>` and `value={line.category ?? ''}`.
     Disabled means it can't be re-chosen once a real aisle is picked.
   - The `Select` is wrapped in `FormControl isInvalid` with a `FormErrorMessage`, like quantity and
     name, so "Choose an aisle" shows on the line and Chakra links it to the control (NFR-3).
8. **Page** (`RecipeEntryPage.tsx`): `useAisleHistory()`, passing `data` (or an empty map while
   loading) to the editor.

### Dependencies

- `nameKey` from `@/features/shopping-list/reorder`.
- The existing `dinner_ingredients` and `dinners` SELECT policies. No new policy, table or function.
- None on other bolts. Bolt 073 is merged; this bolt touches different files.

### Technical Approach

- **Where the rules live**: `renameIngredientLine` and `chooseAisle` are pure and sit in `draft.ts`,
  so every rule in story 002 is testable without rendering, like `validateDraft`. The editor only
  calls them.
- **History arriving late**: the fill happens when the name changes. If a cook types a name before
  the history query resolves, that line stays "Choose aisle" and the cook picks one. This fails
  safe, into FR-2, rather than filling silently later. The query is small and usually resolves
  before the first keystroke.
- **Requests** (NFR-2): one query per form open. Typing only reads the in-memory map, and window
  refocus doesn't refetch.
- **Scaling**: `scaleDraft` spreads each line, so `categorySource` survives scaling and undo. Picking
  an aisle already counts as an ingredient edit and ends scale-undo; that is unchanged.
- **Save payload**: unchanged in shape. `categorySource` is client-only and never sent.

### Acceptance Criteria

- [ ] A new manual line shows "Choose aisle", not Produce
- [ ] Saving with an unset aisle writes nothing and shows "Choose an aisle" on that line, linked to
      its control
- [ ] With every aisle set, save sends the same payload as today, with no `categorySource`
- [ ] The "Choose aisle" option can't be re-selected once an aisle is chosen
- [ ] A name matching a saved ingredient (trimmed, case-insensitive) fills that ingredient's aisle
      from the most recently created dinner, including a dinner marked "Not interested"
- [ ] An aisle the cook picked is never changed by a later name change
- [ ] A history-filled aisle follows the name: it refills on another match, and returns to "Choose
      aisle" on no match
- [ ] "chicken thighs, cubed" does not match "chicken thighs"
- [ ] Imported lines keep their extracted aisle, and a name edit doesn't change it
- [ ] History is fetched once per form open; typing a 20-character name makes no further requests
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
