# System Architecture

## Overview

A client-heavy single-page app that talks directly to Supabase (Backend-as-a-Service) — no custom server layer. Business logic lives in the frontend; access control lives in Postgres.

## Architecture Style

Client-heavy SPA over BaaS

The React app calls Supabase directly for all data access (dinner catalog, weekly selections). Logic like shopping-list ingredient aggregation and the "exactly 3 picks" rule runs client-side. This keeps the whole system to one deployable (the static frontend) with no server to operate.

## Security Patterns

Row Level Security (RLS) policies on Supabase tables, gated by the shared household Supabase Auth session.

Since there's no backend to add authorization checks in, RLS is the single enforcement point for who can read/write which rows. All authenticated household sessions share the same access level (no per-user roles needed at this scale).

## State Management

`@tanstack/react-query` for server state (fetching/caching the dinner catalog, mutating the weekly selection).

The app doesn't need a global client-state library (Redux/Zustand) — its only meaningful state is data that lives in Supabase, which React Query already handles well (caching, refetching, optimistic updates).

## Caching Strategy

React Query's in-memory cache for data; the PWA service worker (`vite-plugin-pwa`) handles offline asset/data caching so the current week's shopping list remains viewable without a signal.

## Decision Relationships

- Architecture style is what makes the SPA-only tech-stack decision (`tech-stack.md`) viable — there's no server, so there's nothing else to host.
- RLS is the direct consequence of having no backend layer to place authorization logic in.
