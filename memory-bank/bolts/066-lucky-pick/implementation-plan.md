---
stage: plan
bolt: 066-lucky-pick
created: '2026-09-08T22:10:00Z'
---

## Implementation Plan: 001-lucky-pick

### Objective

One control on the catalog that fills the week's remaining picks at random, weighted away from
recently-eaten dinners. Unblocked by intent 015, which shipped as v0.12.0 an hour ago.

---

### What already exists and should be reused

| Piece                         | Where                     | Why it fits                                                                                                                                                   |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daysSinceForSort(date)`      | `dinners/last-chosen.ts`  | Returns **`+Infinity` for never-made** — exactly the requirement that a never-eaten dinner is fully eligible, arguably most so. No new recency notion needed. |
| `useLastChosenDates()`        | `dinners/hooks.ts`        | The catalog already loads it; the draw needs no new query.                                                                                                    |
| `useDinnersPerWeek()`         | `settings/hooks.ts`       | Intent 015. The target count.                                                                                                                                 |
| `ClearPicksControl`           | `weekly-plan/components/` | The catalog-control shape: quiet button, parent owns the mutation.                                                                                            |
| `createPlan` / `addSelection` | `weekly-plan/api.ts`      | The ordinary write path, so intent 015's triggers apply unchanged.                                                                                            |

---

### Technical Approach

#### 1. The draw is a pure function, in its own file

`src/features/weekly-plan/lucky-draw.ts`

```ts
export function drawLucky(
  candidates: LuckyCandidate[], // { id, lastChosenDate }
  count: number,
  random: () => number, // injected — NOT Math.random
): string[];
```

The injected source is the whole reason this is testable. "Is it random?" and "is it biased the
right way?" are both unanswerable about a component that calls `Math.random()` inline. Story 003
measures the bias across many seeded draws, which requires this shape.

**Weighting**: each candidate's weight rises with `daysSinceForSort`. A never-made dinner gets
`+Infinity` from that helper, so the weight function must map it to a finite maximum rather than
propagating `Infinity` into the arithmetic — a detail worth getting right, since `Infinity` in a
cumulative sum poisons every subsequent comparison.

Weighted selection without replacement: pick one by cumulative weight, remove it, repeat. K is at
most 7 and the pool at most a few hundred, so the naive O(K·N) is correct and fast enough; anything
cleverer would be harder to reason about for no gain.

**It must stay a draw.** Weighting shifts odds, it does not sort. If two different random sources
give the same answer on the same input, this is a ranking with a button on it.

#### 2. Eligibility, decided by the caller

The draw takes candidates; the page decides who they are:

- **exclude suppressed** (`is_active = false`) — a user decision (intent 001 FR-7) that randomness
  must not overrule
- **exclude already-picked** — no dinner twice in a week
- The catalog already has both lists in hand

#### 3. The write path — one mutation, not K toggles

**`useToggleSelection` must not be called in a loop.** `CatalogPage` already carries the comment
explaining why: two picks in flight decide their create-plan action from the same stale
`currentPlan`, and two plans get created. Intent 017's outage was a different symptom of that same
area; this is not a place to be casual.

So: a `useLuckyPick` mutation that

1. resolves the plan **once** — creating it if absent, via `currentPlanningWeekStart(weekStart)`
   exactly as `useToggleSelection` does
2. adds the drawn dinners **sequentially** against that one plan id
3. invalidates `currentPlanKey` on success

Sequential, not `Promise.all`: intent 015's cap trigger serialises on the plan row anyway, and
concurrent inserts would race for the last slot and surface a `23505`-adjacent error for no benefit.

**Partial failure**: if insert 3 of 4 fails, the first two stand. The requirement says the picks
that succeeded remain and the user is told — so the mutation reports how many landed rather than
pretending the whole thing failed.

#### 4. The control

Beside `ClearPicksControl` in the catalog header. **No confirm step** — the action is
non-destructive by design, which was the whole reason for filling rather than replacing.

Disabled, with the reason visible, when:

- the week is already full (`picks >= dinnersPerWeek`)
- the plan is locked
- there are no eligible candidates

"Disabled and silent" is the failure mode to avoid; each of those states says why.

**Ran out**: fewer candidates than empty slots → fill what we can, and say so.

#### 5. What this must NOT do

- **No cap enforcement.** Intent 015's trigger owns that. This computes slots for the UI; its
  arithmetic is not the guarantee.
- **No replacing existing picks.** Intent 009's Clear Picks already owns destructive resetting.
- **No new table, column, or query.**

---

### Acceptance Criteria

- [ ] `drawLucky` is pure, takes its random source, and returns distinct ids
- [ ] Recently-eaten dinners are drawn less often; never-made are fully eligible
- [ ] Different random sources can give different results — it is a draw, not a ranking
- [ ] Suppressed and already-picked dinners are never drawn
- [ ] One press fills `dinnersPerWeek - picked` slots, keeping existing picks
- [ ] The plan is created at most once, then reused for every insert
- [ ] Full week / locked plan / no candidates each disable the control **with the reason shown**
- [ ] Too few candidates fills what it can and says it ran out
- [ ] A partial failure keeps the picks that landed and reports what happened
- [ ] `tsc -b`, `eslint`, `vitest` green

---

### Out of Scope

- A "replace everything" mode — clear, then press lucky
- Any change to the cap, the lock rule, or the selection triggers
