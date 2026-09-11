---
unit: 001-serving-size-setting
intent: 018-serving-scale-and-removal
phase: inception
status: ready
created: '2026-09-11T16:24:16Z'
updated: '2026-09-11T16:24:16Z'
---

# Unit Brief: Servings Per Dinner

## Purpose

Make the household's serving size a value it owns, instead of a 3 written into a prompt and a
form hint.

## Scope

### In Scope

- `households.servings_per_dinner` — additive, defaulted to 3, constrained to a sane range
- A `/settings` control that writes it, following `week_start_day` and `dinners_per_week`
- Replacing the hard-coded 3 in `prompt.ts` and in `IngredientLinesEditor`'s guidance line

### Out of Scope

- Any use of the value to actually scale anything — that is unit 002
- `dinners_per_week`, which is a different number about a different thing

## Notes

Intent 015's bolt 063 is the template: an additive column with a default, a check constraint, and
a Settings control. It is deliberately the least interesting unit here.

**The one thing worth care**: FR-6 says no screen and no prompt still says 3. That is a grep, and
greps miss things — a number in a sentence is easy to overlook. The test for this unit should
assert the _rendered_ guidance changes with the setting, not that a constant was exported.

## Stories

- `001-servings-column` — The column, defaulted and constrained (Must)
- `002-servings-setting-control` — Owner-editable control on /settings (Must)
- `003-no-more-hardcoded-three` — The literal 3 stops appearing (Must)
