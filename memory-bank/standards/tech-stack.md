# Tech Stack

## Overview

A TypeScript + Vite + React single-page app installed as a PWA, talking directly to Supabase (database, auth, RLS) from the browser, deployed as a static site on Netlify. No always-on backend server; the only server-side code is **Supabase Edge Functions** (Deno) for work that must hold a secret — currently the Claude API proxy.

## Languages

TypeScript

Type safety across the app; pairs well with React and Supabase-generated types (via `generate_typescript_types`).

## Framework

Vite + React, with `vite-plugin-pwa`

No server-side rendering needed — Supabase handles data/API/auth directly from the browser via Row Level Security, so a static SPA keeps the build and hosting simple. `vite-plugin-pwa` makes the app installable on a phone home screen with offline support (e.g. caching the current week's shopping list for viewing without a connection).

## Authentication

Supabase Auth, per-user email/password accounts

Public email/password registration. Each user gets a `profiles` row and belongs to exactly one `household` (`household_members`, `role` ∈ {`owner`, `member`}); all data is household-scoped via RLS. A new signup gets a fresh household seeded with the default catalog, unless their email has a pending `household_invites` row, in which case they join that household as a `member`. Provisioning runs in a `handle_new_user()` trigger on `auth.users` — still no backend server. Registration/invite **UI** ships in `007-auth-flows`; the model and DB provisioning landed in `004-account-model`. Multi-household membership is a future intent.

## Infrastructure & Deployment

Netlify (frontend) + Supabase (database, auth, Edge Functions)

Git-push deploys, zero-config static hosting for a Vite build. Database changes ship as `supabase/migrations/`; Edge Functions ship with `supabase functions deploy`.

## AI / LLM

Anthropic Claude via `@anthropic-ai/sdk` (Deno, pinned in `supabase/functions/claude-proxy/deno.json`) — **only** inside the `claude-proxy` Edge Function; the frontend gains no Anthropic dependency. Default model `claude-sonnet-5` (`ANTHROPIC_MODEL`), non-streaming. Each household supplies its **own** API key, stored in **Supabase Vault** and read only by the `service_role` `resolve_ai_key()` function — there is no shared/project key (intent `007-claude-integration`, `decision-index.md` ADR-4).

## Package Manager

pnpm (app). Edge Functions use Deno with its own `deno.json` import map (no pnpm).

## Decision Relationships

- SPA-first (no SSR) is viable _because_ Supabase is the backend — there's no general API layer to host, just narrow Edge Functions.
- Per-user accounts + household-scoped RLS (intent `004-account-model`) are enforced entirely in Postgres (policies + a `handle_new_user()` trigger).
- The Claude integration adds the first Edge Function purely to keep the API key off the client (ADR-4); it still touches Postgres only through RLS + a `service_role` function.
