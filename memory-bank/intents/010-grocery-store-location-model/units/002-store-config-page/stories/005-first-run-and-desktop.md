---
id: 005-first-run-and-desktop
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: complete
priority: should
created: '2026-09-04T14:30:00Z'
assigned_bolt: 053-store-config-page
implemented: true
---

# Story: 005-first-run-and-desktop

## User Story

**As a** household member with no store configured yet, or on a desktop-width screen
**I want** the page to read correctly at both ends
**So that** an empty path feels like a normal starting point, and desktop width doesn't
reintroduce the two-panel layout

## Acceptance Criteria

- [ ] **Given** no Locations configured, **When** the page renders, **Then** a single panel
      shows: a heading, body copy suggesting a starting point, one primary "Add the first
      stop" action, and a closing line stating the interim behavior (lists stay alphabetical
      until then). No red/warning styling — this is a normal first-run state. This is the
      state a household with no prior configuration sees after unit 1's cutover (story 007)
      seeds their empty Store.
- [ ] **Given** a desktop-width viewport, **When** the page renders, **Then** it stays a
      single column at a 600–720px measure inside the existing persistent left rail
      (`005-desktop-layout`); the item preview moves onto the same line as the location
      name; the expanded item area gets a wider inset. No second panel appears at any width.
- [ ] **Given** the active Store (read-only in v1), **When** rendered, **Then** it shows as a
      small chip beside the page title — sized/positioned as a future v2 control, so adding
      the selector later is a behavioral change only.

## Technical Notes

- Reuses the responsive test infrastructure from `005-desktop-layout` story 009
  (`matchMedia` polyfill + `ChakraProvider` wrapper).

## Dependencies

### Requires

- 002-walking-path-list

### Enables

- 007-store-config-tests

## Edge Cases

| Scenario                                                 | Expected Behavior                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| A household adds its first stop from the first-run panel | Panel is replaced by the normal walking-path list on the next render    |
| Desktop width with a very long path (many locations)     | Page scrolls vertically; still a single column, no reflow to two panels |

## Out of Scope

- Any v2 store-selector behavior
