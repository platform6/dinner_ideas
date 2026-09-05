---
unit: 003-shopping-list-move
intent: 013-placement-edit-control
created: '2026-09-05T21:25:00Z'
last_updated: '2026-09-05T21:25:00Z'
---

# Construction Log: 003-shopping-list-move

## Status

⏸ **Deferred — not started.** Product owner's decision, 2026-09-05, taken at the point where
units 001 and 002 were complete and the release was ready to go out.

| Bolt                   | Stories  | Status     |
| ---------------------- | -------- | ---------- |
| 058-shopping-list-move | 001, 002 | ⏸ deferred |

## Why

This unit adds a second entry point to a move flow that already works from `/store`. Intent 013's
core value — reaching and moving any grocery or category, and seeing what has not been checked —
is delivered without it.

Unit 003 is `Should` and depends on nothing. That isolation was deliberate at inception precisely
so this decision could be taken cleanly, and it was: nothing in units 001 or 002 has to change,
and no work is stranded.

Deferring also unblocks intent 010's Checkpoint 4, which has been open since the v0.10.0 deploy
waiting on exactly this intent.

## What stands

The unit brief, both stories and the bolt plan are unchanged and remain accurate. The bolt can be
started unmodified whenever the shopping-list move is wanted.

Its cut criterion is worth restating, because it is the reason this unit was always the most
likely to be dropped: **the existing shopping-list suite must pass unmodified.** If the move
affordance cannot be made discoverable without degrading the page's primary job — checking items
off while shopping — the right outcome is to cut it rather than ship the compromise.

That question is better answered after living with the store page for a while, which is now
possible.

## Not deployed

Nothing from this unit exists. Intent 013 releases with units 001 and 002 only.
