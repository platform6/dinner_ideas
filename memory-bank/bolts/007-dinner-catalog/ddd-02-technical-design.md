---
stage: design
bolt: 007-dinner-catalog
created: 2026-08-26T22:38:22Z
---

## Technical Design: dinner-catalog (follow-up: cooking steps)

### Architecture Pattern

Same **BaaS-direct data layer** pattern as `001-dinner-catalog`: this bolt's entire deliverable is an additive Postgres migration (schema + RLS + seed content), queried directly by the UI unit via PostgREST — no application code layer here.

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Reads via Supabase JS client (bolt 008, out of scope here)
├─────────────────────────────┤
│   PostgREST auto-API        │  Supabase-generated REST surface, extended with dinner_steps
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies (same shape as sibling tables)
├─────────────────────────────┤
│   Postgres schema           │  dinner_steps (new, additive — this bolt's deliverable)
└─────────────────────────────┘
```

### API Design

No hand-written API — PostgREST auto-exposes the new table, same as `001-dinner-catalog`'s tables:

- **Get one dinner's steps, ordered**: `GET /rest/v1/dinner_steps?dinner_id=eq.{id}&order=step_number.asc` — Response: `DinnerStep[]`
- **Get steps for the cooking view's 3 dinners, embedded and ordered**: `GET /rest/v1/dinners?id=in.({id1},{id2},{id3})&select=*,dinner_steps(*)&dinner_steps.order=step_number.asc` — Response: `Dinner[]` each with its ordered `dinner_steps[]` — this is the shape bolt `008`'s cooking view will actually use, mirroring the existing `fetchDinnersByIds`/`dinner_ingredients` embed pattern from `003-weekly-dinner-planner-ui`.

### Data Model

- **`dinner_steps`** (new): `id` (uuid, pk, default `gen_random_uuid()`), `dinner_id` (uuid, not null, `REFERENCES dinners(id) ON DELETE CASCADE`), `step_number` (integer, not null, `CHECK (step_number > 0)`), `instruction` (text, not null) — `UNIQUE (dinner_id, step_number)`.

**Indexes**:
- `idx_dinner_steps_dinner_id` on `dinner_steps(dinner_id)` — supports the embed/join and per-dinner ordering, mirroring `idx_dinner_ingredients_dinner_id` from `001-dinner-catalog`.

### Security Design

- **RLS**: Enabled on `dinner_steps`, identical policy shape to `dinners`/`dinner_ingredients` — gated on `auth.role() = 'authenticated'` for `SELECT`/`INSERT`/`UPDATE`/`DELETE`, no anonymous access, no per-row differentiation (single shared household session).

### NFR Implementation

- **Performance**: Trivial volume (~50 dinners × ~4-6 steps ≈ 250-300 rows) — the FK index is essentially free future-proofing, not a functional requirement at this scale.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults.

### Integrations

- **Migration**: A new, additive SQL migration (applied via `supabase db push` against the linked project, same as `001-dinner-catalog`) — does not edit the original `001-dinner-catalog` migration.
- **Seed content**: Each of the 50 existing dinners' one-line `instructions` is expanded into discrete, ordered `dinner_steps` rows (per story `003-dinner-step-by-step-instructions`'s technical notes) — content authored as part of this bolt's Implement stage.
- **Idempotency**: Unlike `001-dinner-catalog`'s name-keyed `dinners` upsert, this migration upserts on the table's own natural key: `INSERT ... ON CONFLICT (dinner_id, step_number) DO UPDATE SET instruction = excluded.instruction` — re-running the migration in dev updates step text in place rather than erroring or duplicating.
