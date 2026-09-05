# Grocery Store Configuration — Revised Spec

## Purpose

Let a user describe the walking path of a grocery store so that generated shopping lists can be sorted in the order they'll actually walk it.

This is a convenience feature for list sorting. It is set up occasionally, at a desk, by someone who already knows the store — it is not an in-store tool operated one-handed in an aisle. Every interaction below should be judged against that: a slightly slower flow with fewer wrong guesses beats a fast flow that requires correction.

**Non-goals for v1:** multi-store UI, drag-and-drop reordering, inline item/category creation, in-aisle capture.

---

## Decisions (settled — do not re-open)

1. A Store is a fully independent configuration with its own ordered set of Locations. Stores do not share a location vocabulary.
2. There is an active-store concept, selected on this page. v1 ships with exactly one store; the selector is hidden or read-only until v2.
3. **Multi-store is v2, but the schema for it lands now.** v2 should be UI work only, with no migration.
4. Similarity suggestions never look across stores.
5. Reordering uses up/down arrow buttons. Position is stored as a sortable integer so drag-and-drop can replace the arrows later as a pure UI change.
6. Suggestions never auto-assign. Every placement requires an explicit user confirmation.

---

## Data model

```
stores            id, user_id, name, is_active, created_at
                  UNIQUE (id, user_id)

locations         id, store_id, name, type ('section' | 'aisle'), position int
                  UNIQUE (id, store_id)          -- enables the composite FK below
                  ordered by (store_id, position)

items             (existing catalog row) id, user_id, name, category_id nullable
                  -- no location column; placement lives in its own table

item_placements   id, item_id, store_id, location_id
                  UNIQUE (item_id, store_id)     -- one placement per item per store
                  FK (location_id, store_id) -> locations (id, store_id)

category_placements   id, category_id, store_id, location_id
                  UNIQUE (category_id, store_id)
                  FK (location_id, store_id) -> locations (id, store_id)

suggestion_dismissals  id, item_id, suggested_item_id, store_id
```

The denormalized `store_id` on the placement tables plus the composite foreign key is what prevents an item from being placed in a location belonging to a different store. Enforce it in the schema rather than in application code.

`position` values should be spaced (10, 20, 30…) so a reorder is a single-row update rather than a renumber of the whole list.

### Location resolution for list sorting

For each item on a shopping list, resolve in this order:

1. Explicit `item_placement` for the active store → use it.
2. Otherwise, `category_placement` for the item's category in the active store → use it (**inherited**).
3. Otherwise → **unassigned**.

Unassigned items sort after the ordered path, alphabetically (existing behavior, preserved).

### Migration from the current page

- Existing "Rows" become `locations` under a single seeded store. Infer `type` from the name (matches `Aisle \d+` → aisle, else section); anything ambiguous defaults to section and is user-editable.
- Existing "Category Assignments" become `category_placements` for that store.
- No `item_placements` are created. On day one every item inherits its category's location, so sorting works immediately and the user's existing setup is not thrown away.

---

## The three placement states

The UI must distinguish all three, because the user needs to know why an item sorted where it did and whether an override is possible.

| State      | Meaning                                | Treatment                                                                     |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Placed     | Explicit `item_placement`              | Normal, with the location shown                                               |
| Inherited  | Falls back to its category's placement | Visibly softer than placed (muted text, "via Dairy"), with a one-tap override |
| Unassigned | No placement at either level           | Neutral, never red or warning-styled — this is a normal state                 |

---

## Similarity suggestions

**Trigger:** the user opens the assign control on an item that has no explicit placement. Not proactive interruption — the suggestion appears inside the assign flow the user already started.

**Algorithm (v1, deliberately simple):**

1. Normalize the item name: lowercase, strip punctuation, crude singularization, drop stopwords (`organic`, `fresh`, `low fat`, `canned`, etc. — keep this list in one editable constant).
2. Compare tokens against items that have an **explicit** placement in the active store. Inherited placements are not evidence and must not seed suggestions.
3. Score by shared-token overlap, weighting rarer tokens higher (a shared "beans" is weaker evidence than a shared "tahini"). Same category adds a small bonus, never enough to carry a match on its own.
4. Suppress any pairing present in `suggestion_dismissals`.
5. Show up to three candidates above a confidence cutoff, each as _"pinto beans is in Aisle 2"_ with a single accept action. If nothing clears the cutoff, show the plain location picker with no suggestion.

**Tune for precision, not recall.** A missed suggestion costs the user a two-tap manual pick. A confident wrong suggestion that gets accepted puts an item in the wrong aisle silently and costs trust in the whole feature. Known false-friend families to test against: _beans_ (green vs. black), _cream_ (heavy / sour / ice / of tartar), _milk_ (dairy vs. coconut vs. oat), _oil_, _sauce_, _chips_.

**Conflicts:** if similar items sit in different locations, show them all with their locations. Never pick a winner on the user's behalf.

**Dismissals:** recording a rejected pairing is cheap and stops the same bad suggestion recurring forever.

---

## Page structure

A single ordered list, not two panels. The current side-by-side layout is what makes the model read as duplicated data; one list removes the problem rather than relabeling it.

**The walking path (primary):** one row per Location in path order. Each row carries:

- A type indicator that distinguishes aisle from section without implying hierarchy — e.g. a numeric chip for aisles, an icon or label for sections. Same indentation, same visual weight, same row height. They are peers in one path.
- The location name.
- Up/down arrows (disabled at the ends of the list).
- A count of items placed or inherited there.
- Expand/collapse. Collapsed by default, showing the first few item names inline and "+ 12 more" — a Bakery with thirty items must not blow out the row.

**Unassigned (secondary):** a collapsed section at the bottom of the same column, with a count and a search box. Neutral styling.

Default scope: items used in at least one recipe. The full catalog is reachable through search but is not the default population — a 400-item unassigned bucket is a list nobody will ever work through, which undercuts the "this is normal, not an error" framing.

**Extension points to leave in place:**

- A trailing slot in each item row for a future inline rename/edit control.
- A drag handle region at the leading edge of each Location row, currently unused, so adding drag-and-drop later doesn't reflow the row.

---

## Open questions with chosen defaults

Each of these has a working default so implementation isn't blocked. Only the first changes the schema.

| Question                                                      | Default                                                                                                                                                                                    | If reversed                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Does category-level placement survive as a fallback?**      | **Yes.** Categories keep their location assignment as a default that item-level placement overrides. This is what makes migration a non-event and gives a usable sort with zero user work. | Drop `category_placements`; every item must be placed individually. Decide before the schema lands. |
| Inline creation/renaming of items and categories on this page | No — stays on the Catalog page. This page only assigns locations. (This was the original open question for Chandler.)                                                                      | Layout already reserves the row slot; no schema change.                                             |
| Unassigned bucket scope                                       | Items used in ≥1 recipe, with search reaching the full catalog                                                                                                                             | Config flag, no schema change.                                                                      |
| Deleting a Location that has items                            | Allowed. Null the affected placements and warn with a count first; items fall back to category, then to unassigned.                                                                        | —                                                                                                   |
| Aisle naming                                                  | `name` is free text, so "Aisle 4 — Baking & Spices" works. `type` drives display only; no separate numeric field.                                                                          | —                                                                                                   |
| Recipe ingredients with no matching catalog item              | Sort to unassigned. Do not auto-create catalog items.                                                                                                                                      | —                                                                                                   |

---

## Acceptance criteria

- Sections and aisles appear in one ordered list; reordering either type moves it within that single sequence.
- Many items can point at one location; a location with 20+ items stays readable.
- An item with no placement produces no validation error anywhere in the flow.
- A shopping list sorts by path position, with unassigned items last, alphabetically.
- Assigning an item that resembles an already-placed item offers that item's location in one action, and does nothing until the user confirms.
- A dismissed suggestion does not reappear for the same pairing.
- Deleting a location does not orphan or hard-delete any item.
- Adding a second store in v2 requires no migration.

---

## Visual direction

Appended after the fact; nothing above this line changes. This section covers appearance and interaction texture only — the model, the algorithm, and the settled decisions above are the authority on behavior. Reference implementation: `Store Setup — Design Direction.dc.html` (panel 2a is interactive).

Everything here uses tokens already defined in `src/shared/theme/index.ts`. No new colors, type sizes, or radii are introduced.

### Tone

This page is read, not operated. The user is at a desk describing a store she already knows, so the page should feel like annotating a list rather than filling in a form. Two consequences: nothing on the page is styled as an error or a warning except the one destructive confirm, and no state announces its own absence — a missing suggestion, an empty location, and a fresh install each simply render less, rather than rendering an explanation of what is missing.

Copy avoids the vocabulary of the data model. The page title is "Walking path", the unassigned bucket is "Not on the path yet", and a location is a "stop". "Placement", "assignment", "inherited", and "unassigned" are implementation words and should not appear in the interface.

### Aisles and sections as peers

The settled decision that aisles and sections are peers in one sequence has to be visible, and it is carried by a single element: a fixed-size chip at the leading edge of every location row, `radii.control`-scale, roughly 28×26. For an aisle it holds the number parsed from the name, on `brand.100` in `brand.500`. For a section it holds a small four-square glyph on `paper.sunken` with a `line.DEFAULT` border in `ink.400`. Same box, same position, same row height, same name typography (Lora 500 at `md`), same indentation. The chip communicates kind and nothing else — no differing background for the row, no nesting, no separate grouping.

Because `name` is free text and `type` drives display only, the number in the chip is read from the name and is never a second editable field. A row whose name has no parseable number renders as a section chip.

### The three placement states

The spec's table defines the semantics; these are the treatments. All three are the same pill shape at the trailing edge of an item row, differing only in border and fill, and the difference should read as _who decided this_ rather than _how good this is_:

- **Placed** — solid `line.brand` border on `paper.base`, `brand.500` text, small check glyph, reading "Placed here". A decision the user made.
- **Inherited** — dashed `line.DEFAULT` border, no fill, `ink.500` text, reading "via Bakery". Visibly softer, and the category name is spelled out so the fallback chain is legible without a legend.
- **Not placed** — flat `paper.sunken` fill, no border, `ink.400` text, reading "Not placed".

The whole pill is the tap target that opens the assign flow, so an override is always one tap from wherever the item is visible. No red, no amber, no icon that implies a problem. Terracotta (`heart.*`) appears nowhere in this set.

### Location rows

Collapsed by default. Each row is a `paper.base` card with a `line.subtle` border at `radii.card`, holding, in order: an empty leading column of 12–14px, the type chip, the name, a one-line item preview in `ink.500` at `meta` size, a count chip, up/down arrows, and a chevron.

The item preview is the mechanism that keeps a thirty-item Bakery readable — the first three names, comma-joined, clipped with an ellipsis, never wrapping. It is the reason a row does not need to be expanded to be recognized. A location with nothing pointing at it reads "Nothing here yet" in the same slot, which is a statement rather than a prompt.

Expanding reveals item rows on a `paper.subtle` ground, separated from the header by a `line.subtle` rule and inset past the chip so the item names hang under the location name. Cap at four rows plus a quiet "+ N more" link. Expanded state is local UI state and does not persist.

The arrows are 34×32 outline buttons at the row's trailing edge, ~2px apart, `ink.400` on transparent. At the ends of the list the relevant arrow renders disabled — `line.subtle` border, `ink` at the disabled step, default cursor — rather than disappearing, so the row's geometry is stable as it moves. Each needs an aria-label naming the stop and the direction ("Move Bakery earlier"); the icon alone is not sufficient. Arrows stop propagation so pressing one does not also toggle the row open. Position is the sortable integer from the data model, so the visual result of an arrow press is two rows swapping with no renumbering.

The leading 12–14px column is empty in v1 and load-bearing in the layout: it is the drag-handle region the spec reserves, and because it already occupies space, adding drag later changes no other measurement in the row.

### Adding a stop

An inline dashed-border row at the end of the list, full width, 44px tall, `line.DEFAULT` dashed at `radii.card`, `brand.500` text, reading "Add an aisle or section". Not a modal and not a wizard. It appends at the end of the path because that is where a remembered stop usually belongs, and the arrows move it from there.

### Editing and removing a stop

Rename happens in place: the name becomes a text field with the olive focus ring already defined in `styles.global`, and a Save / Cancel pair appears below it, aligned past the chip, with a quiet "Remove" pushed to the trailing edge in `heart.700` text. No separate edit screen. The type chip stays visible and unedited during rename, reinforcing that the number lives in the name.

Removing a stop that has items is the one destructive confirm on the page, and the one place `heart.*` is used: a `heart.50` panel with a `heart.200` border, a warning glyph in `heart.700`, a Lora heading naming the stop, and body copy stating the count and the consequence in the user's terms — "6 groceries point here. They'll fall back to their category, or to the end of the list if the category has no spot. Nothing is deleted." Then a two-button row: "Keep it" outlined in `heart.200`, "Remove" filled `heart.500`.

That filled terracotta button is the only filled `heart.500` in the application, which is deliberate and worth protecting — it is what makes the treatment legible as _this changes where things live_. Style it at the call site rather than adding a `danger` variant to the theme; a second one anywhere should reopen the decision properly. Removing an empty stop needs no confirm.

### Assign flow

A bottom sheet, opened from any placement pill or from a "Place" button in the unassigned section. Sheet on `paper.base`, top corners at `radii.card`-scale, a small `line.DEFAULT` grab bar, scrim at `rgba(35,32,25,0.32)`.

Header: an eyebrow "Where do you find it", the item name in Lora, and one line of current state in `ink.500` — "Dairy · not placed", "Produce · placed in Aisle 1 — Produce & Flowers", or "Bakery · following Bakery to Bakery". That line is where the resolution chain becomes visible, so it should name the mechanism in plain words rather than showing a badge.

Suggestions, when any clear the cutoff, sit above the picker in a `brand.50` block with a `line.brandSubtle` border, under the heading "You put something like it here" — phrasing that credits the user's own past decision, which is what the evidence actually is. Each candidate is a `paper.base` card with a `line.brand` border carrying the matched item name in lowercase, its location beneath in `ink.500`, a filled `brand.500` "Same spot" action, and an outline × that records the dismissal. Nothing is pre-selected and nothing is auto-applied.

Conflicts render as two or three sibling cards with identical weight and no ranking language — no "best match", no percentages, no ordering cue. The picker below stays available in every case.

When nothing clears the cutoff the suggestion block is simply not rendered and the picker heading changes from "Or pick a spot" to "Pick a spot". No empty state, no "no suggestions found" copy: the flow has one shape whether or not the algorithm found anything, so a precision-tuned algorithm that stays quiet costs the user nothing but two taps.

The picker is the full path in order, each row carrying the same type chip as the main list so the two views are recognizably the same sequence. The current location, if any, gets a `line.brand` border and a check. An item with an explicit placement also gets "Take it off the path" at the bottom — an outline button in `ink.400`, which clears the `item_placement` and lets the item fall back to its category.

### Not on the path yet

Titled "Not on the path yet", collapsed, in the same column below the path with a clear margin above it. Header carries a count chip on `paper.sunken` and a subtitle stating the consequence rather than the condition: "4 groceries sort to the end". Neutral throughout — this section is the normal resting place for items the user has no opinion about.

Expanded, it opens with a search field on `paper.base` with a `line.DEFAULT` border at `radii.control`, placeholder "Search all groceries" — the field is what reaches past the default scope into the full catalog. Below it, item cards with the name and its category in `ink.300`, and a filled `brand.500` "Place" button.

Two empty states, both plain: with no search term, "Everything has a spot on the path."; with a term that matches nothing, the term quoted back.

### First run

No stops configured is a normal state, not an onboarding moment. A single dashed-border panel on `paper.subtle`: a `brand.100` rounded icon tile with the storefront glyph, a Lora heading "Start where you start", and body copy that gives the user a way in rather than instructions — "Add the first place you walk into at Metro Market — usually produce or the bakery. Add the rest as you remember them; order can change any time." One filled `brand.500` action, "Add the first stop", and a closing line in `ink.300`: "Until then, lists stay in alphabetical order." That last line matters more than the rest: it tells her nothing is broken while the path is empty.

### Desktop

Single column at a 600–720px measure inside the persistent left rail. The extra width goes to two places: the item preview moves onto the same line as the location name, and the expanded item area gets a wider inset. Nothing becomes a second panel.

This supersedes the earlier desktop guidance for this page ("rows beside assignments"), which described the two-panel layout the revised spec's one-list decision removes. The walking path is a sequence read top to bottom, and that is true at every width.

### Motion

None. No transition on expand, no animation on reorder, no slide on the sheet beyond the platform default. The theme has almost no shadow and no motion vocabulary; introducing one here would make this page the loudest surface in the app.

### Accessibility

- Every arrow, pill, and icon button has an aria-label naming its object and effect.
- Arrow keys are not repurposed; the arrow buttons are ordinary buttons in tab order.
- Reordering announces the result politely — "Bakery moved to position 2".
- The assign sheet traps focus, closes on Escape, and returns focus to the pill that opened it.
- Placement state is never conveyed by border style alone; each pill carries text.
- All controls are ≥32px, in rows ≥44px.

### v2 slots

Two items in this area are v1 non-goals and are noted here only so the layout accommodates them without rework.

**Store list, add, edit, delete.** v1 renders the active store as a read-only chip beside the page title — storefront glyph, name, `line.DEFAULT` border, no affordance. In v2 that chip becomes the store selector, opening a menu with the store list, "Add a store", and per-store rename/delete. The chip is deliberately sized and positioned as a control now, so the v2 change is behavioral rather than structural, matching the spec's "v2 is UI work only" requirement.

**Drag to reorder.** The reserved leading column is where the handle goes, at `ink.300`-weight, appearing on hover on desktop and always present on touch. When it lands, the arrows should stay — they are the accessible path and the reliable one on a phone, and drag is the addition, not the replacement.
