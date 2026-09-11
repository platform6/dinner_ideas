---
id: 002-servings-setting-control
unit: 001-serving-size-setting
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T18:25:00Z'
assigned_bolt: null
implemented: false
---

# Story: 002-servings-setting-control

## User Story

**As a** household owner
**I want** to set how many people we cook for
**So that** imported recipes can be scaled to us rather than to a stranger's assumption

## Acceptance Criteria

- [ ] **Given** `/settings`, **When** viewed by an owner, **Then** a control shows the current
      serving size and can change it
- [ ] **Given** a change, **When** saved, **Then** it persists and the rest of the app reads it
      immediately
- [ ] **Given** the control, **When** shown, **Then** it explains what the number is FOR — it drives
      imported quantities and the entry form's guidance (Checkpoint 1 decision: "make it explain itself")
- [ ] **Given** a non-owner, **When** viewing, **Then** the same rule the other household settings
      already apply is applied here — consistency, not a new access model

## Technical Notes

- `PlanningWeekCard` holds `week_start_day` and `dinners_per_week`; this likely belongs beside them
