# System Architecture

## Overview

A client-heavy single-page app that talks directly to Supabase (Backend-as-a-Service). Business logic lives in the frontend; access control lives in Postgres. The one exception is **Supabase Edge Functions** — a thin serverless surface used only where a secret must never reach the browser (currently: the Claude API proxy).

## Architecture Style

Client-heavy SPA over BaaS, with Edge Functions for secret-holding work

The React app calls Supabase directly for all data access (dinner catalog, weekly selections). Logic like shopping-list ingredient aggregation and the "exactly 3 picks" rule runs client-side. This keeps the whole system to one static deployable plus a handful of stateless Deno functions.

### Backend surfaces

1. **Supabase Postgres + RLS** — all data access; the single authorization boundary (below).
2. **Supabase Edge Functions (Deno)** — stateless serverless handlers for work that cannot run in the browser because it holds a secret. Today just `claude-proxy` (intent `007-claude-integration`): it verifies the caller's Supabase JWT, resolves their household, enforces a per-household daily call cap, resolves that household's **own** Anthropic API key from **Supabase Vault** (via a `service_role`-only `resolve_ai_key()` — the key never reaches the client), calls Claude, and writes one `ai_usage_log` row per attempt. Both JWT verification _and_ RLS gate it. There is no shared Anthropic key. See `decision-index.md` ADR-4.

## Store Layout & Placement (intent `010`)

The grocery-store layout is modelled as **Store → Location → Item**, and it is the one domain
where meaningful logic lives in Postgres rather than the client:

- **Store** — a household's walking-path configuration; exactly one active per household, with
  the multi-store schema already in place so v2 is UI-only.
- **Location** — a stop on the path (`section` or `aisle`), ordered by a single `position` per
  store. Reordering goes through `reorder_location(uuid, integer)`, a `security invoker` RPC.
- **Item** — a **derived**, deduped registry of ingredient names (`name_key =
lower(btrim(name))`). Nothing creates Items from application code: a trigger on
  `dinner_ingredients` get-or-creates one on every write, so a future recipe-import feature
  needs no changes here (decision-index **ADR-7**).
- **Placement** — explicit (`item_placements`) or inherited (`category_placements`). Resolution
  is explicit → inherited → unassigned, defined **once** in the `item_location_resolution` view
  (`security_invoker = true`) so the store-config page and the shopping-list sort cannot
  disagree.

Cross-store and cross-household references are made _unwritable_ by composite foreign keys that
carry the scope column inside the reference, rather than checked in policies or app code
(**ADR-8**).

This replaces intent `001` unit `004`'s category→row mapping. Its tables
(`grocery_store_rows`, `category_row_assignments`) still exist but are retired-in-waiting —
the drop is written and held outside `supabase/migrations/` until the last reader is gone
(**ADR-9**).

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

- Architecture style is what makes the SPA-first tech-stack decision (`tech-stack.md`) viable — there's no always-on server, just static hosting plus stateless Edge Functions.
- RLS is the direct consequence of having no general backend layer to place authorization logic in — and, since intent `004-account-model`, the _only_ place multi-household isolation and new-account provisioning can live (see `decision-index.md` ADR-3).
- Edge Functions exist only for secret-holding work: an API key can't ship in a static bundle, so the Claude call is proxied server-side (ADR-4). New server logic should default to an Edge Function, not a separate service.
