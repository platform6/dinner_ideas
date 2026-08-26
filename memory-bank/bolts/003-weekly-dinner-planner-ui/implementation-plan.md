---
stage: plan
bolt: 003-weekly-dinner-planner-ui
created: 2026-08-26T19:36:03Z
updated: 2026-08-26T19:43:10Z
---

**Revised** after the user added FR-8 (Cooking View) and clarified navigation should be separate pages, not tabs — see `inception-log.md` Scope Changes. The "no router yet" decision below is reversed; `react-router-dom` is now part of this bolt's scaffolding.

## Implementation Plan: weekly-dinner-planner-ui (bolt 1 of 4)

### Objective

Stand up the app itself for the first time — Vite + React + TypeScript + Chakra UI scaffold, a Supabase client wired to the live "dinner ideas" project, a shared household login gate, and the browsable/filterable/suppressible dinner catalog.

### Deliverables

**App scaffolding** (not its own story, but required groundwork per the unit brief):
- Vite + React + TypeScript project (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`)
- Chakra UI provider + minimal theme
- `@tanstack/react-query` `QueryClientProvider`
- Supabase client (`src/shared/lib/supabase.ts`), configured from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars (`.env.local`, gitignored; `.env.example` committed as a template)
- Generated DB types (`src/shared/lib/database.types.ts`) via `supabase gen types typescript --linked`
- `react-router-dom` with a minimal route shell: `/` (catalog, built now), reserving `/plan`, `/shopping-list`, `/cooking` for bolts 004/005/008, plus a simple nav bar (Chakra UI) linking pages as they come online
- ESLint + Prettier config, `husky` + `lint-staged` pre-commit hook (per `coding-standards.md`)
- Vitest + React Testing Library setup

**001-household-login**:
- `src/features/auth/useAuth.ts` — hook wrapping `supabase.auth` (session, `signIn`, `signOut`)
- `src/features/auth/LoginForm.tsx` — email/password form for the shared household credentials
- An `AuthGate` at the app root: renders `LoginForm` when logged out, the app when logged in; session persists via Supabase's default client storage

**002-browse-filter-sort-catalog**:
- `src/features/dinners/types.ts` — `Dinner`, `DinnerIngredient` types (derived from generated DB types)
- `src/features/dinners/api.ts` — `fetchActiveDinners()` (PostgREST query: `is_active=eq.true`, embeds `dinner_ingredients`)
- `src/features/dinners/hooks.ts` — `useDinners()` (`react-query`)
- `src/features/dinners/components/DinnerCard.tsx`, `CatalogFilters.tsx` (cuisine select, Rosie-approved checkbox, cook-time sort), `CatalogPage.tsx` (client-side filter/sort against the already-fetched list)

**009-suppress-dinner**:
- `src/features/dinners/api.ts` — add `fetchSuppressedDinners()`, `setDinnerActive(id, isActive)`
- `src/features/dinners/hooks.ts` — add `useSuppressedDinners()`, `useSetDinnerActive()` (mutation, invalidates both dinner queries on success)
- `CatalogPage.tsx` — "Not interested" action per `DinnerCard`; a "Suppressed" view toggle reusing the same list/card components against the suppressed query, with an "Un-suppress" action instead

### Dependencies

- `001-dinner-catalog` (complete): seeded, active `dinners`/`dinner_ingredients` to display
- `002-weekly-planning` (complete): not directly used by this bolt's 3 stories, but confirms the project is otherwise ready
- npm packages: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `@tanstack/react-query`, `@chakra-ui/react` (+ its peer deps: `@emotion/react`, `@emotion/styled`, `framer-motion`), dev: `vite`, `typescript`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `eslint` + `@typescript-eslint/*` + `eslint-plugin-react-hooks`, `prettier`, `husky`, `lint-staged`
- Supabase project URL + anon (publishable) key for "dinner ideas" (ref `gpkqsedtlzxczmarxjia`) — needed for `.env.local` and the generated-types command

### Technical Approach

- **Real routing from the start** (revised from the original "no router yet" plan): `AuthGate` wraps a `react-router-dom` router. `/` renders `CatalogPage` now; `/plan`, `/shopping-list`, and `/cooking` are added by their respective later bolts (004, 005, 008). This keeps each concern on its own page — including the eventual recipe-management page (FR-6) — rather than growing a single mega-screen.
- Filtering/sorting is client-side against the full fetched dinner list (per `system-architecture.md`'s performance NFR — the whole catalog is tens of rows).
- The "Suppressed" view reuses `CatalogPage`'s list/card rendering rather than being a separate component tree, to avoid duplicating dinner-card UI for what's really the same list with an inverted filter and a different action button.
- Per `coding-standards.md`, mock the Supabase client at the boundary in tests rather than hitting the live project.

### Acceptance Criteria

- [ ] Logged-out visitor sees only the login form; correct credentials log in and persist across reloads; incorrect credentials show a clear error
- [ ] Catalog shows all active dinners (name, cuisine, cook time, Rosie-approved) with working cuisine filter, Rosie-approved filter, and cook-time sort, combinable and clearable
- [ ] "Not interested" on any dinner suppresses it (disappears from the default view); a "Suppressed" view lists hidden dinners with an "Un-suppress" action that restores them
