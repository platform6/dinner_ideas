---
unit: 001-lucky-pick
intent: 016-feeling-lucky
phase: inception
status: complete
created: '2026-09-07T04:10:00Z'
updated: '2026-09-07T04:10:00Z'
---

# Unit Brief: Lucky Pick

## Purpose

Make deciding what to eat a single press, without offering last week's dinners back.

## Scope

### In Scope

- A control on the dinner catalog
- A **pure, seedable** weighted draw: candidates + recency in, chosen dinners out
- Filling the week's empty slots through the ordinary selection path
- Disabled and ran-out states, each saying why

### Out of Scope

- Replacing existing picks — intent 009's Clear Picks already owns destructive resetting
- Any migration, table or new query shape
- Enforcing the cap; intent 015's trigger does that

---

## Assigned Requirements

| FR   | Title                                | Priority |
| ---- | ------------------------------------ | -------- |
| FR-1 | A lucky control on the catalog       | Must     |
| FR-2 | It fills only empty slots            | Must     |
| FR-3 | It honours the household's number    | Must     |
| FR-4 | It prefers less-recently-eaten       | Must     |
| FR-5 | Only pickable dinners are candidates | Must     |

## Key Constraints

- **Keep the draw pure and inject the random source.** "Is it random?" and "is it biased the right
  way?" are both untestable if the component calls `Math.random()` inline.
- **It must remain a draw.** Pressing twice on the same state may give different answers. A
  deterministic pick is a sorted list wearing a button's clothes.
- **Suppression outranks randomness.** `is_active = false` is a user decision (intent 001 FR-7).
- **Never eaten is not a penalty.** A dinner with no history is fully eligible — arguably the most
  eligible.
- **Writes go through the ordinary selection path**, so intent 015's trigger applies unchanged.

## Interfaces Consumed

| Interface                     | From       | Notes                                  |
| ----------------------------- | ---------- | -------------------------------------- |
| `households.dinners_per_week` | intent 015 | The number to fill to                  |
| `dinner_last_chosen`          | intent 001 | Recency; already loaded by the catalog |
| `dinners.is_active`           | intent 001 | Suppression                            |
| Selection write path          | intent 001 | Same path hand-picking uses            |

## Dependencies

**Requires**: intent `015-dinners-per-week` (unit 001)

**Enables**: none

## Definition of Done

- One press fills the week's remaining slots, keeping existing picks
- Recently-eaten dinners are drawn less often than long-ago or never-eaten ones
- Suppressed and already-picked dinners are never drawn
- Too few candidates fills what it can and says it ran out
- A locked or already-full week disables the control with the reason visible
- The draw is a pure function, tested with a seeded source for both randomness and bias
- `tsc -b`, `eslint`, `vitest` all green
