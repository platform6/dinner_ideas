# Tech Stack

## Overview

A TypeScript + Vite + React single-page app installed as a PWA, talking directly to Supabase (database, auth, RLS) from the browser. No custom backend server — deployed as a static site on Netlify.

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

Netlify

Git-push deploys, zero-config static hosting for a Vite build, generous free tier for a low-traffic personal app.

## Package Manager

pnpm

## Decision Relationships

- SPA-only (no SSR) is viable _because_ Supabase is the backend — there's no custom API layer to host.
- Per-user accounts + household-scoped RLS (intent `004-account-model`) are enforced entirely in Postgres (policies + a `handle_new_user()` trigger), so "no backend server" still holds even with real multi-tenant auth.
