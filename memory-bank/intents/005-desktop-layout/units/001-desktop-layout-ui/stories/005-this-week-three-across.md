---
id: 005-this-week-three-across
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: should
created: '2026-08-28T19:30:00Z'
assigned_bolt: 033-desktop-layout-ui
implemented: true
---

# Story: 005-this-week-three-across

## User Story

**As a** household member on a laptop
**I want** the week's three dinners side by side
**So that** the week reads at a glance instead of as three wide, mostly-empty rows

## Acceptance Criteria

- [ ] **Given** md+, **When** This week renders with picks, **Then** they lay out as
      `SimpleGrid columns={{ base: 1, md: 3 }} gap={3}` (replacing the current `Stack gap={2}`)
- [ ] **Given** an md+ pick card, **When** rendered, **Then** it is `bg="brand.50"`,
      `borderWidth="1px"`, `borderColor="line.brandSubtle"`, `borderRadius="card"`, `p={3.5}`; a 28px
      `borderRadius="full"` `bg="brand.500"` numbered badge top-left; remove button top-right; below
      them a full-width 76px `bg="paper.sunken"` `borderRadius="control"` photo slot; then the name at
      `textStyle="cardTitle"`; then cuisine · cook time at `textStyle="meta"`
- [ ] **Given** md+, **When** rendered, **Then** the week arrows stay in the page header
- [ ] **Given** a viewport < 768px, **When** rendered, **Then** the existing horizontal rows are unchanged
- [ ] **Given** the photo slot, **When** rendered, **Then** it is the empty `paper.sunken` tile (no
      image field on the model — same decision as `003` finding 12)

## Technical Notes

- Current selections render at `PlanPage.tsx:136` `<Stack gap={2}>` → `selections.map(...)` with the
  `layerStyle="cardSelected"` row from `003` bolt `025`.
- Keep the empty / all-picked / locked dashed-card states as they are; this story only changes the
  picked-rows layout at md+.

## Dependencies

### Requires

- `001-left-rail-navigation` + `002-content-measure-cap` (bolt `032`)

### Enables

- None

## Edge Cases

| Scenario           | Expected Behavior                                              |
| ------------------ | -------------------------------------------------------------- |
| Fewer than 3 picks | Grid still `columns={{ md: 3 }}`; 1–2 cards fill from the left |
| Locked week        | Same 3-across layout; remove buttons hidden/disabled as today  |

## Out of Scope

- Real photos in the slot; multi-week calendar
