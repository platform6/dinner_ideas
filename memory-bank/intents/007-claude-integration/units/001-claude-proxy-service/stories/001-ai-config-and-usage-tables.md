---
id: 001-ai-config-and-usage-tables
unit: 001-claude-proxy-service
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 037-claude-proxy-service
implemented: true
---

# Story: 001-ai-config-and-usage-tables

## User Story

**As a** the platform (and the `claude-proxy` function)
**I want** a per-household AI config row and an append-only per-call usage log
**So that** each household's model / limit / key-reference is stored, and every Claude call
attempt is metered and auditable — with strict household isolation

## Acceptance Criteria

- [ ] **Given** a new migration under `supabase/migrations/`, **When** applied, **Then**
      `public.household_ai_config` exists:
      `household_id uuid primary key references households(id) on delete cascade`,
      `model_override text`, `daily_call_limit int not null default 25`,
      `key_secret_id uuid`, `updated_at timestamptz not null default now()`,
      `updated_by uuid references profiles(id)`
- [ ] **Given** `model_override` is set to a value not in the allowlist
      (`claude-sonnet-5`, `claude-haiku-4-5`, `claude-opus-5`), **Then** the write is rejected
      (check constraint or trigger); `null` is always allowed
- [ ] **Given** `public.ai_usage_log`, **Then** it has:
      `id uuid primary key default gen_random_uuid()`,
      `household_id uuid not null references households(id) on delete cascade`,
      `profile_id uuid references profiles(id)`,
      `created_at timestamptz not null default now()`,
      `feature text not null`, `model text not null`,
      `input_tokens int`, `output_tokens int`, `est_cost_usd numeric(10,6)`,
      `ok boolean not null`, `error_code text`, `latency_ms int`,
      and an index on `(household_id, created_at)`
- [ ] **Given** RLS on `household_ai_config`, **Then**: any household **member** may `select`
      their household's row; only an **owner** may `insert` / `update` (predicate uses
      `household_members.role = 'owner'` for the caller); no `delete` policy
- [ ] **Given** RLS on `ai_usage_log`, **Then**: household **members** may `select` their
      household's rows; there is **no** `insert` / `update` / `delete` policy for
      `authenticated` (writes come only from the service-role function — same immutability
      pattern as `meal_history`)
- [ ] **Given** a household with no `household_ai_config` row, **Then** consumers treat it as
      all-defaults (a `left join` + `coalesce`, or a first-touch upsert — implementer's choice,
      documented)
- [ ] **Given** the pgTAP suite, **Then** new cases cover: a member of household B gets 0 rows
      / permission error for household A's config and usage log on every verb; a non-owner
      member cannot write `household_ai_config`; the allowlist constraint rejects a bad model

## Technical Notes

- Reuse intent 004's `current_user_household_id()` and the `household_members` role column for
  the owner predicate.
- `est_cost_usd numeric(10,6)` — six decimals covers sub-cent per-call costs.
- `error_code` is free text at the DB level; the enum (`rate_limited`, `no_api_key`,
  `upstream_error`, `timeout`, `bad_request`, `no_household`) is enforced in the function.
- Keep the allowlist in one place if practical (a small `ai_allowed_models` table or a
  documented duplication between the constraint and the function).

## Dependencies

### Requires

- `004-account-model` (complete) — `households`, `profiles`, `household_members`,
  `current_user_household_id()`

### Enables

- `002-household-key-storage-functions` (writes `key_secret_id`)
- `003-claude-proxy-edge-function` (reads config, writes `ai_usage_log`)

## Edge Cases

| Scenario                                 | Expected Behavior                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| Household deleted                        | `on delete cascade` removes its config + usage rows                          |
| `daily_call_limit` set to 0              | Every call is `rate_limited` (a valid "disable AI for this household" state) |
| Concurrent first-touch of the config row | Upsert / `on conflict do nothing`; no duplicate PK error                     |

## Out of Scope

- The key-storage functions themselves → story 002
- Any function that writes `ai_usage_log` → story 003
- A usage-history UI → not in this intent
