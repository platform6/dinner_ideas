---
id: 006-copy-shopping-list-to-clipboard
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 006-copy-shopping-list-to-clipboard

## User Story

**As a** wife with my shopping list ready
**I want** to copy it in one tap, with the option to lock my plan in at the same time
**So that** I can paste it straight into a text message to my husband, and choose when the plan is actually final

## Acceptance Criteria

- [ ] **Given** I'm viewing the shopping list, **When** I tap "Copy", **Then** the full list (grouped by category, plain text) is placed on my clipboard
- [ ] **Given** a checkbox "Also lock this week's plan" next to Copy, checked by default, **When** I tap "Copy" with it checked, **Then** the copy happens and the plan is locked (via `002-weekly-planning`'s lock RPC), and I see a brief confirmation (e.g. "Copied! This week's plan is locked in.")
- [ ] **Given** the same checkbox is unchecked, **When** I tap "Copy", **Then** only the copy happens — the plan is not locked, and the confirmation just says "Copied!"
- [ ] **Given** the plan was already locked (e.g. I copy with the checkbox on a second time), **When** I tap "Copy" again, **Then** it just re-copies the same list without erroring — locking is idempotent from the UI's perspective
- [ ] **Given** I paste the copied text into a messaging app, **When** viewed there, **Then** it's readable plain text with category headings and items (no markup/HTML)

## Technical Notes

- Use the browser Clipboard API (`navigator.clipboard.writeText`).
- Format: category heading line, then one ingredient per line underneath (e.g. `Produce\n- 2 onions\n- 1 lb spinach`).
- **Revised 2026-08-26 during bolt `005-weekly-dinner-planner-ui` Stage 1 (Plan)**: copy and lock are decoupled. A checkbox ("Also lock this week's plan"), checked by default, controls whether tapping "Copy" also calls the `lock_weekly_plan` RPC. If checked and the RPC reports "already locked," treat that as success (no user-facing error) — the end state (locked, list copied) is what was wanted. If unchecked, copying never locks, regardless of the plan's current state. See `inception-log.md`-style scope note in the unit's `construction-log.md`.

## Dependencies

### Requires
- 005-generate-shopping-list

### Enables
- None (final step in the core user flow)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Clipboard API unavailable/blocked by browser | Fall back to a selectable text block the user can manually copy (still triggers the lock) |
| Lock RPC fails for a reason other than "already locked" (e.g. selection count somehow isn't 3) | Show a clear error; the copy may have already happened, so the message should be about the lock failing, not the copy |

## Out of Scope

- Directly sending an SMS from the app — this is intentionally a manual copy/paste step, not an automated integration (per `system-context.md`)
