---
id: 003-login-vertical-centring
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: should
created: '2026-08-28T19:30:00Z'
assigned_bolt: 032-desktop-layout-ui
implemented: true
---

# Story: 003-login-vertical-centring

## User Story

**As a** household member signing in on a laptop
**I want** the login card centred in the window
**So that** it doesn't sit low and off-balance below a big empty area

## Acceptance Criteria

- [ ] **Given** `LoginForm.tsx`, **When** rendered at md+, **Then** the `maxW="sm"` card is
      vertically centred in the viewport (the `mt={{ base: 12, md: 24 }}` top-margin approach is replaced)
- [ ] **Given** a viewport < 768px, **When** rendered, **Then** spacing is preserved (or very close)
- [ ] **Given** the change, **When** the suite runs, **Then** `LoginForm` fields, copy and `useAuth`
      behaviour are unchanged and its tests pass

## Technical Notes

- Current: `<Box maxW="sm" mx="auto" mt={{ base: 12, md: 24 }} px={{ base: 5, md: 4 }}>` (L49).
- Simplest: at md+ wrap in a `minH="100vh"` flex centred column (or `Center`), keep the phone
  `mt` for base.

## Dependencies

### Requires

- None (independent of the rail; grouped in bolt `032` as it's small login polish)

### Enables

- None

## Edge Cases

| Scenario                      | Expected Behavior                     |
| ----------------------------- | ------------------------------------- |
| Short laptop window (768×600) | Card centred; scrolls if it can't fit |

## Out of Scope

- Restyling the login card itself (done in `002-kitchen-table-theme`)
