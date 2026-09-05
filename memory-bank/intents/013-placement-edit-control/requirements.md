---
intent: 013-placement-edit-control
phase: inception
status: complete
created: '2026-09-05T16:45:00Z'
updated: '2026-09-05T17:15:00Z'
---

# Requirements: Placement edit control — move anything, and see what you haven't vetted

## Intent Overview

Intent `010` shipped the Store → Location → Item model and made the shopping list sort by the
household's walking path. It works: the cutover preserved the old ordering exactly, and the
resolution view resolves every item to a stop.

What it did not ship is **control**, and it has no notion of **"not looked at yet."**

In production today:

- **No item can be moved** in practice. Every item resolves as `inherited`, so the section that
  lists `unassigned` items is permanently empty, and the only other entry point is a per-stop
  list capped at four items. Roughly 20 of 121 items are reachable, and only from the stop they
  already sit at.
- **No category can be moved at all.** `category_placements` is read and counted by the UI but
  never written. The five category→stop mappings the cutover created are frozen for good.
- **A new ingredient lands silently.** `dinner_ingredients.category` is `NOT NULL` and
  CHECK-constrained to five values, so every new ingredient inherits a stop immediately —
  possibly the wrong one — and is indistinguishable from the 121 already vetted.

This intent adds the missing half: **the household has final say over where anything sits**, at
both the category and the item level, reachable by name, from either the store page or the
shopping list where the mismatch is actually noticed — plus a way to see what arrived recently
and has not been checked.

## Provenance

Found by the product owner on production within minutes of the `v0.10.0` deploy (2026-09-05):
searching "Not on the path yet" for `spaghetti` returned nothing. Diagnosed during Operations
Checkpoint 4 for intent `010` and recorded in that intent's `deployment/deployment-plan.md`
under **POST-DEPLOY FINDING**. Intent `010`'s Checkpoint 4 is held open pending this work.

**Classified as a design refinement, not a defect.** The registry, resolution view and cutover
all do exactly what `010` specified. Product owner's framing: _"I think the registry is sound
and functions as intended however I don't think the plain user experience flow was integrated
into the intention. This most likely was my miss as I assumed it was obvious that the user
should have ultimate edit control over where items are placed."_

**Type**: brown-field (design refinement — extends `010`, does not rebuild it)

## Why the "needs review" idea belongs here

The product owner described the flow that motivates it: import ten recipes, go to the shopping
list, and find that three ingredients _"just didn't match what I have."_

That state does not currently exist. A newly imported ingredient always carries one of the five
categories, so it always inherits a stop and is never unplaced. The three stragglers would not
surface — they would land at whatever stop their category points to and blend in.

What is missing is the distinction between **"inherited, and that is genuinely right"** and
**"inherited by default, nobody has looked."** That distinction is what makes a triage list
meaningful, and it is what `010`'s FR-13 section should have been. The section was not the wrong
idea; "items with no location" was the wrong population for it.

## Relationship to intent `014` (not yet created)

Recipe import **does not exist**. `callClaude` is generic, working transport whose only
production consumer is the "Test connection" button in `ClaudeAiCard.tsx`; intents `007`/`008`
built the proxy, key vault, rate limiting and usage logging with no feature on top.

Scope agreed at Checkpoint 1: this intent builds the foundation — manual control, the review
state, and a **local** similarity suggestion. A later intent `014` adds recipe import and the
Claude-assisted matching hook for what similarity cannot resolve. `014` depends on `013`;
`013` is useful on its own for ingredients added by hand today.

## The inconsistency `010` left behind

|                  |                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-6** (`010`) | Defines `unassigned` as one of three placement states, _"a normal state, not an error, everywhere it appears"_, and requires the UI to distinguish all three. |
| **FR-5** (`010`) | Placement inherits through the item's category.                                                                                                               |

Individually sound, jointly unsatisfiable. Because category is `NOT NULL` over five values and
the cutover placed all five, every item is `inherited` and **`unassigned` is unreachable** except
for registry orphans — Items whose dinners were later deleted. Verified on production:
`inherited | 121`, `unassigned | 0`.

FR-8 below corrects the record rather than leaving it to mislead the next reader.

## Business Goals

| Goal                                        | Success Metric                                                         | Priority |
| ------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| Any grocery can be moved to any stop        | All 121 items reachable by name; a move persists and re-sorts the list | Must     |
| A whole category can be moved in one action | Moving `Dairy` to `Aisle 1` moves every item that inherits from it     | Must     |
| Newly arrived items are visible as unvetted | After adding ingredients, exactly those appear in a review list        | Must     |
| Fix it where you notice it                  | A move can be started from the shopping list, not only `/store`        | Should   |
| A category-less stop is usable              | `Bakery` / `Garmantasdf` can hold items                                | Must     |
| The walking path stays honest               | A stop's item count and preview match what is actually there           | Must     |

---

## Functional Requirements

### FR-1: Every item is reachable by name

- **Description**: A searchable list of **all** groceries on `/store` — not only unplaced ones —
  showing each item's current stop and whether that stop was chosen explicitly or inherited from
  its category.
- **Acceptance Criteria**:
  - Covers every Item in the household registry, in every placement state.
  - Search matches on item name, case- and whitespace-insensitively, consistent with
    `items.name_key` (`lower(btrim(name))`).
  - Each row shows: item name, current stop, and the provenance of that stop — chosen vs.
    inherited, naming the category when inherited (reusing `010` FR-6's `via_category`).
  - Each row offers a move action opening the existing assign flow (`010` FR-12).
  - A registry orphan (no stop at all) renders neutrally — no red, no warning, per `010` FR-6.
  - Default ordering alphabetical by item name; search narrows, it does not reorder.
- **Priority**: Must

### FR-2: Move a whole category to a stop

- **Description**: `category_placements` becomes user-writable. A category can be moved to a
  different stop, and every item inheriting from it follows in one action.
- **Acceptance Criteria**:
  - Each of the five categories can be assigned to any stop in the active store.
  - Unique per `(store_id, category)` — moving **replaces** the previous mapping rather than
    adding a second. The existing constraint enforces this; the UI must not present it as
    additive.
  - Moving a category visibly moves every inheriting item, and leaves items with an explicit
    placement where they are — `010` FR-6's resolution order is preserved and must stay
    observable.
  - A category can be **unplaced**, leaving its items unassigned. Normal state, not an error.
  - The shopping list re-sorts to match on the next read.
  - **No schema or policy work required**: `category_placements` already carries
    household-scoped SELECT/INSERT/UPDATE/DELETE policies from `010`. This intent exercises
    them for the first time.
- **Priority**: Must

### FR-3: Stops list what they actually hold

- **Description**: Remove `010`'s undocumented four-item display cap so a stop's expanded list
  shows everything under it.
- **Acceptance Criteria**:
  - Expanding a stop lists all items resolving there, with no silent truncation.
  - Each listed item offers the same move action as FR-1.
  - A category placed at the stop appears as a distinct entry from the items, offering FR-2's
    category move.
  - The collapsed preview may still abbreviate names, but its count must equal the true total.
  - Long lists must not degrade scrolling on mobile — see NFR Performance.
- **Priority**: Must

### FR-4: Move from the shopping list

- **Description**: A mismatch is noticed while shopping, not while configuring. An item on the
  shopping list can be moved to a different stop in place.
- **Acceptance Criteria**:
  - Each shopping-list item offers a move action opening the same assign flow as FR-1.
  - Completing a move re-sorts the list to the new walking-path order without a full reload.
  - Unobtrusive enough not to interfere with the list's primary use — checking items off.
  - Writes an **item** placement, never a category placement: the user is saying "this thing is
    here", not "everything like it is here".
  - Also marks the item reviewed (FR-6).
- **Priority**: Should

### FR-5: "New — needs review" replaces the unassigned-only section

- **Description**: `010`'s FR-13 section is re-scoped from `unassigned` items (an empty
  population) to **unreviewed** items — things that arrived and have not been checked.
- **Acceptance Criteria**:
  - Lists every Item with `reviewed_at is null`, regardless of placement state.
  - Each row shows the item, the stop it currently resolves to, and how it got there — so the
    question the user answers is "is that right?", not "where does this go?".
  - Two actions per row: accept the current stop, or move it (FR-1's flow). Both mark it
    reviewed.
  - Empty state is calm and vacuously true — "Nothing new to check." No red, no warning
    styling, per `010` FR-6's standing rule.
  - `UnassignedSection`'s in-recipe narrowing (`useInRecipeNameKeys` /
    `fetchInRecipeNameKeys`) is removed unless the new list has a stated reason to keep it —
    the default scope it implemented is not meaningful for a review queue.
  - `010`'s FR-13 is marked superseded in that intent's requirements, with a pointer here.
  - No orphaned tests remain asserting the removed behaviour.
- **Priority**: Must

### FR-6: Review state

- **Description**: An Item carries whether anyone has vetted where it sits. This is the one
  piece of this intent that needs a schema change.
- **Acceptance Criteria**:
  - `items` gains a nullable `reviewed_at timestamptz`. Null means unreviewed.
  - Set when the user accepts a stop (FR-5), moves an item (FR-1/FR-3/FR-4), or places one
    through the existing assign flow.
  - **Backfill**: every Item existing at migration time is marked reviewed, so the release does
    not present all 121 as needing attention.
  - Items created afterwards — by the `dinner_ingredients` sync trigger — start null and appear
    in FR-5's list.
  - **Write path needs design.** `items` currently has a SELECT policy only: it was deliberately
    trigger-owned per ADR-7 (_"This trigger is the ONLY place items rows are created; no
    application code path calls anything"_). Marking `reviewed_at` must not open `items.name` to
    application writes. Candidate approaches — a column-scoped `grant update (reviewed_at)`
    alongside a household UPDATE policy, or a `security definer` RPC in the style of
    `reorder_location`. **Technical design decides; the invariant is what matters, not the
    mechanism.**
  - Marking reviewed is idempotent and safe to repeat.
- **Priority**: Must

### FR-7: A suggested stop for unreviewed items

- **Description**: Reviewing should mostly be confirming, not deciding. `010`'s similarity
  engine proposes where a new item probably goes.
- **Acceptance Criteria**:
  - For an unreviewed item, FR-5's row surfaces the similarity engine's best stop when one
    clears the existing confidence cutoff, phrased as `010` FR-7 already does — naming the
    similar item ("you put burger buns here").
  - Accepting the suggestion places the item and marks it reviewed in one action.
  - When nothing clears the cutoff, the row simply shows the inherited stop with no suggestion
    block — consistent with `010` FR-12's existing behaviour of omitting rather than announcing
    absence.
  - **Entirely local.** No API call, no key required, no rate-limit interaction. The
    Claude-assisted escalation for what similarity cannot resolve is intent `014`.
  - Existing suggestion dismissals (`010` FR-8) are respected.
- **Priority**: Should

### FR-8: Correct `010`'s FR-6 — `unassigned` is the orphan case

- **Description**: The three-state model stays, but the requirement stops describing
  `unassigned` as a common state.
- **Acceptance Criteria**:
  - `010`'s FR-6 is amended in place to state that `unassigned` occurs only when an Item has no
    surviving `dinner_ingredients` rows, with a pointer to this intent.
  - No change to `item_location_resolution` — the view already implements this correctly.
  - FR-1's and FR-5's lists render the orphan case without a dead branch or copy that cannot
    occur.
  - Whether orphans should be surfaced for cleanup or garbage-collected stays **out of scope**,
    recorded as an open question.
- **Priority**: Should

---

## Non-Functional Requirements

### Performance

| Requirement               | Metric                                | Target                                                                            |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| All-groceries list render | Items before virtualization is needed | 121 today; smooth to ~500                                                         |
| Search responsiveness     | Keystroke to filtered result          | No perceptible lag; client-side filter over the already-loaded resolution query   |
| Similarity suggestion     | Time to propose a stop                | Local computation, no network; must not delay the review list's first paint       |
| Move round-trip           | Tap to re-sorted list                 | Single write + resolution refetch, consistent with `010`'s existing place/unplace |

### Reliability

| Requirement          | Metric                             | Target                                                                                                  |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Ordering equivalence | Shopping-list order after any move | Matches the walking path exactly; no group silently drops off the path                                  |
| Concurrency          | Two members moving the same item   | Last write wins, no duplicate placement rows (existing unique constraints hold)                         |
| Backfill correctness | Items marked reviewed at migration | Exactly the pre-existing set; a concurrent insert during migration must not be silently marked reviewed |

### Security

| Requirement                  | Standard     | Notes                                                                                                                                  |
| ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization — categories   | Existing RLS | `category_placements` policies already exist and are unchanged                                                                         |
| Authorization — review state | New, minimal | Whatever write path FR-6 takes must not grant application writes to `items.name`; ADR-7's trigger-owned invariant survives this intent |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the Construction Agent.

**Intent-specific**:

- **One additive migration, expected to be small**: `items.reviewed_at` plus its backfill and
  whatever grant/policy or RPC FR-6's write path needs. Everything else this intent does uses
  tables, policies and constraints `010` already created. This supersedes the earlier draft's
  "no schema change expected" — that was written before the review state existed.
- `grocery_store_rows` / `category_row_assignments` remain in place. ADR-9's retirement is still
  gated on `010`'s Checkpoint 4 and is **not** part of this intent.
- The assign flow, similarity suggestions and dismissals (`010` FR-7, FR-8, FR-12) are reused
  as-is. This intent adds entry points, the category-level write and the review state; it does
  not redesign the sheet.
- No Claude/API surface. Every suggestion in this intent is local.

### Business Constraints

- No urgency. Product owner: _"we're just building, iterating, refining."_ Production is live and
  its ordering promise holds, so this is not a hotfix and should not be shaped like one.

---

## Assumptions

| Assumption                                                              | Risk if Invalid                                                                 | Mitigation                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A household's registry stays in the low hundreds of items               | The all-groceries list needs virtualization sooner than expected                | NFR sets the smooth-to-~500 bar; revisit if approached                                                                                                                     |
| Categories stay a fixed set of five                                     | A user-defined category would need placement UI assuming nothing about the five | Out of scope; the CHECK is `010`'s and unchanged                                                                                                                           |
| Moving a category reads as replacing its stop, not adding one           | Users believe a category sits in two places                                     | FR-2 requires it be presented as a move                                                                                                                                    |
| The similarity engine is good enough to make review mostly confirmation | Review becomes tedious deciding rather than quick confirming                    | FR-7 is Should; intent `014`'s Claude escalation is the answer if local similarity underperforms                                                                           |
| Marking existing items reviewed at migration is right                   | A genuinely unvetted item is silently marked vetted                             | Accepted: nobody has had the means to review anything yet, so "reviewed" here means "predates the feature"; the alternative — 121 items in the queue on day one — is worse |
| The shopping-list move is welcome rather than clutter                   | An extra control gets in the way of checking items off                          | FR-4 is Should and can be cut without affecting FR-1–FR-3                                                                                                                  |

## Open Questions

| Question                                                                                        | Owner         | Due              | Resolution                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Should registry orphans be surfaced for cleanup, or removed when their last dinner goes?        | Product owner | A future intent  | Pending — out of scope here (FR-8)                                                                                         |
| Should a stop be able to claim a category from the stop's side, as well as from the category's? | Product owner | Checkpoint 3     | Pending — UI affordance, not a model question                                                                              |
| Does editing an ingredient's name create a new Item, leaving the old one orphaned?              | Construction  | Technical design | Pending — the sync trigger fires on `update of name`; worth confirming the review queue does not fill with renames         |
| Does `Garmantasdf` stay?                                                                        | Product owner | —                | **Resolved**: yes. Test row; owner wants to place test items on it manually — a real use case for a category-less stop     |
| Scope of `013` vs `014`                                                                         | Product owner | —                | **Resolved**: `013` = manual control + review state + local similarity. `014` = recipe import + Claude matching escalation |
