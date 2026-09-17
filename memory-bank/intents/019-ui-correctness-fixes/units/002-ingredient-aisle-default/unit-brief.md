---
unit: 002-ingredient-aisle-default
intent: 019-ui-correctness-fixes
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-09-17T15:57:07Z'
updated: '2026-09-17T15:57:07Z'
---

# Unit Brief: Ingredient Aisle Default

## Purpose

Stop filing new ingredients under Produce, and use what the household has already told the app.

## Scope

### In Scope

- A draft line's aisle may be unset; manual lines start unset
- Save blocked with a per-line "Choose an aisle" error while any line is unset
- One read per form open of the household's name → aisle history
- Filling an unset or history-filled aisle when the name matches; never touching a chosen one
- Imported lines count as chosen

### Out of Scope

- Merging similar names (intent 023)
- Changing aisles on saved dinners
- Any schema change, including an aisle column on `items`

## Notes

`draft.ts:71` sets `category: 'Produce'` on every blank line. `parse.ts` already rejects a category outside the five, and `draft.ts:187` already validates category at save. The new work is letting the value be absent, recording **who set it**, and the history read.

## Stories

- `001-no-default-aisle`: A new line starts with no aisle, and saving requires one (Must)
- `002-aisle-from-household-history`: A known ingredient's aisle is filled from the household's dinners (Must)
