---
intent: 018-serving-scale-and-removal
phase: inception
status: complete
created: '2026-09-11T16:24:16Z'
updated: '2026-09-11T16:24:16Z'
---

# Requirements: Scaling is the family's choice, and a dinner can be removed

## Intent Overview

Found in production use on release day, 2026-09-11, by importing a real recipe.

The source — Mel's Kitchen Cafe, salted chocolate toffee pretzel bark — states **8–10 servings**
and **1 cup (227 g) butter**. It landed in the catalog as **0.33 cup butter** and **2.67 oz
pretzels**.

Nothing malfunctioned. `prompt.ts` instructs _"Quantities are for 3 servings… If the source states
a serving count, rescale every quantity to 3"_, the model took ~9 servings, and ⅓ of a cup is
0.33. The extraction did exactly what it was told.

**The rule is what is wrong.** The 3-serving convention was written for dinners — two adults and a
small child, portioned per person. A bark is a tray: you make the tray and cut it up. "Three
servings of bark" is not a thing anyone makes, and a third of a cup of butter is both awkward to
measure and not what the cook wanted. The same applies to anything made as a batch rather than
plated per person — cookies, bread, granola, a jar of sauce.

### Two problems surfaced together

**1. Scaling is applied without being asked for.** It is silent, unconditional, and performed by a
language model doing arithmetic.

**2. A saved dinner cannot be removed or corrected.** `/dinners/new` is the only write route; the
catalog card menu offers only "Not interested", which sets `is_active = false`. So the bark sits in
the catalog with wrong quantities and there is no way to take it out. **Release v0.14.0 made the
catalog writable but not un-writable**, and that asymmetry is only visible once something wrong has
been written.

## Decisions taken at Checkpoint 1 (2026-09-11)

| Question             | Decision                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| Scope                | Scaling control + household setting + **delete**. Full editing is NOT in scope |
| The control          | A toggle: scale to the household's serving size                                |
| When it applies      | **Keep as written on import; offer "scale to household size" on review**       |
| Reach of the setting | Replaces the hardcoded "3 servings" **everywhere** it appears                  |

### The third decision changes the architecture, for the better

Scaling was going to be a switch on the import. Putting it **on review instead** moves the
arithmetic out of the model and into code.

Today the model is asked to divide every quantity by a ratio it also has to infer. That is a
language model doing arithmetic on numbers that end up in a shopping list. It happened to be
correct on the pages tested — x0.375 and x0.5 both exact — but it is the wrong place for the work:
it cannot be unit-tested, it cannot be undone, and the user never sees the original.

Under this intent the model reports **what the page says**, including the serving count it states,
and the app does the multiplication — deterministic, testable, reversible, and visible before and
after. **Extraction stops doing arithmetic altogether.**

---

## Functional Requirements

### FR-1 — The household's serving size is a setting

`households` gains a serving-size value, editable on `/settings`, defaulting to **3** so existing
behaviour is preserved for anyone who never touches it. Same shape as `dinners_per_week`
(intent 015): a column with a check constraint, a Settings control, and the rest of the app
reading it rather than a literal.

### FR-2 — Extraction reports, it does not rescale

The extraction returns the source's quantities **exactly as written**, plus the serving count the
source states, if any. The prompt's rescaling instruction is removed.

- **Given** a page stating "8–10 servings", **When** extracted, **Then** the draft carries the
  source's own quantities and records the serving count **as the page stated it** — the range is
  not resolved to a number by the model or the app
- **Given** a page stating no serving count, **When** extracted, **Then** quantities are as written
  and the draft records that no count was given

### FR-3 — Scaling is offered on review, and is the user's choice

On the review form, where an imported draft lands, the user can scale the ingredient quantities to
the household's serving size.

- **Given** a draft whose source stated a serving count, **When** reviewing, **Then** a control
  offers to scale from that count to the household's size, naming both numbers
- **Given** the user applies scaling, **When** it runs, **Then** every ingredient quantity is
  multiplied in **code**, not by a model
- **Given** the user applies scaling, **When** they change their mind, **Then** it can be undone
  without re-importing
- **Given** a draft whose source stated a **range**, **When** the user chooses to scale, **Then**
  they supply the base to scale from; the app does not pick a number out of the range
- **Given** a draft whose source stated **no** serving count, **When** reviewing, **Then** scaling
  cannot be offered from an unknown base, and the form says so rather than guessing

### FR-4 — Nothing is scaled without being asked

- **Given** any import, **When** the draft lands, **Then** quantities are the source's until the
  user says otherwise
- **Given** the user saves without touching the control, **When** saved, **Then** the source's
  quantities are what is stored

### FR-5 — A dinner can be removed

- **Given** a dinner in the catalog, **When** the user chooses to remove it, **Then** it is deleted
  along with its ingredients, steps and tag links
- **Given** a removal, **When** requested, **Then** the user confirms first — this is not undoable
- **Given** a dinner that has been **cooked** (it appears in meal history) or is **picked in a
  plan**, **When** removal is requested, **Then** the user is told what else it affects and may
  proceed — warn, do not refuse (Checkpoint 2 decision)
- **Given** a removal, **When** it completes, **Then** the name becomes reusable, so a corrected
  version can be re-imported under the same name

### FR-6 — "3 servings" stops being a literal

Every place the number appears reads the household setting: the extraction prompt, the
manual-entry form's guidance under Ingredients, and anywhere else a grep finds it.

- **Given** a household that sets its serving size to 5, **When** using the app, **Then** no screen
  and no prompt still says 3

---

## Non-Functional Requirements

### NFR-1 — Existing catalog data is untouched

Dinners already saved keep the quantities they were saved with. This intent changes what happens
next, not what happened before. **The bark's quantities are not silently corrected by a migration**
— it is fixed by the user, through FR-5, or left alone.

### NFR-2 — Scaling is exact and inspectable

Arithmetic happens in code with tests, on numbers the user can see before and after.

### NFR-3 — Removal is enforced by the database

Deleting a dinner must not leave orphaned ingredients, steps or tag links. Whether that is
`on delete cascade` or an RPC is a design decision for Construction; that it is atomic is a
requirement, the same standard ADR-13 set for the write.

---

## Out of Scope

- **Full editing of a saved dinner.** Explicitly deferred at Checkpoint 1. Removal plus re-import
  is the correction path for now; a proper edit form is a later intent
- Scaling by anything other than servings (no "half this recipe" control)
- Changing `claude-proxy`, its limits or its contract
- Revisiting `dinners_per_week`, which is a different number about a different thing
- Retroactively rescaling anything already in the catalog

## Questions resolved at Checkpoint 2 (2026-09-11)

**1. A ranged serving count is carried as stated, not resolved.** "8–10 servings" is recorded the
way the page wrote it and shown to the user. Neither the model nor the app picks a number out of
it. Where the user chooses to scale from a range, they supply the base they want to scale from —
the app does not guess on their behalf, because there is no correct guess and the wrong one is
invisible once it is a quantity.

**2. Removal warns and proceeds.** A dinner that has been cooked, or is picked in a plan, can still
be removed; the user is told what else it affects, and decides. Refusing would leave a wrong recipe
permanently in the catalog the first time anybody cooked it, which is the trap this intent exists
to get out of.

**3. The household-versus-dish tension is resolved by the DEFAULT, not by the setting.** The
concern was real: a tray bake has its own natural yield that no household number should override.
It does not bite, because **nothing is scaled unless the user asks** (FR-4). A bark imports with
the source's own quantities and the user simply does not press the button. The household setting is
the _target offered_ when scaling is wanted — never a rule applied on the app's initiative.

That is the whole reason "keep as written, offer on review" is a better design than a switch at
import time, and it is worth stating plainly so that a future change does not quietly reintroduce
automatic scaling for convenience.
