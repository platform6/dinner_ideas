---
stage: plan
bolt: 023-frontend-review-ui
created: 2026-08-28T18:50:00Z
---

## Implementation Plan: frontend-review-ui — bolt 023 (rest of theme-patch.ts)

### Objective

Apply `theme-patch.ts` §§2–5 to `src/shared/theme/index.ts` — the olive-hairline token, the Alert
palette, theme entries for Menu / Textarea / CloseButton, and the global focus ring — plus the one
call-site edit the token rename forces (`CookingViewPage.tsx`). Still essentially one file.

### Stories

- **005-name-brand-subtle-hairline** (Could) — §2
- **002-alert-palette** (Should) — §4
- **003-menu-textarea-closebutton-theme** (Must) — §3
- **004-global-focus-ring** (Must) — §5

Implement in the order 005 → 003 → 002 → 004: §§3 and 4 reference `line.brandSubtle` from §2.

### Deliverables

**1. `src/shared/theme/index.ts` — `line` block (§2, story 005)**

- Add `brandSubtle: '#E3E7DA'` to `colors.line` (currently line 39).

**2. `src/shared/theme/index.ts` — replace the 3 raw `#E3E7DA` literals (story 005)**

- `layerStyles.cardSelected.borderColor` (L134) → `'line.brandSubtle'`
- `components.Input.variants.filled.field.borderColor` (L256) → `'line.brandSubtle'`
- `src/features/cooking-view/components/CookingViewPage.tsx` (L97) → `'line.brandSubtle'`
  (currently `borderColor={isExpanded ? '#E3E7DA' : 'line.subtle'}`)

**3. `src/shared/theme/index.ts` — `Alert` entry (§4, story 002)**

- Replace the current 3-line `Alert` block (L283–287) with the full §4 block: `baseStyle.container`
  (radius/border/font/padding/`alignItems: flex-start`) + `baseStyle.icon`, `variants.subtle` as a
  `(props) => …` status map (`error`/`warning` → `heart`, `success` → `brand` + `line.brandSubtle`,
  `info` → neutral paper), `defaultProps.variant = 'subtle'`.
- No `<Alert>` call site changes — they keep passing `status="error"` / `status="success"`.

**4. `src/shared/theme/index.ts` — add `Menu`, `Textarea`, `CloseButton` to `components` (§3, story 003)**

- `Menu.baseStyle` — `list` (paper.base panel, `line.subtle` border, `card` radius, `raised`
  shadow) + `item` (body font, `ink.700`, paper.subtle hover/focus, `brand.50` active) +
  `groupTitle`.
- `Textarea.variants.filled` (paper.subtle bg, `line.brandSubtle` border, `field` radius) +
  `defaultProps.variant = 'filled'`.
- `CloseButton.baseStyle` (`ink.400` → `ink.700` hover, `chip` radius) + `sizes.sm` (16px).

**5. `src/shared/theme/index.ts` — global focus ring (§5, story 004)**

- Add the §5 `:focus-visible` selector block (a, button, [role="button"], input, select, textarea,
  [tabindex]) to `styles.global` — 3px `rgba(74,103,65,0.28)`, `outline: none`, `control` radius.
- Remove `_focusVisible` from `components.Button.baseStyle` (L172) — the global rule replaces it.

### Dependencies

- **Bolt `022`** (complete) — same file, sequenced after.
- `002-kitchen-table-theme` (complete) — owns the theme file and `CookingViewPage.tsx`.
- No packages, schema, or API.

### Technical Approach

- Diff each `theme-patch.ts` section against the current theme before pasting — the handoff predates
  the enhancement-round `Select` entry and the current `Alert` stub, so paste into the right spot,
  don't blind-replace.
- `theme-patch.ts` §3 exports one object (`menuTheme`) with three keys; spread those keys into
  `components`.
- §4's `variants.subtle` is a function — Chakra v2 `extendTheme` supports function variants; keep
  the signature `(props: { status?: string }) => ({ container, icon })`.
- **Known interaction to verify in Stage 3**: `Input.variants.filled` and `Select.variants.outline`
  already set `_focusVisible: { boxShadow: 'none' }`. Component-level `_focusVisible` is normally
  more specific than `styles.global`, so inputs/selects should keep their existing look while the
  global ring reaches the previously-unstyled controls (Menu items, accordion header `as="button"`,
  the pick `Checkbox`). Confirm both: ring appears where it was missing, inputs unchanged.

### Acceptance Criteria

- [ ] `colors.line.brandSubtle === '#E3E7DA'`; no `#E3E7DA` literal anywhere in `src/`
- [ ] `Alert` entry matches §4; all `<Alert>` call sites (README: 11) render `heart`/`brand`, none edited, no stock red/green/blue
- [ ] `Menu`, `Textarea`, `CloseButton` entries match §3; overflow menu + Cuisine/Tags dropdowns render themed panels; clipboard `Textarea` is `filled` by default; tag-chip `CloseButton` is `ink.400`→`ink.700`
- [ ] Global `:focus-visible` rule present; `Button` baseStyle `_focusVisible` removed; keyboard focus shows the olive ring on the cooking accordion header and the dinner-card pick checkbox; `Button` still shows exactly one ring
- [ ] Inputs/selects keep their current focus look (no double ring, no regression)
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; `vitest run` green (update only assertions that pinned Chakra defaults)

### Out of Scope

- `theme-patch.ts` §1 (done in bolt `022`)
- Cuisine multi-select / filter chips (bolt `024`); shopping-list bar / card layerStyles (bolt `025`)
- Any `<Alert>` call-site edit
