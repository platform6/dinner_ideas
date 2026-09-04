---
id: 045-week-start-setting
unit: 001-week-start-setting
intent: 011-planning-week-rollover
type: simple-construction-bolt
status: planned
stories:
  - 001-week-start-day-column
  - 002-settings-planning-week-card
created: '2026-09-03T22:55:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts:
  - 044-explicit-plan-locking-ui
enables_bolts:
  - 046-planning-week-rollover-ui
requires_units: []
blocks: false

complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 045-week-start-setting

## Overview

Land the `households.week_start_day` column (additive migration + `database.types.ts` regen)
and a "Planning week" card on `/settings` so an owner can choose the weekday. Nothing consumes
the value yet — that is bolt 046.

## Objective

Give intent `011` a real, household-scoped, owner-editable week-start weekday with a safe
Sunday default, without adding any RLS policy or RPC.

## Stories Included

- **001-week-start-day-column**: additive `smallint` column + `check (0..6)` + comment + types
  regen; RLS unchanged (Must)
- **002-settings-planning-week-card**: owner-editable weekday card on `/settings`; disabled for
  non-owners; failure retains prior value; Sunday-default behaviour (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → supabase/migrations/, src/features/settings/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 044-explicit-plan-locking-ui (intent `012` ships before `011`; keeps the branch sequence
  linear)

### Enables

- 046-planning-week-rollover-ui (needs a readable `week_start_day`)

## Success Criteria

- [ ] Migration applies; `week_start_day smallint not null default 0 check (0..6)` present;
      existing rows read `0`
- [ ] `database.types.ts` includes the column
- [ ] Owner can set the weekday on `/settings` and it persists; non-owner control disabled;
      failed update keeps the prior value
- [ ] No new RLS policy; a non-owner update is rejected by RLS (DB test or documented check)
- [ ] `tsc -b`, `eslint`, `vite build` clean; `settings` suite green

## Notes

Model `PlanningWeekCard` on `ClaudeAiCard`'s owner-gating, but simpler — plain PostgREST
`update` on `households`, no vault, no RPC.
