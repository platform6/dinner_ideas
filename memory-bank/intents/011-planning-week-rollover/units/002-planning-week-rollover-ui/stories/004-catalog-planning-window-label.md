---
id: 004-catalog-planning-window-label
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 047-planning-week-rollover-ui
implemented: true
---

# Story: 004-catalog-planning-window-label

## User Story

**As a** household member browsing the catalog
**I want** to see which week I'm planning dinners for
**So that** I'm never guessing whether these picks are for this week or the next

## Acceptance Criteria

- [ ] **Given** the catalog page, **When** it renders, **Then** a small element in the header
      area shows `formatWeekRange(currentPlanningWeekStart(weekStartDay))` (the existing helper,
      output unchanged — e.g. "9/7 – 9/13").
- [ ] **Given** `/plan` at offset 0, **When** both are on screen paths, **Then** the catalog
      label and the `/plan` week-nav label for the current week read **identically**.
- [ ] **Given** no plan exists for the current planning week, **When** the catalog renders,
      **Then** the label is still shown — it describes the window, not the plan.
- [ ] **Given** the existing catalog header (count `Badge`, the `009` "Clear picks" slot later,
      the "Not interested" `IconButton`, `justify="space-between"`, `flexWrap="wrap"`),
      **When** the label is added, **Then** none of those controls move or wrap differently on
      a narrow phone; header min-height and hit targets are unchanged.
- [ ] **Given** `weekStartDay` is still loading, **When** the catalog renders, **Then** the
      label shows a neutral placeholder (or is withheld) rather than flashing a wrong range.

## Technical Notes

- Reuse `formatWeekRange` exactly — no new formatter, no `MM/dd` change (resolved OQ-6).
- Likely a `Text textStyle="eyebrow"` above the page title, matching how `/plan` and the
  shopping list show their eyebrow line.

## Dependencies

### Requires

- 001-planning-week-date-helpers
- 002-week-aware-current-plan

### Enables

- 006-rollover-regression-tests

## Edge Cases

| Scenario                        | Expected Behavior                                                    |
| ------------------------------- | -------------------------------------------------------------------- |
| Window crosses a month boundary | `formatWeekRange` already handles "9/28 – 10/4"                      |
| Very narrow viewport            | Label wraps under the title with the rest of the header, no overflow |

## Out of Scope

- The rollover recompute that changes what the label shows (story 005)
- Any `/plan` change (its label already exists)
