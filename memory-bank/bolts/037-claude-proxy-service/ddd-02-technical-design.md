---
stage: design
bolt: 037-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T17:35:00Z'
---

## Technical Design: claude-proxy-service (bolt 037)

### Architecture Pattern

Unchanged from the project: client-heavy SPA over Supabase, **RLS is the only access-control
boundary**, invariants live in Postgres (`ADR-1`). This bolt adds two tables and three
`security definer` functions via a single additive migration, plus a pgTAP file. No frontend
and no Edge Function here (bolts 038 / 039).

### Layer Structure

```text
┌─────────────────────────────┐
│ Presentation                │  (none — /settings UI is bolt 039)
├─────────────────────────────┤
│ Application                  │  set_household_ai_key / clear_household_ai_key  (owner RPCs)
│                              │  resolve_ai_key                                  (service-role only)
├─────────────────────────────┤
│ Domain / Infrastructure      │  household_ai_config, ai_usage_log tables + RLS
│                              │  Supabase Vault (key material)
└─────────────────────────────┘
```

### Migration

**File**: `supabase/migrations/20260831130000_ai_config_and_key_vault.sql` (additive; edits
nothing). Sorts after `20260831120000_advisor_hardening.sql`.

**Order within the file**:

1. `create table public.household_ai_config` (+ `check` on `model_override`, `check` on
   `daily_call_limit`)
2. `create table public.ai_usage_log` (+ index `(household_id, created_at desc)`)
3. **Column-privilege revokes** — `key_secret_id` is not writable by `authenticated` / `anon`
   (see Security Design); belt-and-suspenders `revoke insert/update/delete on ai_usage_log`
4. `alter table ... enable row level security` on both
5. Policies (member `select` on both; owner `insert` + `update` on `household_ai_config`; no
   others)
6. `create function public.set_household_ai_key(text)` / `clear_household_ai_key()` /
   `resolve_ai_key(uuid)` — with `revoke all from public` then explicit `grant`

### Data Model

| Table                 | Columns                                                                                                                                                                                                                                                                                                                  | Keys / constraints                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `household_ai_config` | `household_id uuid`, `model_override text`, `daily_call_limit int not null default 25`, `key_secret_id uuid`, `updated_at timestamptz not null default now()`, `updated_by uuid`                                                                                                                                         | PK `household_id`; `household_id references households(id) on delete cascade`; `updated_by references profiles(id)`; `check (daily_call_limit >= 0)`; `check (model_override is null or model_override in ('claude-sonnet-5','claude-haiku-4-5','claude-opus-5'))` |
| `ai_usage_log`        | `id uuid default gen_random_uuid()`, `household_id uuid not null`, `profile_id uuid`, `created_at timestamptz not null default now()`, `feature text not null`, `model text not null`, `input_tokens int`, `output_tokens int`, `est_cost_usd numeric(10,6)`, `ok boolean not null`, `error_code text`, `latency_ms int` | PK `id`; `household_id references households(id) on delete cascade`; `profile_id references profiles(id)`; index `idx_ai_usage_log_household_created on (household_id, created_at desc)`                                                                           |

`error_code` is intentionally **not** constrained — a log column must never reject a write; the
closed set is enforced in the Edge Function (bolt 038).

### Functions

```sql
-- OWNER: store / replace the caller's household key. One transaction.
create or replace function public.set_household_ai_key(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
  v_name text;
  v_secret_id uuid;
begin
  if v_household is null then
    raise exception 'no household for caller' using errcode = '42501';
  end if;
  if not exists (select 1 from public.household_members m
                 where m.profile_id = (select auth.uid())
                   and m.household_id = v_household and m.role = 'owner') then
    raise exception 'only a household owner can manage the AI key' using errcode = '42501';
  end if;
  if p_key is null or length(btrim(p_key)) = 0 then
    raise exception 'api key must not be empty' using errcode = '22023';
  end if;

  v_name := 'ai_key:' || v_household::text;
  select key_secret_id into v_secret_id from public.household_ai_config where household_id = v_household;
  if v_secret_id is null then
    select id into v_secret_id from vault.secrets where name = v_name;  -- adopt any drifted secret
  end if;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(p_key, v_name, 'Anthropic API key for household ' || v_household::text);
  else
    perform vault.update_secret(v_secret_id, p_key);
  end if;

  insert into public.household_ai_config (household_id, key_secret_id, updated_by, updated_at)
  values (v_household, v_secret_id, (select auth.uid()), now())
  on conflict (household_id) do update
    set key_secret_id = excluded.key_secret_id,
        updated_by    = excluded.updated_by,
        updated_at    = excluded.updated_at;
end;
$$;

-- OWNER: remove the caller's household key. No-op success when none set.
create or replace function public.clear_household_ai_key()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
  v_name text;
begin
  if v_household is null then
    raise exception 'no household for caller' using errcode = '42501';
  end if;
  if not exists (select 1 from public.household_members m
                 where m.profile_id = (select auth.uid())
                   and m.household_id = v_household and m.role = 'owner') then
    raise exception 'only a household owner can manage the AI key' using errcode = '42501';
  end if;

  v_name := 'ai_key:' || v_household::text;
  delete from vault.secrets where name = v_name;

  update public.household_ai_config
    set key_secret_id = null, updated_by = (select auth.uid()), updated_at = now()
    where household_id = v_household;
end;
$$;

-- SERVICE ROLE ONLY: decrypt the household's key, or null.
create or replace function public.resolve_ai_key(p_household_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.household_ai_config c
  join vault.decrypted_secrets ds on ds.id = c.key_secret_id
  where c.household_id = p_household_id
$$;

revoke all on function public.set_household_ai_key(text)   from public;
grant  execute on function public.set_household_ai_key(text)   to authenticated;
revoke all on function public.clear_household_ai_key()     from public;
grant  execute on function public.clear_household_ai_key()     to authenticated;
revoke all on function public.resolve_ai_key(uuid)         from public;
grant  execute on function public.resolve_ai_key(uuid)         to service_role;
```

- All three are `security definer` (owned by `postgres`, which has `usage` on `vault` and
  `execute` on `vault.create_secret` / `vault.update_secret`, and `select` on
  `vault.decrypted_secrets` in a Supabase project) + pinned `search_path` — standard hardening.
- `set` / `clear` derive the household from `current_user_household_id()` and check `owner`
  inline — the caller never passes a household id, so there is no way to target another
  household.
- `resolve_ai_key` takes an explicit `p_household_id` (the Edge Function supplies the
  server-derived value) and is the **only** path that reads decrypted key material; `execute`
  is granted to `service_role` only.
- Deterministic secret name `ai_key:{household_id}` → repeated `set` updates in place; `clear`
  deletes by name so a row can never be orphaned.

### RLS Policies

```sql
alter table public.household_ai_config enable row level security;
alter table public.ai_usage_log        enable row level security;

create policy "member reads household ai config"
  on public.household_ai_config for select to authenticated
  using (household_id = public.current_user_household_id());

create policy "owner inserts household ai config"
  on public.household_ai_config for insert to authenticated
  with check (
    household_id = public.current_user_household_id()
    and exists (select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner')
  );

create policy "owner updates household ai config"
  on public.household_ai_config for update to authenticated
  using (
    household_id = public.current_user_household_id()
    and exists (select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner')
  )
  with check (
    household_id = public.current_user_household_id()
    and exists (select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner')
  );
-- NO delete policy on household_ai_config.

create policy "member reads household ai usage log"
  on public.ai_usage_log for select to authenticated
  using (household_id = public.current_user_household_id());
-- NO insert / update / delete policy on ai_usage_log — the service-role Edge Function
-- (bolt 038) bypasses RLS; clients can never write it.
```

- `to authenticated` on every policy; `anon` gets nothing.
- `(select auth.uid())` in a scalar sub-select — the Supabase-recommended per-statement form.
- Owner `insert`/`update` on `household_ai_config` exists because bolt 039 sets
  `model_override` / `daily_call_limit` with a plain table write.

### Security Design

| Concern                                                                                                                                                                                         | Approach                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Key-swap escalation** — an owner sets `household_ai_config.key_secret_id` to _another_ household's Vault ref, then `resolve_ai_key` for their own household returns the other household's key | `revoke insert (key_secret_id), update (key_secret_id) on public.household_ai_config from authenticated, anon;` — the column is writable **only** by the definer functions (owner-guarded, deterministic name). The owner `insert`/`update` policy still works for `model_override` / `daily_call_limit`. |
| Key material in a client-readable place                                                                                                                                                         | Key lives only in `vault.secrets` / `vault.decrypted_secrets`; `household_ai_config` holds only the opaque `uuid`. `decrypted_secrets` is not granted to `authenticated` / `anon`.                                                                                                                        |
| Client writing `ai_usage_log`                                                                                                                                                                   | No `insert`/`update`/`delete` policy; plus explicit `revoke insert, update, delete on public.ai_usage_log from authenticated, anon`. Service role bypasses RLS.                                                                                                                                           |
| Definer function reading Vault                                                                                                                                                                  | `search_path = ''`, fully schema-qualified body, `revoke all from public` then explicit grant; `resolve_ai_key` grantable to `service_role` only.                                                                                                                                                         |
| Non-owner / no-household caller of `set`/`clear`                                                                                                                                                | Inline `owner` check raises `42501`; `current_user_household_id()` null → same.                                                                                                                                                                                                                           |
| `model_override` set to an unknown model                                                                                                                                                        | `check` constraint rejects it at write time (both the table and, later, the function validate).                                                                                                                                                                                                           |

### NFR Implementation

| Requirement                                                   | Design                                                                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate-limit count is cheap (bolt 038)                          | `idx_ai_usage_log_household_created on (household_id, created_at desc)` — the `count(*) where household_id = ? and created_at >= ?` is an index range scan |
| Function overhead low                                         | `resolve_ai_key` is one indexed PK lookup + one Vault join; `stable`                                                                                       |
| Migration applies from scratch **and** on the current prod DB | pure `create` / `create or replace`, `if not exists` on tables + index; touches no existing object or data                                                 |
| No orphan Vault secret / dangling ref                         | `set` and `clear` do the Vault op + the `household_ai_config` write in one function body (one transaction); `clear` deletes by deterministic name          |

### Integration Points

- **`households` / `profiles` / `household_members` / `current_user_household_id()`** (intent 004) — FK targets and the owner guard. Referenced only.
- **Supabase Vault** (`vault.secrets`, `vault.decrypted_secrets`, `vault.create_secret`,
  `vault.update_secret`) — new dependency; **bolt 037's first task is a `vault.create_secret`
  round-trip smoke test** (see Risks). Fallback: a `pgsodium`-encrypted `bytea` column with the
  same three-function signatures.
- **Bolt 038** consumes `resolve_ai_key` (service-role) and reads `household_ai_config`,
  inserts `ai_usage_log`.
- **Bolt 039** calls `set_household_ai_key` / `clear_household_ai_key` (owner RPC), reads
  `household_ai_config`, reads `ai_usage_log`.

### Tests (`supabase/tests/database/ai_config_and_key_vault_test.sql`, pgTAP)

Fixtures follow the existing `account_model_rls_isolation_test.sql` pattern (two households A/B,
an owner + a member each, JWT claims via `set local request.jwt.claims`).

1. table/column/PK/FK/check shape (`has_table`, `has_column`, `col_is_pk`, `col_has_check`, …)
2. `model_override` check: rejects `'gpt-4'`, accepts `null` and `'claude-haiku-4-5'`
3. `key_secret_id` not writable by `authenticated` — a direct `update household_ai_config set
key_secret_id = ...` and an `insert ... (key_secret_id)` both raise `42501`
4. RLS isolation: B-member `select` on A's `household_ai_config` / `ai_usage_log` → 0 rows;
   B-member `insert`/`update`/`delete` on `ai_usage_log` → blocked
5. B-**member** (non-owner) `update household_ai_config` → 0 rows / blocked
6. owner A `set_household_ai_key('sk-ant-test')` → `household_ai_config.key_secret_id` non-null;
   a `vault.secrets` row named `ai_key:{A}` exists; no plaintext in `household_ai_config`
7. non-owner A `set_household_ai_key(...)` → raises `42501`
8. `set_household_ai_key('')` / `set_household_ai_key('   ')` → raises `22023`
9. `resolve_ai_key(A)` as `service_role` → `'sk-ant-test'`; as `authenticated` → function
   `execute` denied
10. `clear_household_ai_key()` (owner A) → `key_secret_id` null, `vault.secrets` row gone;
    second call → no error
11. `resolve_ai_key(A)` after clear → `null`; `resolve_ai_key` for a household with no config
    row → `null`

### Rollback

Single migration, no data written. Reverse:
`drop function public.resolve_ai_key(uuid), public.clear_household_ai_key(),
public.set_household_ai_key(text);` then `drop table public.ai_usage_log,
public.household_ai_config;` and `delete from vault.secrets where name like 'ai_key:%';`.
Documented as a comment block at the top of the migration.

### Risks

- **Vault availability / privileges on this project.** If `postgres` cannot
  `vault.create_secret` or `select vault.decrypted_secrets` from a `security definer` function,
  fall back to a `pgsodium`-encrypted `household_ai_config.encrypted_api_key bytea` column with
  identical `set` / `clear` / `resolve_ai_key` signatures. Decide after the smoke test at the
  start of implementation; record the outcome in `implementation-walkthrough.md` and (if the
  fallback is taken) `system-architecture.md` / `tech-stack.md` in bolt 038's story 004.

### Deviations from Domain Model

None. The column-privilege revoke on `key_secret_id` is an implementation detail of the
"`key_secret_id` changed only by definer code" invariant already stated in the model.
