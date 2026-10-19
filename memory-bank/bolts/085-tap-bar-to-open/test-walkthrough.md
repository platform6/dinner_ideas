---
stage: test
bolt: 085-tap-bar-to-open
created: '2026-10-19T12:04:31Z'
---

## Test Walkthrough: tap-bar-to-open

### Automated

- **881/881 Vitest**, 53 files (up from 872). `tsc -b` and `eslint src --max-warnings=0` clean.
  `git diff -- supabase/` is empty
- New tests, in the "tapping the bar (intent 027)" describe in `PlanPage.test.tsx`:
  - Phone: a name opens that row only, and a second click closes it
  - Desktop: one card's name opens all three, and another card's name closes them
  - Remove leaves every row collapsed, with no details fetched
  - Clicks on an ingredient and a step keep the dinner open (390px and 1280px)
  - A past, locked week's dinner opens from its bar
  - The bar has no `tabindex` or `role`
  - Expand comes before remove (390px and 1280px, FR-4)
- **Double-toggle guard**: with the expand icon's `stopPropagation` removed for a moment, 7 intent
  026 tests failed. It was put back

### Browser (local dev server, the household's real data, 2026-10-19)

Remove wasn't clicked, so the real plan stayed as it was. The unit test covers it, and the release
smoke test repeats it.

**Desktop** (5 picked dinners, three across):

- ✅ Hovering a closed card: the bar's cursor is `pointer`, and the card's border is `#CFD6C2`
  (`line.brand`). The bar has no `tabindex` or `role`
- ✅ Clicking "Grilled Chicken Caesar Salad" opened every card
- ✅ Clicking an ingredient and a step inside the open card left everything open
- ✅ Clicking "Baked Ziti with Turkey & Spinach" closed every card

**Phone** (390px same-origin iframe):

- ✅ The rows still fit: name, meta, remove and expand, with long names wrapping
- ✅ Clicking the Caesar Salad row's meta line opened that row only
- ✅ Clicking an ingredient left it open
- ✅ Clicking the collapse icon closed it in one click (no double toggle)

**After FR-4** (scope added during this stage):

- ✅ Phone and desktop: the chevron sits before the remove button, and remove's ✕ is red
  (`heart.500`) inside the unchanged outline
- ✅ `it.each([390, 1280])` checks that expand comes before remove in the DOM

### Not checked here

- A real touch device. The release smoke test covers it
