---
id: 003-dinner-step-by-step-instructions
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T19:43:10Z'
assigned_bolt: null
implemented: true
---

# Story: 003-dinner-step-by-step-instructions

## User Story

**As a** wife actually cooking one of her picked dinners
**I want** clear, ordered, step-by-step instructions for each dinner
**So that** I can follow along easily instead of parsing one dense sentence

## Acceptance Criteria

- [ ] **Given** the migration is applied, **When** I inspect the schema, **Then** a `dinner_steps` table exists with a dinner reference, a step number, and an instruction text
- [ ] **Given** any seed dinner, **When** I query its steps ordered by step number, **Then** I get a sensible, ordered sequence of discrete cooking actions (not one run-on sentence)
- [ ] **Given** all 50 seed dinners, **When** I check step counts, **Then** every dinner has at least 2 steps
- [ ] **Given** RLS is enabled, **When** an unauthenticated request queries `dinner_steps`, **Then** it is denied; the authenticated household session succeeds

## Technical Notes

- New table `dinner_steps`: `id`, `dinner_id` (FK → `dinners`), `step_number` (integer), `instruction` (text) — mirrors the existing `dinner_ingredients` pattern for consistency.
- `UNIQUE (dinner_id, step_number)` so steps have a well-defined order with no duplicates/gaps ambiguity.
- This is additive to the existing `dinners`/`dinner_ingredients` schema from bolt `001-dinner-catalog` — applied via a new migration, not an edit to the original one.
- The existing `dinners.instructions` column (a one-line summary) is left as-is; `dinner_steps` is the new, separate source for the cooking view (FR-8). No need to reconcile/deprecate the summary field.
- Step content is derived from each dinner's existing one-line instruction, expanded into discrete imperative steps (e.g. splitting compound actions like "toss X; roast Y for 30 min" into separate steps, adding a closing "serve" step where natural).

## Dependencies

### Requires
- 001-dinner-catalog-schema (existing `dinners` table to reference)

### Enables
- `003-weekly-dinner-planner-ui`'s cooking-view story

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Re-running the seed migration | Idempotent — no duplicate steps (delete-then-insert per dinner, or `ON CONFLICT (dinner_id, step_number) DO UPDATE`) |
| A dinner with a very simple prep (e.g. assemble-only) | Still has at least 2 steps — even a simple dinner benefits from explicit "prep" then "serve" steps |

## Out of Scope

- Rewriting/deprecating the existing `dinners.instructions` summary field
- Any UI — see `003-weekly-dinner-planner-ui`'s cooking-view story
