---
unit: 001-copy-corrections
intent: 019-ui-correctness-fixes
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-09-17T15:57:07Z'
updated: '2026-09-17T15:57:07Z'
---

# Unit Brief: Copy Corrections

## Purpose

Make every count and name on screen agree with the app's state.

## Scope

### In Scope

- The lock help text and the full-plan message on `/plan` read `dinners_per_week`, with singular forms for 1
- `DinnerCard.tsx` doc comments that say "3 dinners"
- The catalog button's text becomes "Add a dinner"
- Rendered-text tests that stop both regressions coming back

### Out of Scope

- Count copy outside `/plan` (none found in `src/`)
- Visual styling of these messages (intent 020)

## Notes

Intent 015 made the count a setting and swept most literals. Two survived because the tests used the default household, where N = 3 and the stale copy happens to be true. **Test with N ≠ 3.**

## Stories

- `001-plan-copy-reads-dinner-count`: Plan copy states the household's dinner count (Must)
- `002-one-name-for-add-a-dinner`: "Add a dinner" everywhere (Should)
