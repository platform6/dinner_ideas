---
stage: plan
bolt: 058-shopping-list-move
created: '2026-09-07T00:20:00Z'
---

## Implementation Plan: 003-shopping-list-move

### Objective

Add a second entry point to unit 002's existing move flow, on the shopping list, so a wrong stop
can be fixed where it is noticed. No new placement mechanism, no new sort logic, no change to how
the list groups or aggregates.

---

### What already exists (nothing here is new work)

| Piece                                    | Where                                     | Reused how                        |
| ---------------------------------------- | ----------------------------------------- | --------------------------------- |
| `AssignSheet`                            | `store-config/components/AssignSheet.tsx` | Verbatim, unmodified — new caller |
| `usePlaceItem` / `useUnplaceItem`        | `store-config/hooks.ts`                   | Item placements only              |
| `useMarkItemReviewed`                    | `store-config/hooks.ts`                   | A move implies review             |
| `useDismissals` / `useDismissSuggestion` | `store-config/hooks.ts`                   | Same suggestions as `/store`      |
| `reorderGroupsByLocation`                | `shopping-list/reorder.ts`                | Already called every render       |
| `useResolvedItems`                       | `store-config/hooks.ts`                   | Already read by this page         |

`AssignSheet` takes a `ResolvedItem` plus callbacks and holds no store-page state, so it is
already a shared component in everything but folder location. **It is not being modified.**

---

### Deliverables

- `src/features/shopping-list/reorder.ts` — export the existing private `nameKey` helper
- `src/features/shopping-list/components/ShoppingListPage.tsx` — move affordance, sheet wiring,
  scroll anchoring
- `src/features/shopping-list/components/ShoppingListPage.test.tsx` — new cases appended
- `src/features/shopping-list/reorder.test.ts` — one case pinning the exported `nameKey`

No new files, no new dependencies, no schema or API change.

---

### Technical Approach

#### 1. Item identity: shopping-list line → `ResolvedItem`

A `ShoppingListItem` carries `name`/`unit`/`quantity`/`category` and no id. `reorder.ts` already
solves this: it matches on `nameKey(name)` = `lower(btrim(name))`, identical to `items.name_key`'s
generated expression.

That helper is currently private. Export it and build a `Map<nameKey, ResolvedItem>` in the page,
so the row's move target and the sort's position come from **one** definition of identity. A second
copy of the normalisation rule is exactly the drift `reorder.ts`'s comment warns about.

#### 2. Row structure — the actual tension

Today each line is a Chakra `Checkbox` whose label fills the row. A button nested inside that label
would sit inside the `<label>` element and toggle the checkbox on its way through.

So the checkbox and the move button become **siblings** in the row's `HStack`, with the checkbox
taking `flex={1}`:

- checking off keeps a full-width-minus-44px hit target — the label still owns almost the whole row
- the move control is a real sibling button, no nested interactive elements, no `stopPropagation`
  papering over a bad structure

Presentation: a quiet trailing `IconButton` (`variant="ghost"`, `color="ink.300"`, 44px target)
using `uiIcons.storeConfig` — the Store glyph already means "where this goes in the store" in this
app's vocabulary. `aria-label={`Move ${item.name}`}`, matching `AllGroceriesList`'s existing label
so both entry points read the same to a screen reader.

Hover-reveal was rejected outright: the entire premise is a phone held in a store aisle.

#### 3. When the affordance renders

Only when both are true:

- the household has a store with at least one stop — otherwise there is nowhere to move anything
- the line matches a `ResolvedItem` — otherwise there is nothing to place

Otherwise the row renders exactly as it does today.

#### 4. Writes — item placements only

`onPlace` → `placeItem.mutate({ itemId, locationId })`, then `markItemReviewed` in `onSuccess`,
then close. Identical to `StoreConfigPage`'s wiring.

`useSetCategoryPlacement` / `useUnsetCategoryPlacement` are **not imported into this feature.** From
the shopping list a move means "this thing is here", never "everything like it is here". Making the
category hooks unreachable from this file is the enforcement, not a comment asking for restraint.

#### 5. Re-sort without a reload

`usePlaceItem` already invalidates the resolution query. The page reads `useResolvedItems`, so the
invalidation refreshes `resolved.data`, the `useMemo` recomputes, and `reorderGroupsByLocation`
re-orders the groups. Nothing new — the re-sort falls out of the existing wiring.

#### 6. Check state across the re-sort

`checkedItems` is keyed by `category-name-unit`. A move changes an item's **location**, never its
category, name or unit — so every key survives and the `Set` needs no migration. This is a property
of the existing key choice, and the tests will pin it so a future key change cannot quietly break it.

#### 7. Scroll position

The real risk. Re-ordering groups shifts everything below the change; a user half-way down a
part-checked list would find the page moved under them.

Anchor on the row the user just acted on — they tapped it, so it is what they are looking at:

1. on move, record the item's key and its row's `getBoundingClientRect().top`
2. in a `useLayoutEffect` after the group order changes, find that row again and
   `window.scrollBy(0, newTop - recordedTop)`
3. clear the pending anchor

**Honest limitation**: jsdom has no layout — every rect is 0 — so a unit test asserting this would
be vacuous. It gets a manual verification step in Stage 3, reported as manual, not a green test
standing in for one.

#### 8. Failed write

No optimistic update anywhere. On error the mutation rejects, the list is untouched, and the sheet
stays open with an inline message. The list cannot show a reorder that was not saved, because the
only thing that reorders it is refetched server state.

---

### The cut criterion — assessed

Story 002 requires the existing `ShoppingListPage` suite to pass **unmodified**, as evidence that
checking off is unchanged.

It will pass — but I want to flag _why_, because the reason is partly luck and treating it as a
clean pass would be self-deception:

> Those tests mock `fetchActiveStore` → `null` and `fetchResolvedItems` → `[]`. Under condition
> #3 the move affordance therefore **never renders in any of them**. The suite passes because the
> feature is absent, not because it was proven harmless.

The criterion's intent is that checking off still works with the affordance present. So the existing
suite passing unmodified is necessary but **not sufficient**, and Stage 3 adds cases that render
_with_ a store and a populated registry and then check items off. That is the evidence that
actually answers the question.

On the substance: the affordance does not compete with checking off. It occupies 44px at the row's
trailing edge, adds no interactive element inside the label, and leaves the primary target at
full-width-minus-one-button. My assessment is that this unit should **ship, not be cut** — but the
Stage 3 tests are what settle it, and if checking off degrades under them, cutting is still the
right call.

---

### Acceptance Criteria

Story 001:

- [ ] The move action opens the same `AssignSheet` as `/store` — same component, same suggestions
- [ ] After a move the list re-sorts to walking-path order with no full page reload
- [ ] A move writes an **item** placement; no `category_placements` write is reachable
- [ ] A moved item is marked reviewed
- [ ] Check state survives the re-sort
- [ ] Scroll position is preserved across the re-sort (manual verification)
- [ ] An already-placed item is offered "Take it off the path"
- [ ] A failed write leaves the list unchanged

Story 002:

- [ ] Every existing `ShoppingListPage.test.tsx` test passes **unmodified**
- [ ] New cases assert re-sort, `item_placements`-only, check-state survival, failure-leaves-unchanged
- [ ] New cases check items off **with a store configured**, closing the gap noted above
- [ ] `tsc -b`, `eslint`, `vitest` all green

---

### Out of Scope

- Category moves from this surface
- Any change to `AssignSheet`, `reorderGroupsByLocation`'s logic, or list grouping/aggregation
- Moving `AssignSheet` out of the `store-config` folder — it is shared in practice; relocating it
  would touch unit 002's files for no behavioural gain
