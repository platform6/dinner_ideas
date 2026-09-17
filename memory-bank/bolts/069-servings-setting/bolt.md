---
id: 069-servings-setting
unit: 001-serving-size-setting
intent: 018-serving-scale-and-removal
type: ddd-construction-bolt
status: complete
stories:
  - 001-servings-column
  - 002-servings-setting-control
  - 003-no-more-hardcoded-three
created: '2026-09-11T16:24:16Z'
started: '2026-09-11T16:25:09Z'
completed: '2026-09-11T17:44:42Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-11T16:45:44Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-11T16:50:47Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-11T17:31:46Z'
    artifact: adr-014-stored-quantities-mean-what-is-cooked.md
  - name: implement
    completed: '2026-09-11T17:38:21Z'
    artifact: supabase/migrations/20260911173308_servings_per_dinner.sql
  - name: test
    completed: '2026-09-11T17:44:41Z'
    artifact: ddd-03-test-report.md
requires_bolts: []
enables_bolts:
  - 070-extraction-reports-servings
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 069-servings-setting

## Objective

Give the household a serving size, and stop writing 3 into the app.

## Why `ddd-construction-bolt`

A migration with a constraint, and a value the rest of the app reads. Intent 015's bolt 063 is the
same shape and was a `ddd-construction-bolt`; this one is simpler — no trigger rewrite — but it
still puts a rule in Postgres and deserves the model and design stages that make the constraint a
decision rather than a guess.

## What matters here

**The default is what protects existing households.** Defaulting to 3 means the migration is a
no-op for behaviour: nothing changes until somebody chooses to change it.

**FR-6 is a grep, and greps miss things.** A number written into a sentence is easy to overlook.
Test the RENDERED guidance against a changed setting, not the existence of a constant.

**ADR-12 applies** to any function this replaces: restate `set search_path = ''`. That has already
cost this project one corrective release.

## Definition of Done

- `households.servings_per_dinner` exists, defaults to 3, constrained
- A `/settings` control writes it and explains what it is for
- No user-visible "3 servings" literal remains anywhere
- The ingredients guidance changes when the setting changes, asserted on rendered text
- pgTAP for the column and its constraint; `tsc -b`, `eslint`, `vitest` green
