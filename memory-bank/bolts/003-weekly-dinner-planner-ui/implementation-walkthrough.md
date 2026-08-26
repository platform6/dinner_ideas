---
stage: implement
bolt: 003-weekly-dinner-planner-ui
created: 2026-08-26T20:45:00Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 1 of 4)

### Summary

Stood up the app for the first time: a Vite + React + TypeScript + Chakra UI SPA with a Supabase-backed shared household login, and the browsable/filterable/suppressible dinner catalog. Closed out the app-scaffolding gaps (build scripts, lint/format config, generated DB types) so the codebase actually lints, typechecks, and builds end-to-end.

### Structure Overview

Feature-based layout per `coding-standards.md`: `src/features/auth` (login/session), `src/features/dinners` (catalog data + UI), `src/shared` (Supabase client, React Query client, generated DB types, app shell). `App.tsx` wraps a `react-router-dom` route shell in an `AuthGate`; only `/` is wired to real content this bolt, reserving `/plan`, `/shopping-list`, `/cooking` for later bolts.

### Completed Work

- [x] `package.json` — added `name`/`type: module`, `dev`/`build`/`lint`/`format`/`test`/`prepare` scripts, and `lint-staged` config (previously had dependencies only, no scripts)
- [x] `eslint.config.js` — flat ESLint config: `@typescript-eslint/recommended` + `eslint-plugin-react-hooks`, per `coding-standards.md`
- [x] `.prettierrc.json` — 2-space indent, semicolons, single quotes, per `coding-standards.md`
- [x] `.husky/pre-commit` — runs `lint-staged` (eslint --fix + prettier) on staged files
- [x] `tsconfig.node.json` — fixed to satisfy TS project-reference rules (`composite: true`, dedicated `outDir`, `types: ["node"]`)
- [x] `src/vite-env.d.ts` — Vite client type reference (needed for `import.meta.env` typing)
- [x] `vite.config.ts` — switched to `vitest/config`'s `defineConfig` (so the `test` block typechecks) and made the `@` path alias ESM-safe (`import.meta.url` instead of `__dirname`, which doesn't exist under `"type": "module"`)
- [x] `src/shared/lib/database.types.ts` — generated via `supabase gen types typescript --linked` against the linked project (was referenced by code but didn't exist yet)
- [x] `src/shared/lib/supabase.ts` — typed Supabase client, reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, fails fast with a clear error if unset
- [x] `src/shared/lib/queryClient.ts` — shared React Query client (short `staleTime`, low retry count — household-scale traffic)
- [x] `src/shared/components/Layout.tsx` — top nav (app name, page links, log out) wrapping routed page content
- [x] `src/features/auth/useAuth.ts` — session state + `signIn`/`signOut` wrapping `supabase.auth`
- [x] `src/features/auth/LoginForm.tsx` — email/password form for the shared household login
- [x] `src/features/auth/AuthGate.tsx` — renders `LoginForm` when logged out, the app when logged in
- [x] `src/features/dinners/types.ts` — `Dinner`/`DinnerIngredient`/`DinnerWithIngredients` types derived from generated DB types
- [x] `src/features/dinners/api.ts` — `fetchActiveDinners`, `fetchSuppressedDinners`, `setDinnerActive`
- [x] `src/features/dinners/hooks.ts` — `useDinners`, `useSuppressedDinners`, `useSetDinnerActive` (React Query, with cache invalidation on suppress/un-suppress)
- [x] `src/features/dinners/components/DinnerCard.tsx` — single dinner card with "Not interested" / "Un-suppress" action depending on variant
- [x] `src/features/dinners/components/CatalogFilters.tsx` — cuisine select, Rosie-approved checkbox, cook-time sort toggle
- [x] `src/features/dinners/components/CatalogPage.tsx` — active/suppressed catalog view, client-side filter/sort, empty/loading/error states
- [x] `src/App.tsx` — route shell (`AuthGate` → `Layout` → `Routes`)
- [x] `src/main.tsx` — app entry: `ChakraProvider` → `QueryClientProvider` → `BrowserRouter` → `App`
- [x] `src/test/setup.ts` — Vitest + jest-dom setup

### Key Decisions

- **`vitest/config` over `vite`'s `defineConfig`**: needed so the `test` block in `vite.config.ts` typechecks against Vitest's config augmentation, rather than erroring as an unknown property.
- **ESM-safe path alias**: with `"type": "module"` set on `package.json`, `vite.config.ts` runs as ESM where `__dirname` doesn't exist — used `fileURLToPath(new URL(...))` instead.
- **"Suppressed" view reuses `CatalogPage`**: a `showSuppressed` toggle switches the query and the card's action/variant, rather than a separate page/component tree, per the implementation plan's reasoning (same list shape, inverted filter).

### Deviations from Plan

- The implementation plan didn't call out the TS project-reference/composite-project fixes (`tsconfig.node.json`) or the `vite-env.d.ts`/`vitest-config` fixes explicitly — these were groundwork gaps found while verifying the build (`tsc -b`, `eslint`, `vite build` all now pass clean) and fixed as part of finishing the scaffolding this bolt was scoped to deliver.
- Husky's `prepare` script runs `.git can't be found` because this project isn't yet a git repository — the pre-commit hook file is in place and will activate as soon as `git init` happens (outside this bolt's scope).

### Dependencies Added

- [x] `@types/node` — needed for `node:url`/`node:path` types in `vite.config.ts` under `moduleResolution: Bundler`

### Developer Notes

- Verified end-to-end: `pnpm run lint`, `pnpm exec tsc -b`, and `pnpm run build` all pass clean.
- `pnpm run test` currently exits non-zero with "No test files found" — expected, since no test files exist yet; that's Stage 3 (Test) of this bolt, not in scope here.
- Real Supabase credentials live in `.env.local` (gitignored); `.env.example` documents the two required vars.
