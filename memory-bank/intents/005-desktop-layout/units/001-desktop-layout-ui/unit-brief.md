---
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
phase: inception
status: complete
created: '2026-08-28T19:30:00Z'
updated: '2026-08-28T19:30:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Desktop Layout UI

## Purpose

Add the desktop layout the app never had: a persistent left rail at md+, a content measure cap,
`md+` shapes for the three screens that earn one, a catalog breakpoint move, pointer-hover states,
and the test infrastructure needed to test responsive components. Keeps `ux-guide.md`'s low
desktop bar. Below md, every screen is unchanged from intent `003`.

## Scope

### In Scope

- Left rail nav at md+ from `Layout.reference.tsx`; header + tab bar below md; single-nav render (FR-1)
- App-name treatment quieter than a card title (FR-1, review finding 11)
- Content measure cap 720/1080px, pathname-derived `WIDE_ROUTES` (FR-2)
- Login vertical centring at md+ (FR-3)
- Shopping list: two columns + header controls at md+; below md unchanged (FR-4)
- This week: `SimpleGrid` 3-across at md+; below md unchanged (FR-5)
- Store setup: `SimpleGrid` side-by-side at md+, assignment rows → `layerStyle="card"` (FR-6)
- Catalog: `columns={{ base:1, sm:2, xl:3 }}`, cap 1080px (FR-7)
- Pointer states: card hover border, clickable shopping-list rows + hover, cooking accordion cursor/hover (FR-8)
- Test infra: `matchMedia` polyfill, `ChakraProvider` render helper, `Layout.test.tsx` rewrite (FR-9)

### Out of Scope

- Master-detail catalog, multi-week calendar, shopping-list data table, dark mode (README "what to leave out")
- Real dinner photos / an image field on `CatalogDinner` — the This-week photo slot ships as the empty `paper.sunken` tile
- Any Supabase / data-model change
- `App.tsx` restructure (Layout derives the measure from the pathname)

---

## Assigned Requirements

| FR   | Requirement                                  | Priority |
| ---- | -------------------------------------------- | -------- |
| FR-1 | Left rail navigation at md+                  | Must     |
| FR-2 | Content measure cap                          | Must     |
| FR-3 | Login vertical centring at md+               | Should   |
| FR-4 | Shopping list — two columns, header controls | Should   |
| FR-5 | This week — three across at md+              | Should   |
| FR-6 | Grocery store setup — side by side at md+    | Should   |
| FR-7 | Catalog — third column at xl                 | Could    |
| FR-8 | Pointer states                               | Could    |
| FR-9 | Responsive-component test infrastructure     | Must     |

---

## Domain Concepts

_None new. Consumes the same entities as `001-weekly-dinner-planner`, purely for display/layout._

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 9     |
| Must Have     | 3     |
| Should Have   | 4     |
| Could Have    | 2     |

### Stories

| Story ID                           | Title                                         | Priority | Status  |
| ---------------------------------- | --------------------------------------------- | -------- | ------- |
| 001-left-rail-navigation           | Left rail navigation at md+                   | Must     | Planned |
| 002-content-measure-cap            | Content measure cap (720 / 1080px)            | Must     | Planned |
| 003-login-vertical-centring        | Login vertical centring at md+                | Should   | Planned |
| 004-shopping-list-two-column       | Shopping list — two columns + header controls | Should   | Planned |
| 005-this-week-three-across         | This week — three across at md+               | Should   | Planned |
| 006-store-setup-side-by-side       | Grocery store setup — side by side at md+     | Should   | Planned |
| 007-catalog-xl-third-column        | Catalog — third column at xl, cap 1080px      | Could    | Planned |
| 008-pointer-hover-states           | Pointer / hover states                        | Could    | Planned |
| 009-responsive-test-infrastructure | matchMedia polyfill + ChakraProvider wrapper  | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                                         | Reason                                                           |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `003-frontend-review-remediation` (complete) | Corrected ink ramp, `line.brandSubtle`, finding-3 sticky-bar fix |

### Depended By

| Unit | Reason                                   |
| ---- | ---------------------------------------- |
| None | Top of this intent's (single-unit) chain |

### External Dependencies

| System                     | Purpose                       | Risk |
| -------------------------- | ----------------------------- | ---- |
| `lucide-react` (`uiIcons`) | Rail icons — already exported | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 (`SimpleGrid`, `useBreakpointValue`, responsive style props), existing React Router /
Vitest setup. `Layout.reference.tsx` is a supplied drop-in.

### Integration Points

| Integration                           | Type           | Protocol      |
| ------------------------------------- | -------------- | ------------- |
| `navItems` / `uiIcons` (`icons.tsx`)  | Consumed as-is | module import |
| `useAuth` (`@/features/auth/useAuth`) | Consumed as-is | React hook    |

### Data Storage

_None._

---

## Constraints

- `md` (768px) is the single desktop breakpoint; Catalog's 3rd column at `xl` is the only exception.
- No new colours or type sizes; new spacing constants only (rail 240px, 720/1080px measures, 70px tab bar).
- Below md every screen is byte-for-behaviour unchanged from intent `003`.
- `App.tsx` unchanged.

---

## Success Criteria

### Functional

- [ ] Every route reachable at md+ via the rail (no URL typing); Store setup + Log out reachable at every breakpoint
- [ ] Exactly one link per route in the DOM (single-nav render)
- [ ] Content capped 720 / 1080px, centred
- [ ] Shopping list 2-col + header controls at md+; This week 3-across at md+; Store setup side-by-side at md+ — all unchanged below md
- [ ] Catalog 3rd column at `xl`, page capped 1080px
- [ ] Hover feedback on cards, shopping-list rows, cooking accordion

### Non-Functional

- [ ] `md` is the only breakpoint switch (plus catalog `xl`)
- [ ] No new colours or type sizes
- [ ] Full `vitest run` green; `Layout.test.tsx` rewritten

### Quality

- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                  | Type   | Stories                                                                                                            | Objective                                                     |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 032-desktop-layout-ui | Simple | 009-responsive-test-infrastructure, 001-left-rail-navigation, 002-content-measure-cap, 003-login-vertical-centring | Foundation: test infra + the rail shell + measure cap + login |
| 033-desktop-layout-ui | Simple | 004-shopping-list-two-column, 005-this-week-three-across, 006-store-setup-side-by-side                             | The three md+ screen reshapes                                 |
| 034-desktop-layout-ui | Simple | 007-catalog-xl-third-column, 008-pointer-hover-states                                                              | Catalog breakpoint move + pointer/hover states                |

Sequence: `026 → 027 → 028`. 027 and 028 both need the rail + measure from 026; they are
independent of each other.

---

## Notes

`Layout.reference.tsx` uses pure CSS `display` toggling for the two navs, which would put two links
per route in the DOM — every existing `Layout.test.tsx` query is singular. Bolt `026` therefore
renders one nav at a time via `useBreakpointValue`, which is why the `matchMedia` polyfill +
`ChakraProvider` render wrapper (FR-9) must land in the same bolt, first.
