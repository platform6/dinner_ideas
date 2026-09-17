# Roadmap / task inbox

Status as of 2026-09-17. Intents live in `memory-bank/intents/`.

---

## Now intents (triaged 2026-09-17)

Everything else that was in this inbox, and the product owner's mobile review (since deleted), is
now in one of these. 019 is planned; the rest are drafts awaiting requirements.

- `019-ui-correctness-fixes`: hard-coded "3" on `/plan`, Produce default, Details grid reflow,
  "Add dinner" vs "Add a dinner", shopping-list footer and card menu overlaps on mobile
- `020-visual-hierarchy-and-affordances`: card title contrast, "Full" state, palette hierarchy,
  sidebar sections, unlabelled icon buttons
- `021-catalog-findability`: title search, pagination and total count, filter dropdowns, "Not
  interested" discoverability, catalog header and filter dropdown on mobile
- `022-recipe-entry-and-settings-polish`: scaling accordion, URL field, hint clarity, hide API key
  once set
- `023-shopping-list-consolidation`: merge similar ingredients, empty aisles in Store setup
- `024-mobile-ergonomics`: touch targets, Store setup row truncation, aisle-picker sheet

## Not yet an intent

- Cooking mode lists steps as static text with no way to check off a step, no timer despite showing
  "40 min," and no next/previous focus. For a "cooking mode" this is a missed opportunity to
  actually be useful hands-at-the-stove. _(Deferred 2026-09-17: a new feature, not cleanup.)_
- Select-all (Ctrl+A) inside the "Add a dinner" Name field produced unexpected text mutation rather
  than a clean selection. _(Deferred 2026-09-17 from intent 019: the field is a plain controlled
  input with no key handling, so this may be an artifact of the automated review. Reproduce by hand
  before making it an intent.)_
