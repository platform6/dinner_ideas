---
intent: 014-recipe-entry
phase: inception
status: complete
created: '2026-09-07T02:00:00Z'
updated: '2026-09-07T03:20:00Z'
---

# Requirements: Recipe entry — add a dinner by hand, or paste one in

## Intent Overview

The catalog has been read-only since intent 001. All 50 dinners arrived in a seed migration, and
there has never been a way to add the fifty-first. This intent adds one: a page where a household
member enters a dinner by hand, or pastes the text of a recipe page and has Claude structure it.

Both paths converge on the **same reviewable draft** and write the **same shape** as a seeded
dinner. An added recipe must be indistinguishable from a founding one — same fields, same
two-layer instructions, same three-serving scaling. That is the constraint the whole intent turns
on: this is not a richer recipe format, and not a poorer one. It is a second way to produce the
existing one.

### The founding format has two instruction layers

Measured across all 50 seeded dinners, not assumed:

| Layer                  | Shape                                                                                                                                    | Read by          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `dinners.instructions` | One terse line, ~86 characters, every step compressed with commas and semicolons. 26 dinners use one sentence, 13 use two, 11 use three. | The catalog card |
| `dinner_steps`         | 4 or 5 discrete ordered steps (34 dinners have 4, 16 have 5), each a full sentence keeping temperatures, times and doneness cues.        | The cooking view |

A founding example, both layers:

```text
instructions: Toss chicken and broccoli with oil, garlic, lemon juice, and oregano;
              roast at 425F for 30 min.

steps: 1. Preheat the oven to 425°F.
       2. Toss the chicken thighs and broccoli florets with oil, garlic, lemon juice, and oregano.
       3. Spread on a sheet pan and roast for 30 minutes, until the chicken is cooked through.
       4. Serve hot.
```

Both layers are required. `CookingViewPage` renders "No steps available for this dinner yet." when
a dinner has none — so an added recipe without steps would not error, it would simply be visibly
poorer than every founding recipe, in the one view meant for cooking from.

### Why paste rather than fetch

The original ask was import by URL. Nothing in this stack can fetch one: `claude-proxy` accepts
text only, its contract is frozen, the browser is CORS-blocked by essentially every recipe site,
and the proxy has no tool use. Fetching would mean a new Edge Function plus HTML stripping — and
would still fail on the paywalled, JS-rendered and bot-blocking sites that make up much of the
recipe web.

Pasting the page text sidesteps all of it. The user's own browser has already rendered the page, so
what arrives is clean text rather than markup, which is _better_ input than a fetcher produces. The
one thing lost is the convenience of pasting a URL instead of the text. Product owner's decision,
2026-09-07.

### Reuse contract

This intent adds a **caller** of `claude-proxy` with a new `feature` tag (`recipe_import`) and a
new prompt. It does **not** modify the proxy's auth, key resolution, rate limiting, or logging —
intent 007 froze that contract for exactly this purpose. If this intent has to touch the proxy,
intent 007 under-delivered.

Likewise it writes `dinner_ingredients` through ordinary inserts and lets the existing
`trg_dinner_ingredients_sync_item` trigger register new groceries. ADR-7 anticipated this intent by
name; no new registry code is needed, and none may be added.

---

## Business Goals

| Goal                                                       | Success Metric                                                                                            | Priority |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| A household member can add a dinner without a migration    | A dinner entered by hand appears in the catalog and can be picked for a week                              | Must     |
| A recipe found online reaches the catalog without retyping | Pasted page text yields a correct draft the user accepts with edits, in fewer keystrokes than typing it   | Must     |
| An added dinner is indistinguishable from a founding one   | Same fields, both instruction layers, ingredients scaled to 3 servings, category from the 5-value set     | Must     |
| No cooking step is lost in translation                     | Every action needed to cook the dish survives import as a step; compression is by wording, never omission | Must     |
| A bad extraction never reaches the catalog silently        | Every imported draft is shown for review and requires an explicit save                                    | Must     |
| New groceries flow into the existing store review queue    | An ingredient not seen before appears unreviewed on `/store` with no new registry code                    | Should   |

---

## Functional Requirements

### FR-1: A recipe entry page

- **Description**: A new route where a household member creates a dinner. Reachable from the
  catalog. Offers two ways to start — enter by hand, or paste recipe text — which converge on the
  same draft form.
- **Acceptance Criteria**:
  - A route exists and is reachable from the catalog without typing a URL
  - Both entry paths lead to the same draft form and the same save
  - The page is usable on a phone at the app's existing breakpoints
  - Only an authenticated household member can reach it
- **Priority**: Must

### FR-2: Manual entry of a dinner

- **Description**: Capture exactly the fields a seeded dinner has: name, cuisine, cook time, the
  one-line summary, the ordered cooking steps, and the ingredient lines.
- **Acceptance Criteria**:
  - Name, cuisine type and cook time are captured
  - `cook_time_minutes` must be a positive integer; a non-positive value is refused before submit
  - Cuisine is free text (the column is deliberately not an enum) but offers the cuisines already
    in the catalog as suggestions, so the vocabulary converges without a migration
  - The **summary line** (`dinners.instructions`) is a single free-text field, and the form says
    what it is for — the one line shown on the catalog card
  - **Cooking steps** are captured as an ordered list: add, edit, remove, reorder. 4–5 steps is
    the observed norm, offered as guidance rather than enforced as a limit
  - A dinner cannot be saved with zero steps — it would render as "No steps available" in the
    cooking view, alone among the catalog
  - `step_number` is contiguous and starts at 1; removing a middle step renumbers the rest, so
    `check (step_number > 0)` and `unique (dinner_id, step_number)` are never reached with a bad
    value
  - **Tags** are captured: existing tags can be attached or detached, and a new one created
    by hand. `tags.name` is lowercase-enforced by a DB CHECK, so `normalizeTagName` is
    reused rather than re-implemented
- **Priority**: Must

### FR-3: Ingredient lines with a grocery category

- **Description**: Add, edit and remove ingredient lines. Each line is quantity, unit, name and
  grocery category.
- **Acceptance Criteria**:
  - A line captures `quantity`, `unit`, `name`, `category`
  - `quantity` must be greater than zero; the DB `check (quantity > 0)` is never reached with a
    bad value
  - `category` is chosen from exactly `Produce`, `Protein`, `Dairy`, `Grains`, `Pantry` — the
    column's CHECK set, which is also what drives shopping-list placement through
    `category_placements`
  - A dinner cannot be saved with zero ingredient lines
  - Lines can be removed and reordered without losing the others' contents
  - **No walking-path stop is assigned here.** Placing an individual grocery at a stop stays on
    `/store`, where intent 013 built it; a new grocery arrives unreviewed and surfaces in that
    page's review queue
- **Priority**: Must

### FR-4: Import by pasting recipe text

- **Description**: The user pastes the text of a recipe page. It is sent to Claude through
  `claude-proxy` with `feature: 'recipe_import'`, and comes back as a structured draft in the
  catalog's own format.
- **Acceptance Criteria**:
  - A paste box accepts the text of a rendered recipe page, including surrounding blog prose
  - The extraction returns name, cuisine, cook time, the summary line, the ordered steps, and
    ingredient lines with quantity / unit / name / category
  - Surrounding narrative — the author's story, navigation, footer, comments — is discarded, not
    folded into the instructions or the steps
  - The call sets `feature: 'recipe_import'` so it is attributable in `ai_usage_log`
  - The proxy's auth, key resolution, rate limiting and logging are not modified
  - A household with no Anthropic key set gets the proxy's `no_api_key` surfaced as a plain
    message pointing at `/settings`, not a raw error
  - `rate_limited`, `upstream_error` and `timeout` each surface as a distinct, plain-language
    message; the user's pasted text is never lost when a call fails
- **Priority**: Must

### FR-5: The imported recipe matches the founding format — both layers

- **Description**: Extraction targets the catalog's existing conventions, not the source page's.
  It produces the summary line **and** the ordered steps, because the founding recipes have both.
- **Acceptance Criteria**:
  - **No cooking step is dropped.** Every action needed to cook the dish appears in
    `dinner_steps`, in order. Compression happens in wording, never by omission
  - Steps keep the details that make them usable: oven temperatures, times, quantities used at
    that stage, and doneness cues ("until the chicken is cooked through")
  - Steps are terse imperative sentences in the founding voice — "Preheat the oven to 425°F.",
    not "Now you'll want to go ahead and preheat your oven"
  - Where a source recipe is unusually long, steps are **merged**, never discarded: two adjacent
    trivial actions may become one step; a distinct action may never vanish
  - The **summary line** is derived from the steps — every step represented, compressed with
    commas and semicolons into one terse line in the ~86-character house style
  - Ingredient quantities are rescaled to **3 servings** (2 adults + 1 small child), the
    convention recorded on `dinner_ingredients`; a recipe stating "serves 6" has its quantities
    halved
  - When the source states no serving count, quantities are taken as-is and the draft says so, so
    the user can correct rather than being silently given the wrong amounts
  - Every ingredient is assigned one of the five categories; nothing is left uncategorised
  - Cuisine is drawn from those already in the catalog where one fits
  - **Tags are inferred**, subject to FR-10
- **Priority**: Must

### FR-6: An oversize paste is trimmed, never silently

- **Description**: The frozen proxy contract caps `system + messages` at 50 KB. A popular recipe
  page selected whole can exceed that, almost always because of its comment section.
- **Acceptance Criteria**:
  - A paste exceeding the cap is trimmed from the **end**, keeping the top of the text where the
    recipe sits and dropping the tail where comments live
  - The user is told plainly that the paste was trimmed, before the result is presented
  - Trimming never produces a request that the proxy rejects with `bad_request` for size
  - An empty or whitespace-only paste is refused client-side with a clear message and no API call
- **Priority**: Must

### FR-7: Review before saving

- **Description**: An imported draft is always shown for correction before it is written. Nothing
  reaches the catalog on the strength of an extraction alone.
- **Acceptance Criteria**:
  - After extraction the user lands on the same editable form manual entry uses, pre-filled
  - Every extracted field — including each ingredient line and each cooking step — can be
    corrected, reordered, added to or removed before saving
  - Saving requires an explicit action; no automatic write
  - Abandoning the page discards the draft and writes nothing
- **Priority**: Must

### FR-8: Saving writes the catalog's existing shape

- **Description**: Save inserts one `dinners` row with its `dinner_ingredients` and `dinner_steps`
  rows, household scoped, through the existing RLS policies.
- **Acceptance Criteria**:
  - One `dinners` row, one `dinner_ingredients` row per line, one `dinner_steps` row per step,
    and one `dinner_tags` row per attached tag are written
  - A tag typed by hand that does not yet exist is created in the shared `tags` vocabulary;
    one that does is reused, never duplicated
  - `household_id` comes from the caller's household; existing RLS insert policies are used
    unchanged
  - The new dinner appears in the catalog and is immediately pickable for a week
  - The created dinner renders in the **cooking view** with its numbered steps exactly as a
    founding dinner does — never the "No steps available for this dinner yet." empty state
  - `dinners.name` uniqueness is **scoped to the household** by an additive migration in this
    intent, replacing the global constraint inherited from the pre-account-model schema
  - A clashing name within the household is reported as a plain "you already have a dinner
    with that name", never as a raw constraint violation
  - A failed save leaves no partial dinner: either the dinner and all its ingredients, steps
    and tags exist, or none of them do
  - New ingredient names are registered as `items` by the existing trigger; no application code
    creates registry rows
- **Priority**: Must

### FR-10: Inferred tags stay inside the existing vocabulary

- **Description**: Import proposes tags for the dinner. Because `tags` is an open, user-created
  vocabulary that drives catalog filtering, inference is bounded rather than free.
- **Acceptance Criteria**:
  - Inference chooses **only from tags that already exist**; the existing vocabulary is supplied to
    the model and anything outside it is **dropped**, not created
  - **`rosie-approved` is never inferred.** It means a family member liked this dinner — a human
    judgment about a person's opinion, not a property of a recipe — and it drives a visible heart
    in the catalog. It is excluded from the vocabulary sent to the model and rejected if returned
  - Inferred tags appear in the review form and can be removed or added to before saving
  - A household with no tags yet gets no inferred tags, and this is normal, not a failure
  - Creating a genuinely new tag stays a manual action (FR-2)
- **Priority**: Should — the intent is deliverable if inference is dropped and tags stay manual

### FR-9: Editing an existing dinner is out of scope

- **Description**: This intent creates dinners. It does not edit or delete them.
- **Acceptance Criteria**:
  - No edit route is added for the 50 seeded dinners or for anything created here
  - Correcting a recipe after saving is not offered — the review step (FR-7) is where mistakes are
    caught
- **Priority**: Must (as a scope boundary)

---

## Non-Functional Requirements

### Performance

- **Metric**: The entry form is interactive without waiting on any AI call — manual entry never
  touches `claude-proxy`
- **Metric**: An import shows a progress state within 200 ms of submission and resolves within the
  proxy's existing timeout; the user is never left without feedback

### Security

- **Metric**: No Anthropic key reaches the browser. The only path to Claude is `claude-proxy` with
  the caller's Supabase session token — unchanged from intent 007
- **Metric**: All writes are household-scoped through existing RLS; no new policy is added and no
  `service_role` path is introduced
- **Metric**: Pasted text is sent to Claude and logged only as token counts in `ai_usage_log`; the
  recipe text itself is not persisted anywhere after the draft is saved or abandoned

### Reliability

- **Metric**: Every `claude-proxy` error code reachable from this caller (`no_api_key`,
  `rate_limited`, `upstream_error`, `timeout`, `bad_request`) has a distinct user-facing message
- **Metric**: A failed or malformed extraction leaves the user with their pasted text intact and
  the option to retry or switch to manual entry
- **Metric**: An extraction returning a summary line but no steps is treated as a **failed**
  extraction, not a saveable draft
- **Metric**: A save that fails partway leaves no orphaned `dinners` row without ingredients or
  steps

### Compliance

- Not applicable. No new personal data, no new third-party processor — Claude is already in use
  under the household's own key.

---

## Constraints

### Technical Constraints

- **`claude-proxy`'s contract is frozen.** `system + messages ≤ 50 KB`, `max_tokens ≤ 4096`,
  model allowlist, non-streaming, text in and text out. This intent adds a caller, not a change.
- **No URL fetching exists and none is being built.** See "Why paste rather than fetch".
- **`dinner_ingredients.category` is a CHECK on five values.** Not extensible here.
- **`dinner_steps` enforces `step_number > 0` and `unique (dinner_id, step_number)`.** The schema
  comment permits non-contiguous numbering, but all founding data is contiguous and this intent
  keeps it that way.
- **`dinners.name` is globally unique** today, an artifact of the pre-account-model schema.
  This intent **changes it** to unique per household (resolved decision 3), which is the one
  certain migration in the intent.
- **`tags.name` is lowercase-enforced** by `check (name = lower(name))` and unique across the
  shared vocabulary. `normalizeTagName` already exists for this and must be reused.
- **`rosie-approved` is a presentation-significant tag** (`isRosieApproved` drives the catalog
  heart). It is a human judgment and must never be machine-applied.
- **The items registry is trigger-owned.** `trg_dinner_ingredients_sync_item` is the only thing
  that may create `items` rows (ADR-7). This intent inserts ingredients and lets it fire.
- **Ingredients are scaled to 3 servings**, recorded only as a column comment on
  `dinner_ingredients`. This intent must honour it and should make it visible in the UI.

### Business Constraints

- Claude is per-household and opt-in. A household without a key gets manual entry only; the import
  path must degrade to that rather than appear broken.
- Every import spends a metered API call against the household's daily cap.

---

## Assumptions

| Assumption                                                                              | Risk if Invalid                                                  | Mitigation                                                                                         |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A rendered recipe page pasted as text is usually well under 50 KB                       | Frequent trimming degrades extraction quality                    | FR-6 trims from the end and says so; the recipe is almost always near the top                      |
| Claude reliably separates recipe from surrounding blog prose                            | Poor drafts make import slower than typing                       | FR-7's review step is mandatory; the user can always fall back to manual entry                     |
| 4–5 steps is enough detail for a weeknight dinner, as it is for all 50 founding recipes | An imported recipe loses a step that mattered and the dish fails | FR-5 forbids dropping steps outright and permits merging only; FR-7 shows every step before saving |
| The 3-serving convention still holds for this household                                 | Every imported quantity is wrong                                 | Stated explicitly in the draft so the user sees the scaling and can correct it                     |

---

## Resolved Decisions

All three open questions were answered by the product owner on 2026-09-07, before decomposition.

| #   | Question                                              | Decision                                                                                                              |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Should entry offer the existing tag vocabulary?       | **Yes, and import infers them** — bounded to the existing vocabulary, never inventing, never `rosie-approved` (FR-10) |
| 2   | Does an abandoned import still burn a daily-cap call? | **Yes, accepted.** The call was made and metered; no refund mechanism exists and none is being built                  |
| 3   | Fix `dinners.name` uniqueness to per-household?       | **Yes.** An additive migration in this intent, alongside the save work (FR-8)                                         |

No open questions remain.

---

## Priority Definitions

- **Must**: The intent is not deliverable without it.
- **Should**: Valuable, and cuttable without invalidating the rest.
- **Could**: Desirable if it costs nothing.
