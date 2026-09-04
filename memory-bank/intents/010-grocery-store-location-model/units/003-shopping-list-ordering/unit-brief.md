---
unit: 003-shopping-list-ordering
intent: 010-grocery-store-location-model
phase: inception
status: complete
created: '2026-09-04T14:30:00Z'
updated: '2026-09-04T14:30:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Shopping List Ordering

## Purpose

Switch the shopping-list group-order sort key from `category → grocery_store_row.position` to
each ingredient's resolved `Item → Location` position, with the "unlocated → after the path,
alphabetically" fallback preserved. `buildShoppingList`'s aggregation is untouched.

## Scope

### In Scope

- The group-ordering sort key (FR-17)
- Equivalence check for already-configured households post-cutover

### Out of Scope

- `buildShoppingList` aggregation/merge logic
- Anything in the data model or the store-config page (units 1, 2)

---

## Assigned Requirements

| FR    | Requirement                         | Priority |
| ----- | ----------------------------------- | -------- |
| FR-17 | Shopping-list group ordering rework | Must     |

---

## Domain Concepts

_None new._ Reads unit 1's resolution query per ingredient.

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 2     |
| Must Have     | 2     |

### Stories

| Story ID                           | Title                                      | Priority | Status  |
| ---------------------------------- | ------------------------------------------ | -------- | ------- |
| 001-shopping-list-sort-by-location | Sort key → resolved Item→Location position | Must     | Planned |
| 002-shopping-list-ordering-tests   | Updated tests + cutover equivalence check  | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                      | Reason                                       |
| ------------------------- | -------------------------------------------- |
| `001-location-item-model` | The resolution query drives the new sort key |

### Depended By

_None._

---

## Constraints

- `buildShoppingList` aggregation/merge logic unchanged — only the sort key feeding it changes.
- Unlocated ingredients still sort last, alphabetically (today's fallback, preserved).

---

## Success Criteria

### Functional

- [ ] Group order follows each ingredient's resolved Location position
- [ ] Unlocated ingredients sort after the path, alphabetically
- [ ] Output for an already-configured household is equivalent to today's, post-cutover

### Quality

- [ ] `tsc -b`, `eslint`, `vite build` clean; existing shopping-list suite green plus the new
      sort-key assertions

---

## Bolt Suggestions

| Bolt                       | Type   | Stories  | Objective                 |
| -------------------------- | ------ | -------- | ------------------------- |
| 054-shopping-list-ordering | Simple | 001, 002 | The sort-key swap + tests |

Sequence: `050/051 → 054` (independent of `052`/`053`).
