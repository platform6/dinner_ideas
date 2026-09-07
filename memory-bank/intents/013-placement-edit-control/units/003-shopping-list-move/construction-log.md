---
unit: 003-shopping-list-move
intent: 013-placement-edit-control
created: '2026-09-05T21:25:00Z'
last_updated: '2026-09-07T01:15:00Z'
---

# Construction Log: 003-shopping-list-move

## Status

✅ **Complete 2026-09-07.** Resumed — product owner's decision, taken after v0.11.0 went live and the
store page had been in use. Both blockers (bolts 055, 057) shipped in that release.

| Bolt                   | Stories  | Status      |
| ---------------------- | -------- | ----------- |
| 058-shopping-list-move | 001, 002 | ✅ complete |

## Log

- **2026-09-07T00:05:00Z**: 058-shopping-list-move started — Stage 1: plan
- **2026-09-07T00:20:00Z**: 058-shopping-list-move stage-complete — plan → implement
- **2026-09-07T00:45:00Z**: 058-shopping-list-move stage-complete — implement → test
- **2026-09-07T01:15:00Z**: 058-shopping-list-move completed — all 3 stages done

## Outcome

Shipped, not cut. The unit's standing question was whether the move affordance could be made
discoverable without degrading the page's primary job; the answer is yes, structurally: the
checkbox and the move control are siblings in the row, so checking off keeps a
full-width-minus-44px target and gains no nested interactive element.

Evidence: the existing suite passes with no test body altered (one import line widened), AND a new
case checks items off with a real store configured and the affordance rendered on every row — the
gap the old suite could not cover, because it mocks the store away and so never renders the
feature at all.

**One item outstanding for a human**: scroll preservation across a re-sort is verified in logic
only. jsdom has no layout engine, so the row offsets are simulated. Real browser reflow —
especially under the two-column desktop layout — wants a check on a device before this is
considered closed.

## Deferral history

⏸ Deferred 2026-09-05, at the point where units 001 and 002 were complete and the release was
ready to go out. The reasoning below stood at that time and is kept for the record.

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
