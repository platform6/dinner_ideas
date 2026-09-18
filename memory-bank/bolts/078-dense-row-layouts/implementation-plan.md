---
stage: plan
bolt: 078-dense-row-layouts
created: '2026-09-18T14:34:05Z'
---

## Implementation Plan: dense-row-layouts

### Objective

Two rows stop crowding what the user came for: the cooking-step row, where a destructive button
sits between two harmless ones, and the Store setup row, where four controls squeeze the aisle name.

### What the code shows

**`CookingStepsEditor.tsx:63-115`** — each step is an `HStack`: a number, the textarea, then a
vertical `Stack` of three `size="xs"` icon buttons in the order **up, down, remove**. `xs` has no
theme entry, so all three are Chakra's 24px, which bolt 077 deliberately left alone.

**`LocationRow.tsx:96-173`** — one `HStack`: a 13px drag-handle placeholder, a type chip, then
either a rename `Input` or a `Stack` with the name and item preview (both `noOfLines={1}`, so the
name is what gives way), then a group holding the item count, three icon buttons and the
expand/collapse chevron. The whole row has an `onClick` that toggles expansion, and the action group
stops that click from firing. Bolt 077 already took those three buttons to 44px on a phone, which
squeezes the name further.

### Deliverables

1. **Step row** (`CookingStepsEditor.tsx`)
   - The three buttons become `size="sm"`: 44px on a phone, 34px from `md` up (bolt 077's sizes).
   - **On a phone** the controls move below the textarea, in one row: **up and down on the left,
     remove on the right**, with the gap between them doing the separating.
   - **At `md`+** the controls stay where they are, to the right of the textarea, in today's
     vertical stack — only bigger (24px → 34px).
   - The remove button keeps its `Remove step N` label and its behaviour.
2. **Store setup row** (`LocationRow.tsx`)
   - The outer row becomes a stack that is a **column on a phone** and today's row from `md` up.
   - On a phone, the first line is the chip plus the name and preview, full width; the second line
     holds the count, the three buttons and the chevron, aligned right.
   - `noOfLines={1}` stays on the preview. **The name loses it on a phone**, so a long aisle name
     wraps instead of being cut.
   - The row's tap-to-expand and the action group's `stopPropagation` are untouched.
3. **Tests** (Stage 3): the step row's order and labels, that remove is not between the arrows, and
   the Store setup row's structure at both widths; plus the existing behaviour, which must not move.
4. **Browser check** (Stage 3) at phone width and 1018px: both screens, including a long aisle name
   and renaming in place.

### Dependencies

- **Bolt 077** (complete): its `sm` size is what these rows inherit.
- No new package, no data, no schema (NFR-1).

### Technical Approach

- **Responsive style props, not `useBreakpointValue`.** Both rows keep one DOM tree and let CSS
  choose the arrangement, so there is no flash on first paint and the tests see one structure.
- **The step row's phone layout** is a `Stack` per step: textarea, then an action row with
  `justify="space-between"` — up/down in a group on the left, remove alone on the right. At `md`+
  the same markup goes back to a side-by-side row with a vertical control stack, through
  `direction` and `justify` responsive values.
- **The Store setup row** already groups its right-hand controls, so making the outer container a
  responsive `Stack` and letting that group align right on a phone gets there without duplicating
  markup. The count and chevron travel with the buttons, which keeps the first line to the name.
- **Why the name drops `noOfLines` only on a phone**: at `md`+ the row is horizontal and a wrapping
  name would change desktop row heights — NFR-2 says desktop does not move.

### One deliberate deviation from NFR-2

The step buttons grow from 24px to **34px at `md`+** as well, because `xs` has no theme entry and
the honest fix is to stop using a size the theme never defined. Desktop step rows get slightly
taller. The alternative — a theme `xs` of 44px on a phone and 24px above — keeps desktop identical
but preserves a size nothing else in the app uses. **Resolved at the Stage 1 checkpoint (2026-09-18): let desktop grow to 34px.** The app stops using
a size the theme never defined; desktop step rows get about 10px taller per step.

### Acceptance Criteria

- [ ] Phone: the step row's up, down and remove are each at least 44×44, with remove separated from
      the pair by position
- [ ] Phone: a long aisle name is not cut short; the preview keeps one line
- [ ] Phone: the Store setup row's count, three buttons and chevron sit on their own line
- [ ] Tapping a Store setup row still expands it; tapping a button still does not
- [ ] Renaming in place still works: input, Save, Cancel, Remove
- [ ] Removing a step still renumbers with no gap, and its label still names the step
- [ ] `md`+: both rows keep today's arrangement (step buttons 34px rather than 24px, by the
      deviation above)
- [ ] Browser check at phone width and 1018px on both screens
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
