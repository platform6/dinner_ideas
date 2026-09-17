---
intent: 019-ui-correctness-fixes
phase: inception
status: units-defined
updated: '2026-09-17T16:01:11Z'
---

# Units: UI Correctness Fixes

## Decomposition Principle

Split by how each fix can go wrong. Two are copy that a rendered-text test pins down. One changes
the entry form's draft contract and adds a rule about who set a value. One is layout. They share no
code, so none waits on another.

## Unit Summary

| Unit                           | Name                     | Requirements                             | Depends on | Cuttable |
| ------------------------------ | ------------------------ | ---------------------------------------- | ---------- | -------- |
| `001-copy-corrections`         | Copy Corrections         | FR-1, FR-5                               | none       | No       |
| `002-ingredient-aisle-default` | Ingredient Aisle Default | FR-2, FR-3, NFR-2, NFR-3 (errors, fills) | none       | No       |
| `003-expanded-card-layout`     | Expanded Card Layout     | FR-4, NFR-3 (reading order)              | none       | **Yes**  |
| `004-mobile-overlap-fixes`     | Mobile Overlap Fixes     | FR-6, FR-7                               | none       | **Yes**  |

NFR-1 (no schema change) applies to every unit.

## Unit 001: Copy Corrections

**Owns**: the two stale count strings on `/plan`, the stale doc comments in `DinnerCard.tsx`, and
the catalog button's wording.

**Why together**: both are "a string that disagrees with the rest of the app", both are fixed by
changing copy, and both are guarded the same way, by asserting on rendered text rather than source.
Intent 018's story 003 is the template.

## Unit 002: Ingredient Aisle Default

**Owns**: the draft line's aisle becoming optional until chosen, the save-time error, the household
aisle-history read, and the rule that decides when a filled aisle may change.

**Why it is the centre of this intent**: it is the only fix that changes a contract. `draft.ts`
calls its shape an interface shared by manual entry and import (`draft.ts:7`), and `category` is
currently a required `IngredientCategory`. It also introduces **provenance**: a line has to know
whether its aisle was chosen (by the cook, or by an import) or filled from history, because only the
latter may follow a name change.

**The risk it carries**: overwriting a choice. The acceptance criteria that matter most are the
negative ones: nothing ever changes a chosen aisle.

## Unit 003: Expanded Card Layout

**Owns**: how an expanded catalog card sits in the `SimpleGrid`.

**Why cuttable**: FR-4 is `Should`. The grid looks wrong today, but no data is wrong.

**The risk it carries**: `isExpanded` is local state inside `DinnerCard` (`DinnerCard.tsx:234`),
while the column span belongs to the grid item. Where that state lives is this unit's design
question.

## Unit 004: Mobile Overlap Fixes

**Owns**: two places where one piece of UI sits on top of another on a phone: the shopping list's
sticky footer, and the catalog card's action menu over its title.

**Why a unit of its own**: added after Checkpoint 3 from the mobile review. Neither fix touches the
other units' files, and both need verifying at phone width in the running app, not in jsdom.

**Why cuttable**: both are `Should`. Nothing is lost or wrong, only obscured.

## Requirement-to-Unit Mapping

- **FR-1**: plan copy reads the dinner count → `001-copy-corrections`
- **FR-2**: no default aisle → `002-ingredient-aisle-default`
- **FR-3**: aisle from household history → `002-ingredient-aisle-default`
- **FR-4**: expanded card spans its row → `003-expanded-card-layout`
- **FR-5**: one name for adding a dinner → `001-copy-corrections`
- **FR-6**: phone footer never hides content for good → `004-mobile-overlap-fixes`
- **FR-7**: card menu never covers the title → `004-mobile-overlap-fixes`
- **NFR-1**: no schema change → all units
- **NFR-2**: no query per keystroke → `002-ingredient-aisle-default`
- **NFR-3**: accessibility → `002` (error announcement, silent fill), `003` (reading order)
