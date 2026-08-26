---
id: 008-pwa-install-offline
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: should
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 008-pwa-install-offline

## User Story

**As a** wife using this mostly on my phone
**I want** to install the app to my home screen and still see my shopping list without a signal
**So that** it feels like a real app and works reliably while I'm grocery shopping

## Acceptance Criteria

- [ ] **Given** I visit the app on a mobile browser, **When** the PWA criteria are met, **Then** I'm able to install it to my home screen
- [ ] **Given** I've loaded the app while online, **When** I lose network connectivity, **Then** I can still view the current confirmed shopping list
- [ ] **Given** I open the installed app, **When** it launches, **Then** it opens full-screen (no browser chrome), consistent with a native-feeling app

## Technical Notes

- `vite-plugin-pwa` for manifest + service worker generation, per `standards/tech-stack.md`.
- Offline caching scope: static app shell + the current confirmed weekly plan/shopping list data. Full catalog browsing offline is a nice-to-have, not required.

## Dependencies

### Requires
- 005-generate-shopping-list (something meaningful to cache/view offline)

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| First-ever visit with no network | App shell may not be cached yet — a clear "you're offline, please connect once to load the app" message is acceptable |
| App update deployed while installed | Service worker updates on next online launch without breaking the cached offline view |

## Out of Scope

- Offline *editing* (e.g. selecting dinners while offline) — read-only offline access to the current shopping list is sufficient for MVP
