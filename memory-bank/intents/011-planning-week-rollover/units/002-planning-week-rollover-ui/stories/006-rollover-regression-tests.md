---
id: 006-rollover-regression-tests
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 047-planning-week-rollover-ui
implemented: true
---

# Story: 006-rollover-regression-tests

## User Story

**As a** developer changing the shared `useCurrentPlan` hook
**I want** the rollover behaviour and every downstream consumer covered by tests
**So that** the "current = this planning week" redefinition can't silently break the shopping
list, cooking view, `/plan`, or locking

## Acceptance Criteria

- [ ] **Given** `date.test.ts`, **When** it runs, **Then** the story-001 helper cases pass
      (all weekdays, boundaries, month/year wrap, DST weeks).
- [ ] **Given** catalog tests, **When** they run, **Then** they cover: the window label
      renders and matches `formatWeekRange`; `0 of 3` empty state when no plan exists for the
      week; an older **unlocked** plan does **not** populate the grid; a first pick creates a
      week-aligned plan that is found again after a simulated reload.
- [ ] **Given** a simulated week-boundary crossing (mocked `todayIsoDate`), **When** the app
      re-mounts, **Then** tests assert: new window label, empty catalog, `/plan` offset 0 =
      new week, previous week at offset −1 still has its picks.
- [ ] **Given** regression tests, **When** they run, **Then** they confirm **unchanged**
      behaviour for: `/plan` week navigation (offsets, `formatWeekRange`), `012` locking (lock
      acts on the current planning week's plan; `meal_history` still written), shopping-list
      generation, and cooking view — each operating on the current planning week's plan.
- [ ] **Given** the full suite, **When** CI runs, **Then** existing `weekly-plan`, `dinners`,
      `shopping-list`, and `cooking-view` tests pass, with assertion changes limited to the
      intentional ones above.
- [ ] **Given** the consumer audit from story 002, **When** this story completes, **Then** its
      findings (which consumers changed, which kept a separate call, why) are written into the
      bolt's `implementation-walkthrough.md` / notes.

## Technical Notes

- Mock `todayIsoDate` (or inject a clock) to drive boundary tests deterministically.
- Prefer testing `useCurrentPlan` resolution via `fetchPlanByStartDate` spy assertions over a
  full Supabase mock.
- Reuse the `matchMedia` / `ChakraProvider` test infrastructure from `005-desktop-layout`
  story 009 where component rendering is needed.

## Dependencies

### Requires

- 001-planning-week-date-helpers
- 002-week-aware-current-plan
- 003-week-aligned-plan-creation
- 004-catalog-planning-window-label
- 005-rollover-on-app-open

### Enables

- None (last story of the unit / intent)

## Edge Cases

| Scenario                                                           | Expected Behavior                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| A test still asserting "newest plan by created_at" for the catalog | Updated to the planning-week resolution or removed      |
| `ShoppingListPage` test that assumed a lingering plan              | Updated to the empty-week / current-week plan behaviour |

## Out of Scope

- E2E / browser tests
- Load / performance testing
