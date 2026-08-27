---
stage: implement
bolt: 016-kitchen-table-ui
completed: '2026-08-27T12:15:00Z'
---

## Implementation Walkthrough: kitchen-table-ui (login + catalog/card restyle)

### What changed

**Login (`006-login-restyle`)** — `src/features/auth/LoginForm.tsx` rewritten:

- Centered 60×60 `brand.100` tile with `uiIcons.logo` (CookingPot, 30px), "Dinner Ideas" in
  `textStyle="pageTitle"` at 32px (explicit override — the token is 30px), tagline in `ink.400`.
- Email/password fields moved to `InputGroup` with `Mail`/`Lock` leading icons; password field
  gets an `InputRightElement` reveal toggle (`Eye`/`EyeOff`, new local `showPassword` state).
- Full-width `size="lg"` (52px) olive button with a trailing `ArrowRight`.
- Error state restyled onto the `notice` layerStyle with an `Info` icon, in place of the stock
  `Alert status="error"`.
- `signIn`/error-handling logic itself is unchanged.

**Catalog (`007-catalog-dinner-card-restyle`)**:

- `CatalogPage.tsx` header: added an "This week" eyebrow above the title; the selected-count
  text became a `Badge` (`variant="count"`, switching to `"countFull"` at 3/3) reading
  "N of 3" with a `CheckCheck` icon — replaces the old plain "N/3 selected" text.
- `DinnerCard.tsx` rewritten:
  - 76px `paper.sunken` tile showing the dinner's cuisine icon as a photo placeholder.
  - New `isRosieApproved()` helper (`dinners/tags.ts`) checks for a tag literally named
    `rosie-approved`; when present, a filled `heart.500` heart renders top-right, alongside
    (not replacing) the existing overflow menu.
  - Metadata row restyled with the cuisine icon + `Clock` under `textStyle="meta"`; the
    last-chosen line gets a `CalendarOff`/`CalendarCheck` icon under `textStyle="faint"`.
  - Pick control is now a 3-state pill (`PickPill`): outline `Plus` "Pick" → solid `Check`
    "Picked" → `paper.sunken` `Lock` "Full". It's still a real Chakra `Checkbox` — only its
    `.chakra-checkbox__control` box is hidden via `sx`, and the pill markup is the `Checkbox`'s
    children (so it stays the input's own `<label>`, keeping the click target and the
    `getByRole('checkbox', { name: 'Pick X for this week' })` contract intact unchanged).
  - Selected cards use `layerStyle="cardSelected"`; a card that's locked out at the pick cap
    drops to 55% opacity.
  - The old `Tooltip` at-cap message is replaced with an inline `notice`-layerStyle line, shown
    whenever a card is disabled-and-unselected.
  - Expandable details: ingredient rows get a leading `categoryIcon`, step rows a leading
    `stepIcon()` (matched from the instruction text); tag badges use the `muted` Badge variant
    established for chips in bolt 015. The `rosie-approved` tag itself is filtered out of both
    the card-face tag row (redundant with the heart) — it still appears in the expandable
    details' tag-management list since that's where it'd be removed.
- New unit tests for `isRosieApproved` in `tags.test.ts` (5 cases: present, absent, empty,
  null/undefined, near-miss name).

### Test fixes required by the restyle

- `CatalogPage.test.tsx`: the 3/3 assertion updated from `'3/3 selected'` to the new copy,
  `'3 of 3'`.
- `LoginForm.test.tsx`: `getByLabelText(/password/i)` started matching both the password input
  and the new "Show/Hide password" reveal button (both contain "password" in their accessible
  name). Switched to `getByLabelText(/^password/i)`, which only matches the field's own label
  ("Password *") and not the button's label ("Show password").

### Verification

- `npx tsc -b`, `npx eslint .`, `npx vitest run` (122/122 passing across 20 files), and
  `npx vite build` all pass clean.
- Live-rendered the Login screen via a local dev server + browser screenshot: brand tile, Lora
  title, tagline, icon-led inputs, reveal toggle, and full-width CTA all render as designed.
  The Catalog screen requires an authenticated session this environment doesn't have credentials
  for, so it wasn't rendered live — recommend the user spot-check it visually once deployed.

### Acceptance criteria

- [x] Login matches the handoff's spec; existing `useAuth`/error behavior unchanged
- [x] Catalog header shows eyebrow/title/count chip
- [x] Card shows photo-placeholder, restyled metadata/footer, pill pick control (3 states),
      selected-card fill, at-cap notice
- [x] `rosie-approved` heart renders only for that exact tag name; every other tag still a plain
      badge
- [x] Expandable details section gets category/step icons
- [x] `tsc -b`, `eslint`, `vitest run`, `vite build` all pass; existing pick/selection tests pass
      against the new pill markup unchanged

---

### Checkpoint

Ready to proceed to Stage 3 (Test)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
