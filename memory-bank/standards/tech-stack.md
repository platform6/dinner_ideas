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

Supabase Auth, shared household password login

Single shared login for the household (not per-user accounts) — this is a private tool, not a multi-tenant app. No public signup flow.

## Infrastructure & Deployment

Netlify

Git-push deploys, zero-config static hosting for a Vite build, generous free tier for a low-traffic personal app.

## Package Manager

pnpm

## Decision Relationships

- SPA-only (no SSR) is viable *because* Supabase is the backend — there's no custom API layer to host.
- Shared-password auth is intentionally minimal since this is a two-person household tool, not a multi-user product.
