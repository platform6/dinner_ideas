---
stage: design
bolt: 001-dinner-catalog
created: 2026-08-26T17:46:37Z
---

## Technical Design: dinner-catalog

### Architecture Pattern

**BaaS-direct data layer** — this unit's entire deliverable is a Postgres schema + RLS policies + a seed migration. There is no custom API server or application code layer: the UI unit (`003-weekly-dinner-planner-ui`) will query this schema directly via Supabase's auto-generated PostgREST API, per the client-heavy SPA-over-BaaS decision in `standards/system-architecture.md`.

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Reads/writes via Supabase JS client (out of scope here)
├─────────────────────────────┤
│   PostgREST auto-API        │  Supabase-generated REST surface over the schema below
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies
├─────────────────────────────┤
│   Postgres schema           │  dinners, dinner_ingredients (this bolt's deliverable)
└─────────────────────────────┘
```

### API Design

No hand-written REST/GraphQL API. Supabase's PostgREST auto-API exposes the schema below directly; the UI unit calls these shapes via `@supabase/supabase-js`:

- **List active dinners (catalog view)**: `GET /rest/v1/dinners?is_active=eq.true&select=*,dinner_ingredients(*)` — Request: none (RLS scopes by session) — Response: `Dinner[]` with nested `dinner_ingredients[]`
- **List suppressed dinners**: `GET /rest/v1/dinners?is_active=eq.false&select=*,dinner_ingredients(*)` — Response: `Dinner[]`
- **Get one dinner (with ingredients)**: `GET /rest/v1/dinners?id=eq.{id}&select=*,dinner_ingredients(*)` — Response: `Dinner`
- **Suppress / un-suppress**: `PATCH /rest/v1/dinners?id=eq.{id}` body `{ "is_active": boolean }` — Response: updated `Dinner`

### Data Model

- **`dinners`**: Columns: `id` (uuid, pk, default `gen_random_uuid()`), `name` (text, not null, **unique** — enables idempotent seeding), `cuisine_type` (text, not null — free text, not an enum, so new cuisines never require a migration), `cook_time_minutes` (integer, not null, `CHECK (cook_time_minutes > 0)`), `rosie_approved` (boolean, not null, default `false`), `instructions` (text, not null), `is_active` (boolean, not null, default `true`), `created_at` (timestamptz, not null, default `now()`) — Relationships: has many `dinner_ingredients`
- **`dinner_ingredients`**: Columns: `id` (uuid, pk, default `gen_random_uuid()`), `dinner_id` (uuid, not null, `REFERENCES dinners(id) ON DELETE CASCADE`), `name` (text, not null), `quantity` (numeric, not null, `CHECK (quantity > 0)`), `unit` (text, not null), `category` (text, not null, `CHECK (category IN ('Produce','Protein','Dairy','Grains','Pantry'))`) — Relationships: belongs to one `dinners` row

**Indexes**:
- `idx_dinners_is_active` on `dinners(is_active)` — supports default active-only catalog queries
- `idx_dinners_cuisine_type` on `dinners(cuisine_type)` — supports FR-1 cuisine filter
- `idx_dinner_ingredients_dinner_id` on `dinner_ingredients(dinner_id)` — supports the ingredient join

_Note: at the current household scale (~50 rows), these indexes are future-proofing rather than a functional requirement — `standards/requirements.md`'s NFR already expects filtering to be fast via a small dataset loaded client-side._

### Security Design

- **RLS**: Enabled on both `dinners` and `dinner_ingredients`.
- **Policy shape**: Single shared household login (no per-user roles, per `standards/tech-stack.md`) → policies simply gate on `auth.role() = 'authenticated'` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`. No row-level differentiation is needed since every authenticated session represents the same household.
- **No anonymous access**: the `anon` key must not be able to read or write either table.

### NFR Implementation

- **Performance**: Indexes above keep filtering fast even as the catalog grows well past 50 rows; acceptable to omit entirely at today's scale but included since they're essentially free.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults — no formal uptime target per `requirements.md`.

### Integrations

- **Seed migration**: A SQL migration inserting the 50 dinners + their ingredients from `units/001-dinner-catalog/seed-data-draft.md`. Uses `INSERT ... ON CONFLICT (name) DO NOTHING` keyed on `dinners.name` so re-running the migration in dev is a no-op rather than a duplicate insert (satisfies the "idempotent / re-runnable" success criterion from the unit brief).
- **Supabase project**: Already connected via the Supabase CLI/MCP for this session — migrations will be applied through that connection in Stage 4.
