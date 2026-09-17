---
stage: plan
bolt: 073-copy-corrections
created: '2026-09-17T16:08:19Z'
---

## Implementation Plan: copy-corrections

### Objective

Make every count on `/plan` come from the household's `dinners_per_week`, and name the catalog's add
action "Add a dinner" everywhere. Pin both with tests that would have caught the original misses.

### Why these survived intent 015

`PlanPage.test.tsx` mocks `@/features/settings/api` with no return value for `fetchDinnersPerWeek`,
so `useDinnersPerWeek().data` is `undefined` and the page falls back to `?? 3`. **Every existing
plan-page test runs at N = 3**, where "Locks these 3 dinners" and "All three picked" happen to be
true. The fix is as much the test fixture as the copy.

### Deliverables

1. **`PlanPage.tsx` lock help text** (`:131`): reads the count.
   - N ≠ 1: "Locks these N dinners and adds them to your history. You can still shop your list
     either way."
   - N = 1: "Locks this dinner and adds it to your history. You can still shop your list either way."
2. **`PlanPage.tsx` full-plan message** (`:274`):
   - N ≠ 1: "All N dinners picked. Your shopping list is ready."
   - N = 1: "Your dinner is picked. Your shopping list is ready."
3. **`LockWeekControl.tsx` confirmation** (found during planning; see Scope note): "Lock in these
   {N}?" reads "Lock in these 1?" at N = 1. For N = 1 it becomes "Lock in this dinner?"; otherwise
   unchanged.
4. **Stale comments**: `DinnerCard.tsx:36` ("True when 3 dinners are already selected") and
   `:194-195` ("'Full' once 3 are already chosen") say `dinners_per_week`. `PlanPage.tsx:55`
   ("lays the three picks side by side") says "the picks".
5. **`CatalogPage.tsx:189`**: the md+ button text becomes "Add a dinner". The phone `IconButton`'s
   aria-label and the entry page heading already say it and are untouched.
6. **Tests** (details in Stage 3):
   - `PlanPage.test.tsx`: the lock help text and the full-plan message rendered at N = 1, 3 and 5,
     with N set explicitly through `fetchDinnersPerWeek`; at N = 5, no "3 dinners" or "three" in
     the page text. The existing `/all three picked/i` assertion is updated.
   - `LockWeekControl.test.tsx` (exists): singular confirmation at N = 1.
   - `CatalogPage.test.tsx`: at md+ the link's visible text is "Add a dinner".
   - A guard test that scans `src/**/*.tsx` source (excluding tests) for a user-facing `Add dinner`
     string literal or JSX text, and fails if one appears.

### Dependencies

- `useDinnersPerWeek` (`features/settings/hooks.ts`), already imported by `PlanPage` and already
  passed into `LockWeekControl` as `dinnersPerWeek`. No new data.
- None on other bolts or units. No schema change (NFR-1).

### Technical Approach

- **Pluralisation**: a small local helper in `PlanPage.tsx` choosing between the two phrasings by
  `dinnersPerWeek === 1`, matching the existing inline pattern at `:117`
  (`dinnersPerWeek === 1 ? 'dinner' : 'dinners'`). No i18n library; one household, English only.
- **Which N**: the full-plan message and the lock help text only render when
  `selections.length === dinnersPerWeek`, so using `dinnersPerWeek` and `selections.length` is
  equivalent there. Use `dinnersPerWeek`, consistent with `:117`.
- **Test fixture**: in `PlanPage.test.tsx`, mock `fetchDinnersPerWeek` explicitly (default 3 in
  `beforeEach`) and build N selections with a helper instead of the fixed `threeSelections`, so a
  test can say "N = 5" in one line.
- **Guard test**: read every `src/**/*.tsx` source file except tests through Vite's
  `import.meta.glob` with the `?raw` query (eager), and match "Add dinner" when it follows `>` or
  opens a string literal. That catches JSX text and string literals, not comments. No new
  dependency. It lives beside the catalog (`features/dinners/add-a-dinner-wording.test.ts`).
- **Phone width**: the "Add a dinner" text appears only in the md+ button, which is hidden below
  md, so the phone header, which the catalog comment says is already tight, is unaffected.

### Scope note

Deliverable 3 (`LockWeekControl`) was not named in story 001, but it renders on `/plan`, and FR-1
says every count on `/plan` comes from `dinners_per_week`. At N = 1 it is the same class of bug. If
the product owner prefers, it can be dropped at this checkpoint with no effect on the rest.

### Acceptance Criteria

- [ ] At N = 5 with 5 picks, `/plan` shows "Locks these 5 dinners and adds them to your history…"
      and "All 5 dinners picked. Your shopping list is ready."
- [ ] At N = 1 with 1 pick, `/plan` shows "Locks this dinner and adds it to your history…", "Your
      dinner is picked. Your shopping list is ready.", and, after "Lock in this week", "Lock in this
      dinner?"
- [ ] At N = 3, the copy reads "Locks these 3 dinners…" and "All 3 dinners picked…"
- [ ] At N = 5, neither "3 dinners" nor "three" appears in the rendered `/plan` text. A bare "3"
      cannot be asserted absent: the week label renders dates such as "9/13".
- [ ] `DinnerCard.tsx` and `PlanPage.tsx` comments no longer describe the count as 3
- [ ] The md+ catalog button reads "Add a dinner"; the phone aria-label and page heading are
      unchanged
- [ ] The guard test fails when "Add dinner" is reintroduced as JSX text or a string literal, and
      passes on the fixed source
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
