-- Dinner Catalog: generic tags (intent 001-weekly-dinner-planner, unit 001-dinner-catalog)
-- Story: 004-generic-tags-schema (FR-9, added post-deployment as bolt 009-dinner-catalog)
-- See memory-bank/bolts/009-dinner-catalog/ddd-02-technical-design.md for design rationale.
-- Additive/subtractive migration — does not modify 20260826175605_dinner_catalog_schema.sql directly,
-- but does drop that migration's rosie_approved column as part of this same logical change.

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = lower(name))
);

comment on table public.tags is 'Shared, lowercase-normalized tag vocabulary (FR-9). Replaces the old dinners.rosie_approved boolean with an open, user-managed set of labels.';
comment on column public.tags.name is 'Always lowercase — enforced here, not just client-side, per ADR-1''s principle of not trusting the client alone for invariants.';

create table if not exists public.dinner_tags (
  dinner_id uuid not null references public.dinners(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  unique (dinner_id, tag_id)
);

comment on table public.dinner_tags is 'One dinner <-> tag association. Deleting a dinner_tags row never deletes the shared tags row itself.';

create index if not exists idx_dinner_tags_dinner_id on public.dinner_tags (dinner_id);
create index if not exists idx_dinner_tags_tag_id on public.dinner_tags (tag_id);

-- Row Level Security: same shape as dinners/dinner_ingredients/dinner_steps —
-- single shared household login, no per-user roles, gate on authentication only.

alter table public.tags enable row level security;
alter table public.dinner_tags enable row level security;

create policy "Authenticated household can read tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "Authenticated household can insert tags"
  on public.tags for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update tags"
  on public.tags for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can delete tags"
  on public.tags for delete
  to authenticated
  using (true);

create policy "Authenticated household can read dinner_tags"
  on public.dinner_tags for select
  to authenticated
  using (true);

create policy "Authenticated household can insert dinner_tags"
  on public.dinner_tags for insert
  to authenticated
  with check (true);

create policy "Authenticated household can delete dinner_tags"
  on public.dinner_tags for delete
  to authenticated
  using (true);

-- Replace the old fixed Rosie-approved flag with the generic tag system.
-- No data migration: existing rosie_approved = true dinners are NOT auto-tagged —
-- every dinner starts untagged, per explicit user decision (see inception-log.md Scope Changes, 2026-08-27).

alter table public.dinners drop column if exists rosie_approved;
