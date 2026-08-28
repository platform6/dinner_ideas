---
id: 006-store-setup-side-by-side
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: should
created: '2026-08-28T19:30:00Z'
assigned_bolt: 033-desktop-layout-ui
implemented: true
---

# Story: 006-store-setup-side-by-side

## User Story

**As a** household member configuring the store layout on a laptop
**I want** the store-rows list and the category-assignment list side by side
**So that** I can see a row's name while choosing it in a dropdown, instead of scrolling between them

## Acceptance Criteria

- [ ] **Given** md+, **When** Store setup renders, **Then** the two `Box` sections (store rows,
      category assignments) sit in `SimpleGrid columns={{ base: 1, md: 2 }} gap={8}`
- [ ] **Given** md+, **When** rendered, **Then** the page is capped at 1080px (via `WIDE_ROUTES`
      already containing `/store-config`)
- [ ] **Given** the category-assignment rows, **When** rendered, **Then** each uses `layerStyle="card"`
      (they are bare `HStack`s today — `StoreConfigPage.tsx:179`)
- [ ] **Given** a viewport < 768px, **When** rendered, **Then** the two sections are stacked, unchanged
- [ ] **Given** the change, **When** the suite runs, **Then** `StoreConfigPage` tests pass

## Technical Notes

- `StoreConfigPage.tsx`: `Stack gap={6}` wraps the two `<Box>` sections (rows at L78, assignments
  at L165). Wrap those two in the `SimpleGrid`.
- The row list already uses `layerStyle="card"` (L95) — match it on the assignment rows so the two
  halves read as the same component.

## Dependencies

### Requires

- `002-content-measure-cap` (`/store-config` in `WIDE_ROUTES` → 1080px)

### Enables

- None

## Edge Cases

| Scenario               | Expected Behavior                                           |
| ---------------------- | ----------------------------------------------------------- |
| No rows configured yet | The dashed empty-state card still shows in the left column  |
| Many categories        | Right column scrolls within the page; left column stays put |

## Out of Scope

- Drag-reorder of rows; any change to the reorder RPC
