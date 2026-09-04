---
intent: 009-clear-picks-reset
phase: inception
status: complete
created: '2026-09-01T02:00:00Z'
updated: '2026-09-04T02:36:10Z'
---

# Requirements: Clear Picks — reset the week's dinner selection

## Intent Overview

The only way to undo the week's dinner picks is to un-pick each catalog card one at a time,
or press the small `×` on each row in `/plan`. There is no "start over". This intent adds
**one control** — **Clear picks** — in the catalog header, beside the "N of 3" count badge it
undoes. It asks once (inline, not a modal), clears every selection in a single request, then
offers **Undo**.

**Re-scoped (2026-09-04): this ships after `011-planning-week-rollover`.** `011` made the
catalog roll over to a fresh, empty set at the household's week boundary, so "Clear picks" is
no longer "the only way to start over" — it is the **deliberate mid-week reset** ("I changed
my mind about this week"). `useCurrentPlan` is now week-aware, so `clearSelections` operates
on **the current planning week's plan**. No FR or design change — only this framing.

**Source**: `D3.zip` → `design_handoff_clear_picks/` — a **high-fidelity** handoff:
`README.md` (self-sufficient spec), `Reset Dinner Selection.dc.html` (interactive prototype),
`ClearPicksControl.reference.tsx` and `clear-selections.reference.ts` (written against the
real repo, **untested** — strong starting points, not verified code). The design is
option **1a**; option 1b (a "picked this week" chip strip with "Start over") was reviewed and
**rejected** — it stays in the prototype for context only, do not build it.

Every colour, radius and type value in the handoff is an existing token in
`src/shared/theme/index.ts`; both icons (`uiIcons.restore`, `uiIcons.info`) already exist.
No schema change, no new dependency, no new asset, no theme change.

---

## Business Goals

| Goal                                                        | Success Metric                                                                                      | Priority |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| Resetting the week's picks is one obvious action, not three | With 1–3 picked, a "Clear picks" control is visible in the catalog header; one confirm clears all   | Must     |
| A mis-tap can't wipe the week                               | Clearing always goes through an inline confirm; and every clear is undoable until the user moves on | Must     |
| The control looks native to the Kitchen Table theme         | All colours/radii/type resolve to existing tokens; no `danger` Button variant is added to the theme | Must     |
| Clearing is atomic and has a single failure point           | One `delete` keyed on the plan id — not three toggles; Undo restores the exact 1/2/3 order          | Must     |

---

## Functional Requirements

### FR-1: `ClearPicksControl` component

- **Description**: A new presentational component
  `src/features/weekly-plan/components/ClearPicksControl.tsx`, prop-driven:
  `{ count: number; onClear: () => void; isClearing?: boolean }`. It renders **one of** its
  states in place of itself; it owns only `isConfirming: boolean` locally. The parent owns
  the mutation and the undo bar. (`ClearPicksControl.reference.tsx` is the starting point —
  adapt, verify, add tests.)
- **Acceptance Criteria**:
  - `count === 0` → renders `null` (no disabled button, no placeholder).
  - `count` 1–3, not confirming → a single quiet button: Chakra `Button variant="quiet"
size="sm"`, `leftIcon={uiIcons.restore}` (13px, `strokeWidth={2.2}`), label "Clear picks".
    Hover / focus come from the `quiet` variant + the global focus ring — no per-instance
    hover/focus styling.
  - Confirming → an inline `HStack` pill (`role="group"`,
    `aria-label="Confirm clearing this week's picks"`): label "Clear all {count}?" (live
    count, `whiteSpace="nowrap"`), a "Keep" button, and a "Clear all" button.
  - "Clear all" click → `setIsConfirming(false)` then `onClear()`. While `isClearing`, "Clear
    all" shows its `isLoading` spinner.
  - No transition/animation on the state swap — the pill replaces the button instantly.
- **Priority**: Must

### FR-2: Placement in the catalog header

- **Description**: Mount `ClearPicksControl` in `CatalogPage.tsx`'s existing right-hand
  header `HStack gap={2}`, **between the count `Badge` and the "Not interested" `IconButton`**.
  Nothing else in the header moves.
- **Acceptance Criteria**:
  - The control is the 2nd child of the right-hand stack (badge, control, icon button).
  - `count` passed to it = `selectedDinnerIds.size` (the existing memo). Because that memo is
    already an empty set when `plan` is `null` or `plan.locked_at !== null`, the control
    hides in those cases with **no extra guard**.
  - The header keeps `justify="space-between"`, `mb={4}`, `flexWrap="wrap"`, `gap={3}`; on a
    narrow phone the right stack still wraps below the title; header min-height stays 44px;
    all three buttons are ≥32px tall.
- **Priority**: Must

### FR-3: Inline confirm interaction

- **Description**: Clicking "Clear picks" replaces the button **in place** with the confirm
  pill — deliberately not a modal (one row's worth of consequence, and undoable) but enough
  friction that a single mis-tap can't wipe the week.
- **Acceptance Criteria**:
  - The pill dismisses back to idle when: "Keep" is pressed, `Escape` is pressed, **or** the
    user picks / un-picks any dinner card while the confirm is open.
  - "Clear all" is the **only** filled terracotta (`heart.500`) button in the app. It is
    styled with props **at the call site** (`bg="heart.500"`, `_hover="heart.600"`,
    `_active="heart.700"`, `color="paper.base"`); **no `danger` Button variant is added to
    the theme** (the `heart` token comment says "never a button fill" — keep that rule; a
    second destructive fill anywhere should reopen the decision properly).
  - "Keep": transparent, `1px heart.200` border, `heart.700` text, hover `heart.100`.
- **Priority**: Must

### FR-4: `clearSelections(planId)` — data layer

- **Description**: Add `clearSelections(planId: string): Promise<void>` to
  `src/features/weekly-plan/api.ts` — one
  `supabase.from('weekly_plan_selections').delete().eq('weekly_plan_id', planId)`.
- **Acceptance Criteria**:
  - Removes **every** selection on the plan in one statement; throws on a Supabase `error`.
  - Does **not** delete the `weekly_plans` row — an empty draft plan is a valid state the
    catalog already renders as "0 of 3".
  - Idempotent: clearing an already-empty plan is a no-op success.
  - Relies on the existing household-scoped RLS on `weekly_plan_selections` (migration
    `20260828232000`) — a plan id from another household deletes zero rows rather than
    erroring; the UI only ever passes the id from `useCurrentPlan()`.
- **Priority**: Must

### FR-5: `useClearSelections()` hook

- **Description**: Add to `src/features/weekly-plan/hooks.ts`. `mutationFn` takes the current
  plan, reads `plan.weekly_plan_selections.map(s => s.dinner_id)` **before** deleting, calls
  `clearSelections(plan.id)`, and **returns those dinner ids** so the caller can offer Undo
  without re-reading the (now empty) plan. `onSuccess` invalidates
  `['weekly-plan','current']`.
- **Acceptance Criteria**:
  - Returns the removed dinner ids, in the plan's selection order.
  - Invalidates the `currentPlanKey` query on success.
  - **Not** implemented as N × `useToggleSelection` — that hook derives add/remove from a
    `currentPlan` snapshot handed in by the caller, so firing it repeatedly from one snapshot
    is the exact stale-snapshot hazard `CatalogPage`'s `selectionDisabled` comment guards
    against. One keyed `delete` is atomic and gives Undo a single failure point.
- **Priority**: Must

### FR-6: `useRestoreSelections()` hook (Undo)

- **Description**: Add to `hooks.ts`. `mutationFn` takes `{ planId, dinnerIds }` and re-adds
  the ids by calling the existing `addSelection(planId, dinnerId)` **sequentially** (a `for`
  loop, awaited — **not** `Promise.all`), so the 1 / 2 / 3 badges on `/plan` come back in
  their original order. `onSuccess` invalidates `['weekly-plan','current']`.
- **Acceptance Criteria**:
  - Re-adds every id from the last clear, in the same order they were removed.
  - Sequential, not parallel; `Promise.all` would scramble insert order.
  - Invalidates `currentPlanKey` on success.
- **Priority**: Must

### FR-7: Undo bar (parent-owned, in `CatalogPage`)

- **Description**: After a successful clear the confirm pill disappears (count is 0 → the
  control renders nothing) and an **undo bar** appears **below the header, above the
  filters** — the same slot the existing `toggleSelection.isError` alert occupies (`mb={4}`).
  `CatalogPage` owns `clearedIds: string[] | null` — the ids removed by the last clear; `null`
  hides the bar.
- **Acceptance Criteria**:
  - Bar layout: `HStack justify="space-between"`, `bg="paper.subtle"`, `1px line.subtle`,
    radius `field`, `mb={4}`; `uiIcons.info` (15px) + text "{n} dinners cleared." —
    **singularised at 1** ("1 dinner cleared.") — + an "Undo" button
    (`variant="outline" size="sm"`, `leftIcon={uiIcons.restore}`).
  - The bar persists until **one of**: Undo is pressed, the user picks another dinner, or
    they navigate away from the catalog. It does **not** auto-dismiss on a timer.
  - "Undo" → `useRestoreSelections().mutate({ planId, dinnerIds: clearedIds })`, then
    `clearedIds` is set back to `null`.
  - The bar is announced to screen readers via `aria-live="polite"`.
- **Priority**: Must

### FR-8: In-flight & error handling

- **Description**: The clear and undo mutations must not corrupt the optimistic grid, and
  their failures reuse the page's existing error affordance.
- **Acceptance Criteria**:
  - While the clear mutation runs: "Clear all" shows `isLoading`; the dinner-card pick
    buttons are disabled — reusing the same reasoning as the existing `selectionDisabled`
    guard (extend it with an "is clearing" term).
  - The optimistic UI does **not** clear the cards until the mutation resolves.
  - On failure of either mutation, the page's existing `Alert status="error"` pattern shows
    in the same slot: "Couldn't clear your picks, try again." / "Couldn't undo that, try
    again."
  - A locked plan (`locked_at !== null`): the control and the undo bar are both hidden (its
    shopping list has been sent; its picks are history).
- **Priority**: Must

### FR-9: Keyboard & accessibility

- **Description**: The control is fully keyboard operable and the destructive step is guarded.
- **Acceptance Criteria**:
  - "Clear picks" + `Enter` / `Space` → opens the confirm pill **and moves focus to "Keep"**
    (the safe option).
  - `Escape` while confirming → dismisses to idle.
  - After a successful clear → focus moves to the "Undo" button.
  - The confirm pill has `role="group"` and
    `aria-label="Confirm clearing this week's picks"`.
  - No new focus-ring styling — the global `:focus-visible` olive ring covers all three
    buttons.
- **Priority**: Must

### FR-10: Tests

- **Description**: New `ClearPicksControl.test.tsx`; extended `CatalogPage.test.tsx`.
- **Acceptance Criteria**:
  - `ClearPicksControl.test.tsx`: renders the quiet button at count 1–3; renders `null` at
    count 0; clicking it shows the confirm pill with "Clear all {count}?"; `Escape` and
    "Keep" both dismiss; "Clear all" fires `onClear` exactly once; `isClearing` puts the
    spinner on "Clear all".
  - `CatalogPage.test.tsx` (extended): clearing empties the grid and shows the undo bar with
    the right (singular/plural) count; Undo restores the cards; the control is absent at 0
    picks and when the plan is locked; a failed clear surfaces the error alert.
  - The existing `CatalogPage` / weekly-plan suites stay green (only additive assertions).
- **Priority**: Must

---

## Non-Functional Requirements

### Compatibility

| Requirement       | Notes                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Component library | Chakra UI v2 only, existing custom theme. `quiet` / `outline` Button variants already exist.               |
| Tokens            | Zero new tokens. Every colour/radius/type in the handoff already exists in `theme/index.ts`.               |
| Icons / assets    | `uiIcons.restore` (lucide `RotateCcw`) and `uiIcons.info` (lucide `Info`) already exported. No new assets. |
| Data model        | No schema change, no new migration. `weekly_plan_selections` + `addSelection` are reused as-is.            |
| Motion            | None. The theme has no motion vocabulary; the state swap is instant.                                       |

### Accessibility

| Requirement      | Target                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| Focus management | Confirm opens → focus "Keep"; clear succeeds → focus "Undo"; `Escape` cancels. |
| Announcements    | The cleared/undo bar is `aria-live="polite"`.                                  |
| Hit targets      | All three buttons ≥ 32px tall inside the 44px header row.                      |
| Focus ring       | The existing global olive `:focus-visible` ring, unchanged.                    |

### Regression

| Requirement    | Target                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Existing suite | `weekly-plan` + `dinners` (`CatalogPage`, `PlanPage`, `DinnerCard`) tests stay green. Only additive assertions. |
| `/plan`        | `PlanPage.tsx` is unchanged; the per-selection `×` there stays exactly as it is.                                |

---

## Constraints

### Technical Constraints

- **Option 1a only.** Option 1b (the "picked this week" chip strip + "Start over") is
  explicitly out of scope — it exists in the prototype for context.
- The reference `.tsx` / `.ts` files are **untested** — adapt names/paths to the codebase,
  run and test them; do not paste verbatim.
- **Clear is one `delete` keyed on the plan id**, never N × `useToggleSelection`
  (stale-snapshot hazard the existing `selectionDisabled` comment documents).
- **Undo is sequential** re-adds in original order — not `Promise.all`.
- "Clear all" terracotta fill is styled **at the call site**; **no theme `danger` variant**.
- `PlanPage.tsx` does not change. (If the same reset is later wanted on `/plan`, the
  prop-driven control drops in beside the week nav — not part of this request.)

### Business Constraints

- Household project — same single-family scope as `001`–`008`.
- No auto-dismiss timer on the undo bar: the primary user reads at her own pace, and a
  disappearing Undo is a worse failure than a bar that lingers.

---

## Assumptions

| Assumption                                                                              | Risk if Invalid                          | Mitigation                                                                                    |
| --------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `selectedDinnerIds` in `CatalogPage` is already empty when the plan is `null` or locked | The control would need its own guard     | Verified in source (`CatalogPage.tsx` memo returns `new Set()` for both)                      |
| `addSelection(planId, dinnerId)` exists and appends a selection row                     | Undo can't re-add via the existing path  | Verified in `weekly-plan/api.ts`                                                              |
| `weekly_plan_selections` is household-scoped by RLS since intent 004                    | A cross-household clear could error      | Verified — migration `20260828232000` adds the direct policies                                |
| The `toggleSelection.isError` alert slot is a suitable home for the undo bar            | The bar competes with a real error alert | Both are `mb={4}` in the same region; only one is shown at a time in practice                 |
| No `weekly_plan_selections` trigger enforces "exactly 3" on delete                      | A bulk delete could be rejected          | Confirm at construction start; the lock-time "exactly 3" check is on lock, not on every write |

---

## Open Questions

| #    | Question                                                                         | Owner         | Resolution                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Should **Undo survive a page navigation**?                                       | Product owner | **Resolved 2026-09-04: NO.** Leaving the catalog drops the undo bar and the clear is permanent. `clearedIds` lives only in `CatalogPage` React state — no `sessionStorage`, no soft-delete column. Keeps the "no schema change" constraint; a mistaken clear is recoverable by re-picking (cheap) or waiting for the next planning-week rollover. Persistence, if ever wanted, is a separate follow-up intent. |
| OQ-2 | Should the same "reset" affordance also appear on `/plan` (beside the week nav)? | Product owner | **Resolved 2026-09-04: NO.** Catalog-only for this intent. The control is prop-driven (`{ count, onClear, isClearing }`), so it can be dropped onto `/plan` later with no rework.                                                                                                                                                                                                                              |

---

## Priority Definitions

| Priority | Meaning                                                  |
| -------- | -------------------------------------------------------- |
| Must     | Required; the control is incomplete or unsafe without it |
| Should   | Not used in this intent                                  |
| Could    | Not used in this intent                                  |
| Won't    | See Out of Scope                                         |

## Out of Scope (Won't — this intent)

- Option 1b (the "picked this week" chip strip / "Start over").
- Any `/plan` change; a `danger` Button theme variant.
- Persisting Undo across navigation / reload (OQ-1 default is "no").
- Deleting the `weekly_plans` row on clear (an empty draft plan is valid).
- A confirmation modal / dialog.
- Bulk clear on a **locked** plan.
- Any schema change, migration, or new dependency.
