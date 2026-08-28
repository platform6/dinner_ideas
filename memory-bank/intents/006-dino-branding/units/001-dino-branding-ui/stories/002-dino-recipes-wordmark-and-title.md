---
id: 002-dino-recipes-wordmark-and-title
unit: 001-dino-branding-ui
intent: 006-dino-branding
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 035-dino-branding-ui
implemented: true
---

# Story: 002-dino-recipes-wordmark-and-title

## User Story

**As a** user
**I want** the app to call itself "Dino Recipes"
**So that** the name matches the logo I see

## Acceptance Criteria

- [ ] **Given** `src/shared/components/Layout.tsx`, **When** rendered at `md+`, **Then** the rail
      header text reads "Dino Recipes" (not "Dinner Ideas")
- [ ] **Given** `Layout.tsx` below `md`, **Then** the mobile header text reads "Dino Recipes"
- [ ] **Given** `src/features/auth/LoginForm.tsx`, **Then** the `<Heading>` reads "Dino Recipes"
- [ ] **Given** `index.html`, **Then** `<title>` is "Dino Recipes"
- [ ] **Given** `vite.config.ts`, **Then** the `VitePWA` manifest `name` and `short_name` are
      "Dino Recipes"
- [ ] **Given** the rest of the codebase, **Then** `package.json` `name`, the manifest
      `description`, the login tagline "Three dinners, one shopping list.", code comments, and
      `memory-bank/` docs are unchanged
- [ ] **Given** the test suite, **Then** any assertion matching "Dinner Ideas" on these surfaces
      (e.g. `Layout.test.tsx`, `LoginForm.test.tsx`) is updated to "Dino Recipes" and passes

## Technical Notes

- Pure string edits — five locations, listed in FR-2. Don't sweep the repo; other "Dinner
  Ideas" occurrences are deliberately retained.
- `LoginForm.tsx` keeps the tagline line directly under the heading as-is.
- Grep check after editing: `grep -rn "Dinner Ideas" src index.html vite.config.ts` should
  return nothing.

## Dependencies

### Requires

- None (independent of story `001`; can be done first or in parallel)

### Enables

- `003-dino-mark-in-chrome-login-and-icons` (the mark sits beside this text)

## Edge Cases

| Scenario                                                          | Expected Behavior             |
| ----------------------------------------------------------------- | ----------------------------- |
| A test renders `<Layout>` and asserts `getByText('Dinner Ideas')` | Update to `'Dino Recipes'`    |
| A snapshot test captures `<title>` or the manifest                | Regenerate the snapshot       |
| `package.json` `name` is `dinner-ideas`                           | Left unchanged — out of scope |

## Out of Scope

- Renaming anything not in the five-surface list
- The logo image itself (stories `001`, `003`)
