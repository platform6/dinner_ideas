---
last_updated: 2026-09-01T18:20:00Z
total_decisions: 6
---

# Decision Index

This index tracks all Architecture Decision Records (ADRs) created during Construction bolts.
Use this to find relevant prior decisions when working on related features.

## How to Use

**For Agents**: Scan the "Read when" fields below to identify decisions relevant to your current task. Before implementing new features, check if existing ADRs constrain or guide your approach. Load the full ADR for matching entries.

**For Humans**: Browse decisions chronologically or search for keywords. Each entry links to the full ADR with complete context, alternatives considered, and consequences.

---

## Decisions

### ADR-1: Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement

- **Status**: accepted
- **Date**: 2026-08-26
- **Bolt**: 002-weekly-planning (weekly-planning)
- **Path**: `bolts/002-weekly-planning/adr-001-db-enforced-domain-invariants.md`
- **Summary**: This app has no backend server, so business-rule enforcement (not just access control) has nowhere to live except the database. Decided to enforce domain invariants (max-3 selections, exactly-3-to-lock, immutability after lock) via Postgres triggers, plus a single-purpose RPC function for the one action that needs atomicity (locking).
- **Read when**: Implementing any domain rule that must hold regardless of caller (state machines, cross-row counts, "exactly N" or "immutable once X" rules) in a unit backed by Supabase with no application server — check whether triggers/RPC functions are the right fit before reaching for client-side-only validation.

### ADR-2: Derived/History Writes on a State Transition Belong in a Trigger, Not the "Normal" RPC

- **Status**: accepted
- **Date**: 2026-08-27
- **Bolt**: 010-weekly-planning (weekly-planning)
- **Path**: `bolts/010-weekly-planning/adr-002-history-writes-belong-in-triggers.md`
- **Summary**: A derived write tied to a state transition (writing `meal_history` when a plan locks) was first designed inside the RPC every client call happens to use — but RLS permits other paths to cause the same transition. Decided to write it from an `AFTER UPDATE` trigger keyed on the transition itself, matching the existing exactly-3-on-lock trigger, so it fires regardless of caller.
- **Read when**: Adding any write (not just validation) that must happen whenever a row transitions between states (e.g. "record X whenever Y gets locked/approved/completed") in a Supabase-direct unit with no application server — check whether the write belongs on the transition (trigger) rather than inside whichever RPC/function is today's normal caller.

### ADR-3: One-Time Cutover of Existing Data Into a Single Founding Household

- **Status**: accepted
- **Date**: 2026-08-29
- **Bolt**: 030-household-data-model (household-data-model)
- **Path**: `bolts/030-household-data-model/adr-003-one-founding-household-model-cutover.md`
- **Summary**: Intent 004 replaced the single shared login with a three-tier `auth.users → profiles → households` model and household-scoped RLS, leaving all pre-004 data with a null `household_id`. Decided on a single forward migration that resolves the founding owner by email (`garrett.peter.conn@gmail.com`) and aborts loudly if absent, creates one founding household with a fixed UUID, stamps (not re-seeds) `household_id` onto existing rows, then sets the columns `NOT NULL` — idempotent for dev, forward-only for production.
- **Read when**: Writing a migration that folds pre-existing global/single-tenant data into a new ownership/tenancy model, backfilling a new not-null FK across live tables, or choosing how to pick an owner for legacy data — prefer an explicit lookup with a hard failure over guessing, use a fixed id for idempotency, and stamp existing rows rather than re-seeding. Also relevant when reasoning about the account model, `current_user_household_id()`, or why the `026→030` migrations must ship together.

### ADR-4: Per-Household Anthropic Key in Supabase Vault, Resolved Only by a Service-Role Function

- **Status**: accepted
- **Date**: 2026-08-31
- **Bolt**: 037-claude-proxy-service (claude-proxy-service)
- **Path**: `bolts/037-claude-proxy-service/adr-004-per-household-anthropic-key-in-vault.md`
- **Summary**: Intent 007 gives each household its own Anthropic API key (no shared key). Decided to store the key as a Supabase Vault secret named `ai_key:{household_id}`, keep only the opaque `key_secret_id` on `household_ai_config`, and mediate all access through three `security definer` functions — `set_household_ai_key` / `clear_household_ai_key` (owner-guarded, `authenticated`) and `resolve_ai_key` (`service_role` only, the single decrypt path). `key_secret_id` is column-revoked from `authenticated` so an owner cannot repoint it at another household's secret. Fallback if Vault is unusable from a definer function: a `pgsodium`-encrypted column with the same signatures.
- **Read when**: Storing any per-tenant secret / credential (API keys, tokens, webhook secrets) in a Supabase-direct app with no server; deciding between Supabase Vault and a `pgsodium` column; designing a read path that must be reachable by an Edge Function (service role) but never by a JWT client; or reasoning about `household_ai_config`, `resolve_ai_key`, or why the `claude-proxy` function holds no env key.

### ADR-5: Enforce the `claude-proxy` Daily Cap With an Atomic Counter Row, Not a Live `count(*)`

- **Status**: accepted
- **Date**: 2026-08-31
- **Bolt**: 040-claude-proxy-hardening (claude-proxy-hardening)
- **Path**: `bolts/040-claude-proxy-hardening/implementation-plan.md` (simple-construction bolt — no standalone ADR file)
- **Summary**: Intent 007 enforced the per-household daily call cap by `select count(*) from ai_usage_log where … < daily_call_limit` and inserting the usage row much later. That is not atomic under READ COMMITTED (concurrent requests all read the same count and all proceed — review finding 6), and every logged row counted, so a flood of `bad_request` rows consumed the cap (finding 5). Decided (intent 008 OQ-4) to add a dedicated `ai_call_counter (household_id, day, n)` table and a `service_role`-only `reserve_ai_call(household_id, limit)` `security definer` function that does a single `INSERT … ON CONFLICT (household_id, day) DO UPDATE SET n = n + 1 WHERE n < limit RETURNING n` — the `ON CONFLICT` row-lock serialises concurrent callers, a `NULL` return means at/over limit. The counter is bumped only immediately before a real Anthropic attempt, so `bad_request` / `no_api_key` / `rate_limited` structurally never consume it, and `ai_usage_log` stays purely an append-only audit trail (no UPDATE). Backend-side failures (the reserve, or the household/config/key lookups) fail **closed** as `upstream_error` (502) rather than proceeding as "0 used" (OQ-1: reuse the frozen `error_code` enum). Accepted cost: the counter and `ai_usage_log` row counts diverge (they measure reserved attempts vs. logged outcomes), and a function crash between reserve and call loses one slot for the day (fail-safe).
- **Read when**: Enforcing any per-tenant/per-window quota or rate limit in a Supabase-direct app with no server; deciding whether a live aggregate query is safe under concurrency (it usually isn't — reach for `INSERT … ON CONFLICT DO UPDATE … WHERE`); deciding whether to keep an audit table append-only vs. mutate it for bookkeeping; or reasoning about `ai_call_counter`, `reserve_ai_call`, why `claude-proxy` fails closed, or why an over-limit request with no key returns `no_api_key` rather than `rate_limited`.

### ADR-6: Write `household_ai_config` Through `security definer` RPCs, Not a PostgREST `.upsert()`

- **Status**: accepted
- **Date**: 2026-09-01
- **Bolt**: 042-settings-ai-remediation (settings-ai-remediation) — post-deploy fix
- **Path**: `intents/008-claude-proxy-review-remediation/deployment/deployment-plan.md` → "Post-deploy fix"; migration `supabase/migrations/20260901120000_ai_config_write_rpc.sql`
- **Summary**: `household_ai_config` is deliberately granted to `authenticated` at the **column level only** (no table-level `INSERT`/`UPDATE`) so a household owner cannot repoint `key_secret_id` at another household's Vault secret (ADR-4). Intent 008's FR-6 then revoked `UPDATE(updated_at, updated_by)` on top and had `updateAiConfig` keep a PostgREST `.upsert()` (`INSERT … ON CONFLICT DO UPDATE`). That shipped and **failed on prod with `42501 "permission denied for table household_ai_config"` even for a confirmed owner** — prod's PostgREST requires **table-level `UPDATE`** for the `ON CONFLICT DO UPDATE` form, which column grants don't provide (it passed locally — a PostgREST-version difference). The path had never been exercised end-to-end against real grants (all tests mocked `updateAiConfig` or used the key RPCs). Decided to move model/limit writes to two owner-checked `security definer` RPCs — `set_ai_model_override(text)` / `set_ai_daily_call_limit(integer)` — exactly the pattern `set_household_ai_key` / `clear_household_ai_key` already use: resolve the household server-side, check `role = 'owner'` (`42501`), validate (`22023`), `insert … on conflict do update`; the `stamp_household_ai_config_provenance` trigger still records provenance. `execute` granted to `authenticated` only. The `20260901000000` column-revoke stays as pure defense (the client no longer writes those columns directly).
- **Read when**: Writing to a table that uses **column-level grants** (a carve-out to protect a sensitive column) from a Supabase-direct client — a PostgREST `.upsert()` / `INSERT … ON CONFLICT DO UPDATE` will `42501` on it; use a `security definer` RPC instead. Also relevant when adding any owner-gated write to `household_ai_config`, or reasoning about `set_ai_model_override` / `set_ai_daily_call_limit` / why `updateAiConfig` calls `.rpc()` and takes no household id.
