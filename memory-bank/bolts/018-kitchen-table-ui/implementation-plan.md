---
stage: plan
bolt: 018-kitchen-table-ui
created: 2026-08-27T13:45:00Z
---

## Implementation Plan: kitchen-table-ui (Cooking view restyle)

### Objective

Restyle `CookingViewPage.tsx` per story `010` — the last of the original 6 documented screens
(story `011`, Suppressed view, was already pulled forward and completed in bolt `015`).

### Deliverables

- `CookingViewPage.tsx`: each dinner becomes a collapsible card. Collapsed: 44px
  `paper.sunken` cuisine-icon photo-placeholder thumb, `cardTitle` name, `Clock` + cook-time +
  step-count (`textStyle="meta"`), and a `ChevronDown` toggle. Expanded: card fills `brand.50`,
  toggle becomes `ChevronUp`, and steps render as 30px `paper.subtle` icon tiles (leading
  `stepIcon(instruction)`) + the instruction text — replacing the plain `OrderedList`/`ListItem`.
- Each card's expand state is independent local state (`Set<string>` of expanded dinner ids) —
  several may be open at once, matching the story's AC.
- Zero-step fallback message keeps its existing copy, restyled, and now only shows once a card
  is expanded (previously always visible, since there was no collapse state at all before this
  story).

### Dependencies

- `001-design-token-foundation`, `002-icon-vocabulary` (bolt `014`, complete)
- `stepIcon()` (existing, from `002-icon-vocabulary`)

### Technical Approach

- `useDinnersWithSteps` is completely unchanged — presentation-only restyle, same as every
  other story in this unit.
- This is a genuine behavior change, not just a visual one: today's `CookingViewPage` has _no_
  collapse/expand at all — every dinner's steps render immediately. Introducing the collapsed-
  by-default state means the existing tests (`getByRole('list')`/`listitem`, asserting step text
  visible with no interaction) need rewriting around an expand click first, and the "replacing
  the plain OrderedList" AC means the semantic `list`/`listitem` roles go away entirely in favor
  of icon-tile rows — so those role queries are replaced with text/button queries instead.

### Acceptance Criteria

Directly from story `010` (see it for the full Given/When/Then list); summarized:

- [ ] Collapsed: 44px thumb, Lora title, Clock + cook-time + step-count, `ChevronDown`
- [ ] Expanded: `brand.50` fill, `ChevronUp`, steps as 30px icon tiles with `stepIcon`
- [ ] Each card's expand state toggles independently of the others
- [ ] Zero-step dinner still gets a graceful fallback message, restyled
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
