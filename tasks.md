# Roadmap / task inbox

Status as of 2026-09-01. Intents live in `memory-bank/intents/`.

- **Need a UI element for resetting dinner selections easily.**
  → `009-clear-picks-reset` — inception draft, at Checkpoint 2 (open question OQ-1: should
  Undo survive a page navigation? default no). Source: `D3.zip`.

- **Add a household-level setting for the number of dinners you pick (with a settings page).**
  → The `/settings` page now exists (`007-claude-integration`). The `dinners_per_week`
  household setting itself is **not yet an intent** — a small follow-up to add the control +
  the schema/RLS + wire it into the pick-3 flow. Not started.

- **Import recipe by URL (Claude parses the page → compacted recipe).**
  → The Claude call path is done and hardened: `007-claude-integration` (the `claude-proxy`
  Edge Function, per-household key on `/settings`, Test Connection) + `008-claude-proxy-review-remediation`
  (fail-closed cap, atomic counter, SDK timeout, metering isolation — **production-live
  2026-09-01**). Recipe import itself is **not yet an intent** — it adds a new caller of
  `claude-proxy` + an import prompt + the recipe-capture UI; takes the next free intent
  number when created.
  - _"Would a generic connect-to-Claude button work, with the API info provided by menu?"_ —
    yes, that is exactly what `007` shipped: each household's owner pastes their own Anthropic
    key on `/settings`, and Test Connection proves the round-trip.

- **Redesign grocery store config → individual ingredient → Location model.** _(parked —
  not currently an intent)._ Intent `010-grocery-store-location-model` was drafted then
  **removed 2026-09-04** (never passed Checkpoint 2). It stayed blocked on questions only
  Chandler can answer: Item registry vs. name-keyed mapping (schema-determining), cutover
  mapping, does `category` survive, inline item editing, drag-and-drop reorder. Source brief
  `storeconfig.md` is still at the repo root; re-create the intent (next free number) once
  Chandler has weighed in. The visual redesign would be a separate design intent.
