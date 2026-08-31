# System Architecture

## Overview

A client-heavy single-page app that talks directly to Supabase (Backend-as-a-Service) — no custom server layer. Business logic lives in the frontend; access control lives in Postgres.

## Architecture Style

Client-heavy SPA over BaaS

The React app calls Supabase directly for all data access (dinner catalog, weekly selections). Logic like shopping-list ingredient aggregation and the "exactly 3 picks" rule runs client-side. This keeps the whole system to one deployable (the static frontend) with no server to operate.

## Security Patterns

Row Level Security (RLS) policies on Supabase tables, scoped to the caller's **household**.

Since there's no backend to add authorization checks in, RLS is the single enforcement point for who can read/write which rows. The account model is three-tier: `auth.users` → `profiles` (1:1) → `households` / `household_members` (one household per user for now). Every domain table carries a `household_id` (directly, or via its FK parent for child tables), and every policy gates on `household_id = public.current_user_household_id()` — a `stable` `security definer` helper that resolves the caller's household from `household_members`. New accounts are provisioned entirely in the database by a `handle_new_user()` trigger on `auth.users` (fresh household + seeded catalog, or join-by-invite via `household_invites`). Introduced in intent `004-account-model`; the founding household folds all pre-004 data under the original user.

**Deferred to later intents**: the public registration / login UI and invite-sending UI → `007-auth-flows`; per-household settings (e.g. `dinners_per_week`) → `008-account-settings`; multi-household membership / household switching → future.

## State Management

`@tanstack/react-query` for server state (fetching/caching the dinner catalog, mutating the weekly selection).

The app doesn't need a global client-state library (Redux/Zustand) — its only meaningful state is data that lives in Supabase, which React Query already handles well (caching, refetching, optimistic updates).

## Caching Strategy

React Query's in-memory cache for data; the PWA service worker (`vite-plugin-pwa`) handles offline asset/data caching so the current week's shopping list remains viewable without a signal.

## Decision Relationships

- Architecture style is what makes the SPA-only tech-stack decision (`tech-stack.md`) viable — there's no server, so there's nothing else to host.
- RLS is the direct consequence of having no backend layer to place authorization logic in — and, since intent `004-account-model`, the _only_ place multi-household isolation and new-account provisioning can live (see `decision-index.md` ADR-3).
