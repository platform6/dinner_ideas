---
stage: plan
bolt: 005-weekly-dinner-planner-ui
created: 2026-08-26T21:50:17Z
---

## Implementation Plan: weekly-dinner-planner-ui (bolt 3 of 4)

**Revised 2026-08-26** during this stage's checkpoint — see `construction-log.md` Replanning History. Copy and lock are decoupled: a checkbox controls whether copying also locks, rather than every copy locking automatically.

### Objective

Turn the current plan's 3 picks into one merged, category-grouped shopping list, with a one-tap copy to the clipboard and an explicit, checkbox-controlled option to lock the plan at the same time — the payoff feature of the app.

### Deliverables

**New feature: `src/features/shopping-list/`**
- `types.ts` — `ShoppingListItem` (`name`, `quantity`, `unit`, `category`), `ShoppingListGroup` (`category`, `items`)
- `aggregate.ts` — pure `buildShoppingList(dinners: DinnerWithIngredients[]): ShoppingListGroup[]`: merges ingredients across all 3 dinners by normalized name+unit (summing quantities), keeps mismatched-unit ingredients as separate lines, groups by category (falls back to "Other" for a missing/blank category), categories and items both sorted alphabetically for deterministic output
- `format.ts` — pure `formatShoppingListText(groups: ShoppingListGroup[]): string`: category heading line, then `- {quantity} {unit} {name}` per item, blank line between groups — plain text, pasteable into a text message
- `hooks.ts` — `useShoppingListDinners(dinnerIds: string[])`: `react-query` wrapper, `enabled` only when there are exactly 3 ids
- `components/ShoppingListPage.tsx` — the "Shopping List" page: gate message when fewer than 3 are picked (linking to the catalog/plan), the grouped list once ready, a "Also lock this week's plan" checkbox (checked by default) next to the "Copy" action, and post-copy confirmation/error states

**`dinners` feature**
- `api.ts`: add `fetchDinnersByIds(ids: string[])` — needed because the shopping list must work for the 3 picked dinners regardless of whether one has since been suppressed (historical/locked-plan case); the existing `fetchActiveDinners`/`fetchSuppressedDinners` filter by `is_active` and don't fit here

**`weekly-plan` feature**
- `api.ts`: add `lockPlan(planId: string)` — calls the `lock_weekly_plan` RPC from `002-weekly-planning`

**Routing & nav**
- `App.tsx`: add `/shopping-list` → `ShoppingListPage`
- `Layout.tsx`: add a "Shopping List" nav link

### Dependencies

- `004-weekly-dinner-planner-ui` (complete): the current plan/selections this bolt reads
- `002-weekly-planning` (complete): `lock_weekly_plan` RPC
- No new npm packages — `navigator.clipboard.writeText` is a browser API

### Technical Approach

- **Merge key**: normalized (trimmed, lowercased) ingredient name **and** unit — matching name with a mismatched unit stays a separate line, per the story's explicit "don't silently combine" requirement. Display keeps the first-encountered raw name/unit casing rather than the normalized form.
- **Grouping**: by `category` as stored (already curated per dinner in the seed data); a blank/missing category — not expected given the NOT NULL column, but handled defensively — falls into "Other".
- **Copy and lock are decoupled**, controlled by a checkbox ("Also lock this week's plan"), **checked by default**, next to the Copy button:
  1. Try `navigator.clipboard.writeText(text)`.
  2. Only if the checkbox is checked, also call `lockPlan(plan.id)` — treating an "already locked" RPC response as success (per story `006`, idempotent from the UI's perspective).
  3. Clipboard succeeded, checkbox checked → "Copied! This week's plan is locked in."
     Clipboard succeeded, checkbox unchecked → "Copied!"
     Clipboard failed/unavailable → render the text in a selectable read-only block instead, with "Couldn't copy automatically — select the text below to copy manually." (plus ", this week's plan is locked in" only if the checkbox was checked and the lock succeeded).
  4. If the **lock** call itself fails for a reason other than "already locked" (only possible when the checkbox was checked) → show an error specifically about the lock, not the copy (per the story's edge case — the copy may have already succeeded).
- **Availability gate**: the page shows the grouped list (and Copy button) whenever the current plan has exactly 3 selections, locked or not — re-copying an already-locked plan's list is explicitly supported (idempotent re-copy). Once the plan is locked, the lock checkbox is disabled (checked, informational only) since there's nothing left to lock.
- **No new npm dependency** for clipboard — `navigator.clipboard` is used directly, with the `document.execCommand`-based fallback intentionally skipped in favor of the simpler "selectable text block" fallback the story asks for.

### Acceptance Criteria

- [ ] Viewing the shopping list with exactly 3 selected dinners (locked or not) shows every ingredient from all 3
- [ ] Same ingredient + compatible unit across dinners is merged into one line with summed quantity
- [ ] Same ingredient with mismatched units stays as separate lines
- [ ] Items are grouped under category headings
- [ ] "Copy" places plain, readable text (headings + items, no markup) on the clipboard
- [ ] A "Also lock this week's plan" checkbox, checked by default, sits next to Copy
- [ ] Copying with the checkbox checked locks the plan and shows a brief confirmation mentioning both
- [ ] Copying with the checkbox unchecked copies only — the plan stays unlocked, confirmation just says "Copied!"
- [ ] Re-copying an already-locked plan's list (checkbox checked) works without error (idempotent lock)
- [ ] Clipboard failure falls back to a selectable text block; the lock checkbox's effect still applies
- [ ] A lock failure (not "already locked") shows an error specifically about locking, not copying
