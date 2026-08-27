---
stage: design
bolt: 009-dinner-catalog
created: 2026-08-27T02:20:00Z
---

## Technical Design: dinner-catalog (follow-up: generic tags)

### Architecture Pattern

Same **BaaS-direct data layer** pattern as `001-dinner-catalog`/`007-dinner-catalog`: this bolt's deliverable is an additive Postgres migration (schema + RLS), queried directly by the UI unit via PostgREST — no application code layer here.

### Layer Structure

```text
┌─────────────────────────────┐
│      UI (other unit)        │  Reads/writes via Supabase JS client (bolt 012, out of scope here)
├─────────────────────────────┤
│   PostgREST auto-API        │  Supabase-generated REST surface, extended with tags/dinner_tags
├─────────────────────────────┤
│   Row Level Security        │  Authenticated-household-only policies (same shape as sibling tables)
├─────────────────────────────┤
│   Postgres schema           │  tags, dinner_tags (new); dinners.rosie_approved dropped
└─────────────────────────────┘
```

### API Design

No hand-written API — PostgREST auto-exposes the new tables:

- **Get a dinner's tags**: `GET /rest/v1/dinner_tags?dinner_id=eq.{id}&select=tag_id,tags(name)` — Response: tag rows embedded by name.
- **List dinners with tags embedded** (for the catalog + details section): `GET /rest/v1/dinners?select=*,dinner_tags(tags(name))` — mirrors the existing `dinner_ingredients`/`dinner_steps` embed pattern.
- **Find-or-create a tag, then attach it**: two calls from the client — `INSERT ... ON CONFLICT (name) DO NOTHING` on `tags` (returns existing row on conflict via `select` after, or use `upsert` with `onConflict: 'name'` in the Supabase JS client), then `INSERT` into `dinner_tags` (also `ON CONFLICT DO NOTHING` on `(dinner_id, tag_id)` for idempotent "add same tag twice").
- **Remove a tag from a dinner**: `DELETE /rest/v1/dinner_tags?dinner_id=eq.{id}&tag_id=eq.{tagId}` — deletes only the association, never the `tags` row.
- **Filter dinners by tag(s)** (for the catalog tag filter): `GET /rest/v1/dinners?select=*,dinner_tags!inner(tags!inner(name))&dinner_tags.tags.name=in.({tag1},{tag2})` — an inner join through both association tables, matching the existing filter style already used for cuisine/cook-time.

### Data Model

- **`tags`** (new): `id` (uuid, pk, default `gen_random_uuid()`), `name` (text, not null, `UNIQUE`, `CHECK (name = lower(name))`) — the check constraint is what actually enforces "always lowercase," per ADR-1's principle of not trusting the client alone; the client normalizes too (belt-and-suspenders, avoids a round-trip error on mixed-case input) but the DB is the real guarantee.
- **`dinner_tags`** (new): `dinner_id` (uuid, not null, `REFERENCES dinners(id) ON DELETE CASCADE`), `tag_id` (uuid, not null, `REFERENCES tags(id) ON DELETE CASCADE`) — `UNIQUE (dinner_id, tag_id)`, composite/no surrogate key needed (pure association).
- **`dinners`** (existing, modified): `DROP COLUMN rosie_approved` (and its index, `idx_dinners_rosie_approved` if one exists — none does per the original migration, only `idx_dinners_cuisine_type`).

**Indexes**:

- `idx_dinner_tags_dinner_id` on `dinner_tags(dinner_id)` — supports "get this dinner's tags."
- `idx_dinner_tags_tag_id` on `dinner_tags(tag_id)` — supports "find dinners by tag" (the inner-join filter query above).
- `tags.name`'s `UNIQUE` constraint already gives it an index for find-or-create lookups.

### Security Design

- **RLS**: Enabled on both `tags` and `dinner_tags`, identical policy shape to `dinner_steps` — gated on `auth.role() = 'authenticated'` for `SELECT`/`INSERT`/`UPDATE`/`DELETE`, no anonymous access, no per-row differentiation (single shared household session). `UPDATE` on `tags` isn't actually used by the app (tags are add/remove, not renamed) but included for consistency with the sibling-table policy pattern rather than a special case.

### NFR Implementation

- **Performance**: Trivial volume (~50 dinners, a handful of distinct tags, a few associations per dinner) — indexes are future-proofing, not a functional requirement at this scale.
- **Reliability**: No custom design beyond Supabase's managed Postgres defaults; `ON DELETE CASCADE` on both FKs means deleting a dinner cleans up its `dinner_tags` rows automatically (a deleted/suppressed... note: suppression is `is_active = false`, not a real delete, so this cascade path is for the hypothetical hard-delete case only, not the normal suppress flow).

### Integrations

- **Migration**: A new, additive SQL migration (applied via `supabase db push` against the linked "dinner ideas" project, same as prior bolts) — does not edit the original `20260826175605_dinner_catalog_schema.sql`. Drops `rosie_approved` as part of this same migration (additive schema, subtractive column — both fit in one migration file since they're the same logical change).
- **No data migration**: per the approved decision, no seed/backfill step converts old `rosie_approved = true` rows into a `kid-friendly`/`rosie-approved` tag — the `tags`/`dinner_tags` tables simply start empty.
- **Idempotency**: `tags.name` UNIQUE + `ON CONFLICT DO NOTHING` upsert pattern makes re-running any tag-creation logic safe; the migration itself (DDL only, no data rows) is naturally idempotent via `CREATE TABLE IF NOT EXISTS` / `DROP COLUMN IF EXISTS`, matching prior migrations' style.
