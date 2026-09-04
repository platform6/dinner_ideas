---
intent: 012-explicit-plan-locking
phase: inception
status: complete
created: '2026-09-03T22:27:55Z'
updated: '2026-09-03T23:05:00Z'
---

# Requirements: Explicit "Lock in this week" — decoupled from the shopping list

## Intent Overview

Locking a week's plan is currently a **side effect of copying the shopping list**: the
Shopping List page has an "Also lock this week's plan" checkbox (checked by default) that
fires `lockPlan` when the user presses **Copy shopping list**. There is no standalone "I'm
done with this week" action.

This intent makes locking a **first-class, explicit action** — a "Lock in this week" control
on `/plan` with an inline confirm — and **removes locking from the copy path**. Copying the
list becomes just copying.

**Why now / sequencing**: intent `011-planning-week-rollover` makes the catalog roll over to a
fresh set every planning week regardless of lock state. Lock then stops being "the thing that
ends the week" (rollover does that) and becomes purely **"commit these 3 dinners — record them
to history"** — the signal that feeds `meal_history` and the variety indicator (written by
`trg_weekly_plans_record_meal_history` on the `locked_at` transition). If locking stays hidden
inside the copy flow when rollover ships, `meal_history` quietly starves. **`012` ships before
`011`.**

**Type**: brown-field (enhancement — `src/features/weekly-plan/`, `src/features/shopping-list/`,
`/plan`). **No schema change, no new backend** — reuses the existing `lock_weekly_plan` RPC.

**Origin**: product-owner direction (2026-09-03) — "we need a clear locking mechanism. I don't
think it makes sense as part of copying the grocery list anymore."

## What "locked" means (domain recap, from live source)

- `weekly_plans.locked_at` null → not-null is one-way today (no unlock path).
- Locking requires **exactly 3 selections** (`trg_weekly_plans_require_three_on_lock`).
- On the transition, a trigger writes 3 `meal_history` rows; `on conflict do nothing`.
- `lock_weekly_plan` RPC is **idempotent**.
- Locked plan: `/plan` renders read-only; catalog `selectedDinnerIds` becomes empty;
  `PlanPage` hides per-row remove buttons.

## Business Goals

| Goal                                        | Success Metric                                                                                             | Priority |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| Locking is a deliberate, understood action  | A single "Lock in this week" control on `/plan` with an inline confirm; no lock coupling anywhere else     | Must     |
| Copying the list is just copying            | `ShoppingListPage` has no lock checkbox and no `useLockPlan` import; copy-success text is lock-agnostic    | Must     |
| Meal history keeps filling once `011` ships | A user who locks each week gets 3 `meal_history` rows/week; the variety indicator stays populated          | Must     |
| No silent behaviour change                  | Still needs exactly 3; still one-way; still idempotent; existing locked-view rendering otherwise unchanged | Must     |

---

## Functional Requirements

### FR-1: "Lock in this week" action on `/plan`

- **Description**: Add a primary action to the `/plan` (This Week) page header that locks the
  current planning week's plan. It is the **only** lock trigger in the app after this intent.
- **Acceptance Criteria**:
  - The button renders only when **all** of: the plan shown is the current week
    (`isCurrentWeek`), it is **not** locked (`locked_at === null`), and it has **exactly 3**
    selections (`selections.length === 3`).
  - Label: **"Lock in this week"** with `uiIcons` lock glyph (add one to `uiIcons` if absent —
    Lucide `Lock`).
  - A single context line sits with the button: _"Locks these 3 dinners and adds them to your
    history. You can still shop your list either way."_
  - Pressing it opens the inline confirm (FR-2) — it does **not** lock immediately.
  - Past weeks (`!isCurrentWeek`) never show the button; a not-full current week never shows it
    (see FR-6 for what shows instead).
- **Priority**: Must

### FR-2: Inline lock confirmation

- **Description**: Locking is guarded by an inline confirm in place of the button — same
  interaction shape as `009`'s `ClearPicksControl` (no modal).
- **Acceptance Criteria**:
  - The button is replaced in place by an `HStack` pill (`role="group"`,
    `aria-label="Confirm locking this week's plan"`): text _"Lock in these 3? You won't be
    able to change this week's picks."_, a **"Keep editing"** button, and a **"Lock it in"**
    button.
  - Opening the pill moves focus to **"Keep editing"** (the safe option).
  - The pill dismisses to idle when: "Keep editing" is pressed, `Escape` is pressed, **or**
    the user adds/removes a dinner while it is open.
  - "Lock it in" → `useLockPlan().mutateAsync(plan.id)`; while pending it shows `isLoading`.
  - On success: `/plan` re-renders in its locked state (FR-3); focus moves to a sensible
    landmark (the confirmation text or page heading).
  - On failure: an inline `Alert status="error"` — _"Couldn't lock this week, try again."_ —
    and the pill returns to idle so the user can retry.
- **Priority**: Must

### FR-3: Locked-state rendering and reworded copy

- **Description**: The existing `/plan` locked view stays, but its wording is updated for the
  decoupled world (it currently claims the shopping list "has already been sent").
- **Acceptance Criteria**:
  - The locked banner text changes from _"This plan is locked — its shopping list has already
    been sent…"_ to _"This week's plan is locked in — saved to your history."_
  - A `formatWeekRange(plan.start_date)` label is shown with it.
  - If `011` has shipped (feature-detectable by the presence of the planning-week helper), an
    optional secondary line _"Your next week opens {date}."_ — otherwise omitted. This line is
    **Could** priority; the reword is **Must**.
  - The read-only behaviour (no remove buttons, no add from catalog into this plan) is
    unchanged.
- **Priority**: Must (reword) / Could (the "next week opens" line)

### FR-4: Remove locking from the Shopping List Copy flow

- **Description**: `ShoppingListPage` no longer locks anything.
- **Acceptance Criteria**:
  - The "Also lock this week's plan" `Checkbox`, the `lockChecked` / `shouldLock` state, the
    `useLockPlan` import, the `lockPlan.mutateAsync` call in `handleCopy`, and the
    `lockErrorMessage` state/branches are **all removed**.
  - `handleCopy` does exactly one thing: write `text` to the clipboard and report the outcome.
  - Copy-success text is _"Copied!"_ with no lock-state variants; the _"…This week's plan is
    locked in."_ fragments are removed.
  - The page renders identically for a locked and an unlocked plan except for FR-5's nudge.
- **Priority**: Must

### FR-5: Non-blocking "not locked yet" nudge on the Shopping List

- **Description**: When the user copies the list for a current-week plan that is **not**
  locked, show a gentle inline pointer to the lock action. It never blocks copying and never
  locks.
- **Acceptance Criteria**:
  - Shown only when the current planning week's plan exists, is unlocked, and has 3
    selections; hidden when the plan is already locked.
  - Placement: a small `Text` note directly below the Copy button — _"This week isn't locked
    in yet — lock it on This Week to save it to your history."_ with a link/`RouterLink` to
    `/plan`.
  - It is not an error style (no red); `aria-live` is not required (it is static, not a
    response to an action). It may appear before the first copy.
  - Copying still succeeds and shows _"Copied!"_ regardless.
- **Priority**: Should

### FR-6: `/plan` helper-line states

- **Description**: The `/plan` header carries one calm helper line reflecting where the user
  is in committing the week.
- **Acceptance Criteria**:
  - **0–2 selections, current week, unlocked**: _"Pick 3 dinners to lock in your week."_
  - **3 selections, current week, unlocked**: the FR-1 button + its context line (no separate
    helper line needed).
  - **Locked, current week**: FR-3's confirmation text.
  - **Past week**: no helper line (existing past-week rendering unchanged).
- **Priority**: Should

### FR-7: Tests

- **Description**: New coverage for the lock action + confirm; updated coverage for the
  Shopping List decoupling.
- **Acceptance Criteria**:
  - `PlanPage.test.tsx` (extended): button appears only at 3 picks / current week / unlocked;
    the inline confirm opens, `Escape` and "Keep editing" dismiss, "Lock it in" calls the lock
    mutation once; a failed lock shows the error and restores the pill; after success the
    locked view renders with the reworded text.
  - `ShoppingListPage.test.tsx` (updated): copying **never** calls a lock mutation (the import
    is gone); success text is _"Copied!"_; the FR-5 nudge shows for an unlocked 3-pick current
    week and is absent when locked.
  - Existing `weekly-plan`, `shopping-list`, `cooking-view` suites stay green.
- **Priority**: Must

---

## Non-Functional Requirements

### Compatibility / Architecture

| Requirement       | Notes                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| No schema change  | Reuses `weekly_plans.locked_at`, `lock_weekly_plan` RPC, `useLockPlan`, the `meal_history` trigger. No migration. |
| No new backend    | Client-only change plus the existing RPC.                                                                         |
| Component library | Chakra UI v2 + existing theme; `009`'s inline-confirm pattern is the reference for FR-2.                          |
| Icons             | One new `uiIcons` entry (Lucide `Lock`) if not already present.                                                   |

### Accessibility

| Requirement       | Target                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Confirm focus     | Opening the pill focuses "Keep editing"; `Escape` cancels; success moves focus to a landmark. |
| Confirm semantics | `role="group"` + `aria-label` on the pill, matching `009`.                                    |
| Focus ring        | Existing global `:focus-visible` ring; no per-instance focus styling.                         |

### Regression

| Requirement   | Target                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Shopping list | Copy works for locked and unlocked plans; no lock side-effect; two-column / header-control layouts unchanged. |
| `/plan`       | Past-week and locked rendering unchanged apart from FR-3 wording.                                             |
| Meal history  | Still written by the existing trigger on the `locked_at` transition — unchanged.                              |
| Cooking view  | Untouched.                                                                                                    |

---

## Constraints

- Locking stays **one-way** in v1 — no unlock path (OQ-3 resolved: none).
- The lock action lives **only** on `/plan` — not the catalog, not the shopping list.
- The inline-confirm interaction **must** match `009`'s pattern (shared mental model, and
  `009` ships right after `011`).
- Household / single-family scope as `001`–`011`.

## Assumptions

| Assumption                                                                         | Risk if Invalid                             | Mitigation                                                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `PlanPage` already exposes `isCurrentWeek`, `isLocked`, `isFull`                   | FR-1's visibility rule needs new derivation | Verified in `PlanPage.tsx:35-39`                                                                |
| `useLockPlan` invalidates `currentPlanKey` on success so `/plan` re-renders locked | Manual refetch needed                       | Verified in `hooks.ts:82-91`                                                                    |
| Removing lock wiring from `ShoppingListPage` has no other consumer                 | A hidden dependency breaks                  | `useLockPlan` is only used by `ShoppingListPage` today (grep-verified) — it moves to `PlanPage` |
| `meal_history` trigger fires regardless of which code path sets `locked_at`        | History misses when locking moves pages     | Verified — trigger is on the column transition (ADR-002), not in the RPC                        |

## Open Questions — RESOLVED 2026-09-03

| #    | Question                                            | Resolution                                                                                                                            |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Lock action home                                    | **`/plan` header only.**                                                                                                              |
| OQ-2 | Shopping-list nudge when copying unlocked           | **Include it** (FR-5), non-blocking.                                                                                                  |
| OQ-3 | Unlock path                                         | **None in v1.** One-way lock; a mistaken lock resolves at rollover once `011` ships. Owner-only unlock is a possible later follow-up. |
| OQ-4 | Near-week-end nudge (old flow C)                    | **Deferred** to a follow-up — needs `011`'s rollover date; keep this intent focused on the decoupling. Not an FR here.                |
| OQ-5 | Locked-view wording ("shopping list has been sent") | **Reword** to "locked in — saved to your history" (FR-3).                                                                             |
| OQ-6 | Sequencing vs `011`                                 | **`012` before `011`.**                                                                                                               |

## Priority Definitions

| Priority | Meaning                                                 |
| -------- | ------------------------------------------------------- |
| Must     | The decoupling is incomplete or unsafe without it       |
| Should   | Real value (the nudges, helper states) but not blocking |
| Could    | Polish (the "next week opens" line)                     |
| Won't    | See Out of Scope                                        |

## Out of Scope (Won't — this intent)

- The planning-week rollover / window itself — intent `011`.
- The manual mid-week "Clear picks" reset — intent `009`.
- Any unlock / relock subsystem.
- Rewriting or deleting `meal_history` rows.
- The near-week-end "lock before rollover" nudge (revisit after `011`).
