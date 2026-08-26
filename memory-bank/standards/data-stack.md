# Data Stack

## Overview

Supabase (managed PostgreSQL) as the sole data layer, accessed directly from the browser via the official JS client — no custom backend server or traditional ORM.

## Database

Supabase (PostgreSQL)

Already provisioned and connected via the Supabase CLI/MCP. Provides Postgres, auth, and row-level security in one managed service — a good fit for a small, low-traffic personal app with no dedicated ops.

## ORM / Database Client

`@supabase/supabase-js`

Since the app is a browser-only SPA with no server layer, a Node-based ORM (Prisma, Drizzle, etc.) isn't applicable. The Supabase JS client is used directly from React components/hooks, with TypeScript types generated from the live schema (`generate_typescript_types`) for type-safe queries. Access control is enforced via Postgres Row Level Security (RLS) policies rather than application-layer authorization.

## Decision Relationships

- Follows directly from the tech-stack decision to skip a server layer (see `tech-stack.md`) — Supabase's client-side SDK + RLS replaces the need for a custom API/ORM.
