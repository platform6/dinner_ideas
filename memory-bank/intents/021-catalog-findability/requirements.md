---
intent: 021-catalog-findability
phase: inception
status: draft
created: '2026-09-17T15:43:09Z'
updated: '2026-09-17T16:01:11Z'
---

# Requirements: Find a dinner in a growing catalog

## Intent Overview

The catalog can only be filtered by cuisine and tags. As it grows, finding a specific dinner
needs search, a sense of how many there are, and filters that say what they did.

**Type**: brown-field
**Origin**: product owner's task inbox (`tasks.md`), including a UI/UX review of the live app,
triaged into intents 019–023 on 2026-09-17.

## Scope (from the inbox, before Checkpoint 1)

- **Search by recipe title**: a search bar that narrows the catalog. (No search exists in `features/dinners` today.)
- **Pagination and a total recipe count** at the bottom, on desktop and mobile.
- **Cuisine/Tags filter dropdowns**: no Clear, no visible count of matches, no search within a long checkbox list. (The review also suggested Apply; to be decided in requirements.)
- **"Not interested" is hard to find**: reachable only from an unlabelled eye icon, and not in the sidebar nav. (Its tooltip is in intent 020; where it lives in navigation is here.)

- **The catalog header on mobile** wraps into an unaligned cluster: the "5 of 5" pill, Surprise me,
  "Your week is already full.", Clear picks, + and the eye icon, with line breaks mid-sentence. From
  the mobile review (`mobile.md`). This intent adds search and a count to the same header, so the
  header is designed once, here.
- **The filter dropdown on mobile** opens as a near full-width floating panel with no backdrop and no
  visible Apply, Clear or close control; dismissing it means guessing that a tap outside works. From
  the mobile review. Designed together with the filter changes above.

## Out of scope

- Items assigned to the other intents in 019–023.
- Cooking mode improvements (step check-off, timer, next/previous step), deferred and kept in
  `tasks.md`.

## Functional Requirements

_Not yet gathered. Written after Checkpoint 1._

## Non-Functional Requirements

_Not yet gathered._
