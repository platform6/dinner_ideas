---
id: 001-footer-never-hides-content
unit: 004-mobile-overlap-fixes
intent: 019-ui-correctness-fixes
status: planned
priority: should
created: '2026-09-17T16:01:11Z'
assigned_bolt: null
implemented: false
---

# Story: 001-footer-never-hides-content

## User Story

**As a** household member using the app on a phone
**I want** every shopping-list item to be readable above the copy footer
**So that** I never miss an ingredient in the store

## Acceptance Criteria

- [ ] **Given** a phone-width list of any length, **When** scrolled to the end, **Then** the last item and its move-to-aisle control are fully visible above the footer, and the footer is fully visible above the tab bar
- [ ] **Given** focus moves to an item, **Then** the page scrolls it into view above the footer
- [ ] Content passing beneath the footer mid-scroll is expected, not a defect
- [ ] At md+ nothing changes
- [ ] Verified at phone width in the running app, not only in jsdom

## Technical Notes

- Footer: `ShoppingListPage.tsx:429-430`, `position="sticky"`, `bottom="70px"`
- `scroll-padding-bottom` on the scroll container is the usual way to keep focused content clear of a sticky footer

## Dependencies

- None
