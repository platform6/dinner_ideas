---
id: 023-frontend-review-ui
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 002-alert-palette
  - 003-menu-textarea-closebutton-theme
  - 004-global-focus-ring
  - 005-name-brand-subtle-hairline
created: '2026-08-28T17:10:00Z'
started: '2026-08-28T18:50:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T18:52:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T18:56:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T18:58:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 022-frontend-review-ui
enables_bolts:
  - 024-frontend-review-ui
  - 025-frontend-review-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-28T18:53:46Z'
---

# Bolt: 023-frontend-review-ui

## Objective

Apply the rest of `theme-patch.ts` — §2 (`line.brandSubtle`), §3 (Menu / Textarea / CloseButton),
§4 (Alert palette), §5 (global focus ring) — to `src/shared/theme/index.ts`, plus the one call-site
edit the token rename forces (`CookingViewPage.tsx`'s `#E3E7DA` literal). Still essentially one
file.

## Stories Included

- [ ] **005-name-brand-subtle-hairline**: `line.brandSubtle` token + replace 3 `#E3E7DA` literals — Priority: Could
- [ ] **002-alert-palette**: `Alert` entry → `heart` / `brand` (§4) — Priority: Should
- [ ] **003-menu-textarea-closebutton-theme**: three new `components` entries (§3) — Priority: Must
- [ ] **004-global-focus-ring**: promote the ring to `styles.global`, drop `Button`'s copy (§5) — Priority: Must

Implement `005` first — `002` and `003` reference `line.brandSubtle`.

## Expected Outputs

- `src/shared/theme/index.ts` — `line.brandSubtle`; `Alert`, `Menu`, `Textarea`, `CloseButton`
  entries; `styles.global` focus ring; `Button` baseStyle ring removed
- `src/features/cooking-view/components/CookingViewPage.tsx` — `#E3E7DA` → `line.brandSubtle`
- Updated tests where they pinned Chakra defaults
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **022-frontend-review-ui** (Required): same file — sequenced after

### Unit Dependencies (cross-unit)

- `002-kitchen-table-theme` — complete

### Enables

- 024-frontend-review-ui, 025-frontend-review-ui (both build on the themed foundation)

## Success Criteria

- [ ] No `#E3E7DA` literal remains in `src/`
- [ ] All 11 `<Alert>` call sites render Kitchen Table tokens, no call site edited
- [ ] Dinner-card overflow menu, Cuisine and Tags dropdowns render themed panels (not Chakra white/blue)
- [ ] Keyboard focus shows the olive ring on the cooking accordion headers and the pick checkbox; `Button` shows one ring
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; suite green
- [ ] Code reviewed

## Notes

Diff `theme-patch.ts` section-by-section against the current theme file before applying; the
handoff predates a couple of the enhancement-round component tweaks.
