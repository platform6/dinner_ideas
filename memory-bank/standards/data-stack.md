# Data Stack

## Overview

Supabase (managed PostgreSQL) as the sole data layer, accessed directly from the browser via the official JS client — no custom backend server or traditional ORM.

## Database

Supabase (PostgreSQL)

Already provisioned and connected via the Supabase CLI/MCP. Provides Postgres, auth, and row-level security in one managed service — a good fit for a small, low-traffic personal app with no dedicated ops.

## ORM / Database Client

`@supabase/supabase-js`

Since the app is a browser-only SPA with no server layer, a Node-based ORM (Prisma, Drizzle, etc.) isn't applicable. The Supabase JS client is used directly from React components/hooks, with TypeScript types generated from the live schema (`generate_typescript_types`) for type-safe queries. Access control is enforced via Postgres Row Level Security (RLS) policies rather than application-layer authorization.

## Logic in the Database

Access control is RLS, but a few _domain_ rules also live in Postgres, because there is no
server to hold them (decision-index **ADR-1**):

| Mechanism                                                                      | Why it is not application code                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triggers (weekly-plan invariants, `meal_history`, the **Items registry** sync) | The rule must hold for every writer, including ones not yet written (**ADR-2**, **ADR-7**)                                                                          |
| RPCs (`lock_weekly_plan`, `reorder_location`)                                  | Needs atomicity or row locking that a client round-trip cannot provide                                                                                              |
| Composite FKs (`item_placements`, `category_placements`)                       | Makes a cross-store/cross-household reference unwritable rather than merely unwritten (**ADR-8**)                                                                   |
| Views (`item_location_resolution`, `dinner_last_chosen`)                       | One definition consumed by several features, so they cannot drift. Always `security_invoker = true` — without it a view runs as its owner and silently bypasses RLS |

Generated types (`src/shared/lib/database.types.ts`) are regenerated from the live schema after
every migration. That couples the frontend's **compilability** to the schema, which is why
dropping a table a shipped feature references is a build-breaking change, not just a runtime
one (**ADR-9**).

## Decision Relationships

- Follows directly from the tech-stack decision to skip a server layer (see `tech-stack.md`) — Supabase's client-side SDK + RLS replaces the need for a custom API/ORM.
