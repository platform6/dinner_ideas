---
id: 001-tap-the-bar
unit: 001-tap-bar-to-open
intent: 027-tap-row-to-expand
status: complete
priority: must
created: '2026-10-19T10:20:41Z'
assigned_bolt: 085-tap-bar-to-open
implemented: true
---

# Story: 001-tap-the-bar

## User Story

**As a** household member planning the week
**I want** to tap anywhere on a picked dinner's bar to open it
**So that** I don't have to aim for the small expand icon

## Acceptance Criteria

- [ ] Phone (390px): a click on a row's name or meta opens that row, and a second click closes it.
      Other rows don't change
- [ ] Desktop (1280px): a click on any card's name opens all three cards, and a second click
      closes all three
- [ ] A click on the expand icon toggles exactly once, on phone and on desktop
- [ ] A click on remove removes the dinner and leaves every row collapsed
- [ ] A click inside an open dinner's ingredients or steps doesn't close it
- [ ] It works on a past week, which has no remove button
- [ ] The bar has `cursor: pointer`. While collapsed, the card's border turns `line.brand` on hover
- [ ] The expand icon's `aria-expanded` and `Expand` / `Collapse {name}` label are unchanged, and
      the bar adds no tab stop
- [ ] Added during the bolt (FR-4): the expand icon comes before remove on phone and desktop, and
      remove's icon is `heart.500`

## Technical Notes

- One `toggle` function per dinner (phone `toggleRow(id)`, desktop `setAllExpanded`) used by
  both the bar and the expand icon. The icon and remove call `e.stopPropagation()`.
- Desktop: wrap the badge row, photo slot and name and meta in one `Stack` with the handler, and
  keep the details outside it.

## Dependencies

- None (builds on intent 026's expand, already live)
