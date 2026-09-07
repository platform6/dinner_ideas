---
id: 001-recipe-entry-route
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 059-recipe-draft-form
implemented: false
---

# Story: 001-recipe-entry-route

## User Story

**As a** household member who just found a dinner worth keeping
**I want** an obvious way to add it from the catalog
**So that** the catalog stops being a fixed list of fifty and starts being ours

## Acceptance Criteria

- [ ] **Given** the catalog, **When** it renders, **Then** a control leads to the entry page —
      discoverable without knowing a URL.
- [ ] **Given** the entry route, **When** an unauthenticated visitor reaches it, **Then** they are
      treated exactly as every other protected route in the app treats them; this story adds no
      new auth mechanism.
- [ ] **Given** a phone, **When** the page renders, **Then** it is usable at the app's existing
      breakpoints — this is a form that will be filled on a phone.
- [ ] **Given** the page, **When** it first loads, **Then** both ways in are visible: type it, or
      paste it. The paste path may be inert until unit 002 lands, but the page's shape must not
      have to change to accommodate it.

## Technical Notes

- Routing follows whatever the app already does for `/store` and `/settings`; no new pattern.
- The catalog's control should read as "add", not "import" — importing is one of two ways in, not
  the headline.

## Dependencies

### Requires

- None

### Enables

- Every other story in this unit

## Out of Scope

- The paste box's behaviour (unit 002)
- Any edit or delete affordance on existing dinners
