---
stage: model
bolt: 037-claude-proxy-service
unit: 001-claude-proxy-service
created: '2026-08-31T17:30:00Z'
---

## Static Model: claude-proxy-service (bolt 037 — AI config + metering + key vault)

**First bolt of unit `001-claude-proxy-service` / intent `007-claude-integration`.** Introduces
the database layer the `claude-proxy` Edge Function (bolt 038) sits on: two tables
(`household_ai_config`, `ai_usage_log`), their RLS, and the three `security definer` functions
that store / clear / resolve a household's own Anthropic key in **Supabase Vault**. No existing
table, function, or policy is touched.

### Bounded Context

The **AI Access** context: per-household configuration and metering for Claude calls. It sits
beneath the Dinner-Planner context and beside the Account context (intent 004) — it reuses
`households` / `profiles` / `household_members` and `current_user_household_id()` but owns no
dinner/plan/store data. Its job is (1) hold each household's AI settings and its key reference,
(2) record every proxy call attempt. The ubiquitous term is **household key** (each household
brings its own) — there is no shared/project key.

### Entities

- **HouseholdAiConfig**: `household_id` (uuid, PK, FK → `households` `on delete cascade`),
  `model_override` (text, nullable — a `ModelId` or null = "use server default"),
  `daily_call_limit` (int, not null, default 25, `check >= 0`), `key_secret_id` (uuid, nullable
  — reference to a Vault secret; null = no key → Claude is off for the household), `updated_at`
  (timestamptz, not null, default `now()`), `updated_by` (uuid, nullable, FK → `profiles`).
  Business rules: exactly one row per household, created lazily (first owner write first-touches
  it via upsert; a missing row reads as all-defaults); **any member may `select`** it;
  **only an `owner`** may `insert` / `update` it; `model_override` is constrained to the
  allowlist (`check model_override is null or model_override in (...)`); `key_secret_id` is
  set/cleared **only** by the `HouseholdKeyVault` functions, never a direct client write.

- **AiUsageLogEntry**: `id` (uuid, PK, `gen_random_uuid()`), `household_id` (uuid, not null,
  FK → `households` `on delete cascade`), `profile_id` (uuid, nullable, FK → `profiles` — the
  caller), `created_at` (timestamptz, not null, default `now()`), `feature` (text, not null —
  a caller tag, e.g. `'connection_test'`), `model` (text, not null), `input_tokens` (int,
  nullable), `output_tokens` (int, nullable), `est_cost_usd` (numeric(10,6), nullable), `ok`
  (boolean, not null), `error_code` (text, nullable — an `ErrorCode` on failure, null on
  success), `latency_ms` (int, nullable). Business rules: **immutable** — no `update` and no
  `delete` ever (removed only by household cascade); **written only by the service-role Edge
  Function** — there is no `authenticated` `insert` policy (same stance as `meal_history` in
  intent 004); **any member may `select`** their household's rows. Index `(household_id,
created_at)` — supports both the member-facing "my household's usage" read and the
  `DailyCallCount` the rate-limit predicate (bolt 038) computes.

### Value Objects

| Value Object       | Representation                                                                                            | Constraints                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ModelId**        | text — `claude-sonnet-5` \| `claude-haiku-4-5` \| `claude-opus-5`                                         | Modelled as a `check` constraint, not a Postgres `enum` — consistent with this project's `role` / `dinner_ingredients.category` choice (free text + `check`), so widening the set later needs no type migration. `null` in `model_override` means "use the server default" (`ANTHROPIC_MODEL`, `claude-sonnet-5`). |
| **ErrorCode**      | text — `rate_limited` \| `no_api_key` \| `upstream_error` \| `timeout` \| `bad_request` \| `no_household` | **Not** constrained at the DB level — `ai_usage_log.error_code` records whatever the Edge Function writes; the closed set is enforced in the function (bolt 038). Deliberately loose: a log column should never reject a write.                                                                                    |
| **UsageCost**      | `numeric(10,6)` USD                                                                                       | Computed by the function from `input_tokens`/`output_tokens` × a per-model rate table (bolt 038); the DB only stores it. Six decimals cover sub-cent per-call costs. `null`/`0` when the call failed before Anthropic was reached.                                                                                 |
| **DailyCallCount** | derived `int` (not stored)                                                                                | `count(*)` of `AiUsageLogEntry` for a household since `date_trunc('day', now() at time zone 'utc')`. Bolt 037 provides only the table + index that make it cheap; the count + the 429 decision live in bolt 038.                                                                                                   |
| **VaultSecretRef** | `uuid` (`household_ai_config.key_secret_id`)                                                              | An opaque pointer into Supabase Vault. Discloses nothing. Non-null **iff** a Vault secret exists for the household (kept in lockstep by the functions).                                                                                                                                                            |

### Aggregates

| Aggregate Root               | Members                                         | Invariants                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HouseholdAiConfig**        | the config row + the Vault secret it references | `key_secret_id` is non-null **iff** a Vault secret exists for the household — `set`/`clear` keep both sides consistent in **one transaction** (no orphan secret, no dangling ref). `model_override ∈ allowlist ∪ {null}`. `daily_call_limit >= 0`. Mutated only by an owner (settings columns) or by the definer functions (`key_secret_id`). |
| **AiUsageLog** (append-only) | the set of `AiUsageLogEntry` for a household    | Entries are never modified or removed except by household `on delete cascade`. Exactly one entry per proxy call **attempt** — that 1:1 rule is the Edge Function's responsibility (bolt 038); this bolt guarantees only that the client cannot write, update, or delete entries.                                                              |

### Domain Events

_Ubiquitous-language markers only — this project is not event-sourced (same stance as every
prior bolt)._

- **HouseholdKeySet**: an owner stored or replaced their household's Anthropic key. Trigger:
  `set_household_ai_key`. Payload: `household_id`, `key_secret_id`, `updated_by`.
- **HouseholdKeyCleared**: an owner removed the key. Trigger: `clear_household_ai_key`.
  Payload: `household_id`.
- **AiCallMetered**: an `AiUsageLogEntry` was written. Trigger: the Edge Function after **any**
  call attempt (bolt 038). Payload: the row. (No Postgres trigger — see Relevant Prior
  Decision.)

### Domain Services

- **HouseholdKeyVault** — the three `security definer` functions that are the only code allowed
  to touch key material:
  - `set_household_ai_key(p_key text) → void` — **owner guard** (below); rejects an empty
    `p_key` (`bad_request`); creates or updates a Vault secret named deterministically
    `ai_key:{household_id}` (so repeated sets update in place); upserts the
    `HouseholdAiConfig` row with the resulting `key_secret_id` and `updated_by = auth.uid()`,
    `updated_at = now()`. One transaction — a failure on either side commits neither. Returns
    nothing; never returns or logs the key.
  - `clear_household_ai_key() → void` — owner guard; deletes the household's Vault secret and
    sets `key_secret_id = null`, `updated_by`, `updated_at`. No-op success when no key is set.
  - `resolve_ai_key(p_household_id uuid) → text` — **`execute` granted to the `service_role`
    only** (revoked from `public` / `authenticated` / `anon`); returns the decrypted key for
    the given household, or `null` when `key_secret_id` is null / the secret is missing. Takes
    an explicit `p_household_id` because the Edge Function derives the household server-side,
    not from `auth.uid()`. This is the **only** decrypt path in the system.
- **OwnerGuard** — the shared predicate reused by RLS (`household_ai_config` insert/update) and
  by `set`/`clear`: `exists (select 1 from public.household_members m where m.profile_id =
(select auth.uid()) and m.household_id = <target> and m.role = 'owner')`. The target for the
  functions is `current_user_household_id()` (the caller's household); callers never pass a
  household id to `set`/`clear`.

### Repository Interfaces

_Conceptual query surface — no ORM; these map to Supabase client calls, RLS, and RPC._

- **HouseholdAiConfigRepository**:
  - `getOwn() → HouseholdAiConfig | defaults` — any member (RLS-scoped `select`).
  - `upsertOwnSettings({ modelOverride?, dailyCallLimit? })` — owner only (RLS + first-touch
    upsert).
  - `setKey(plaintext)` / `clearKey()` — owner only, via `rpc('set_household_ai_key' |
'clear_household_ai_key')`.
- **AiUsageLogRepository**:
  - `listForOwnHousehold({ since? }) → AiUsageLogEntry[]` — any member, **read only**. No
    `insert` / `update` / `delete` method exists on the client.
- **AiKeyResolver** (service-role only, used by bolt 038's Edge Function):
  - `resolve(householdId) → key | null` — `rpc('resolve_ai_key', { p_household_id })` with the
    service-role client.

### Ubiquitous Language

| Term                           | Definition                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Household key**              | A household's own Anthropic API key. Lives only in Supabase Vault; referenced by `household_ai_config.key_secret_id`. There is no shared/project key.     |
| **Key is set / Claude is off** | A household with `key_secret_id` non-null can make Claude calls; one with it null gets `no_api_key`.                                                      |
| **Household AI config**        | The per-household row of non-secret Claude settings: model override, daily call limit, whether a key is set.                                              |
| **Model override**             | A household's chosen model, replacing the server default; must be an allowlisted `ModelId`.                                                               |
| **Daily call limit**           | Max proxy call **attempts** per household per **UTC** day (default 25). Enforced in bolt 038; this bolt stores the number and the log it is counted from. |
| **Usage log entry**            | One immutable record per proxy call attempt — feature, model, tokens, estimated cost, `ok`/`error_code`, latency.                                         |
| **Metering**                   | Writing a usage log entry for every attempt (success or failure). The audit trail.                                                                        |
| **Owner guard**                | The "caller is an `owner` of this household" check — enforced in the DB (RLS + the definer functions), never only in the client.                          |
| **Founding household**         | Intent 004's single pre-existing household; not special here — just one row that will get an AI config like any other.                                    |

### Relevant Prior Decision

- **ADR-1** (_Postgres triggers + RPC for domain-invariant enforcement_) applies directly.
  With no application server, "owner-only writes", "`model_override` is allowlisted",
  "`ai_usage_log` is immutable and client-unwritable", and "`key_secret_id` changes only via
  definer code" are invariants that can only live in the database — expressed here as RLS
  policies, `check` constraints, **absent** policies, and `security definer` functions. This
  bolt is ADR-1's pattern applied to AI config + metering; the `security definer` + pinned
  `search_path` shape is standard Supabase hardening, not a project-specific choice.
- **ADR-2** (_derived writes on a state transition belong in a trigger_) does **not** apply:
  there is no Postgres state transition to hook. The one derived write (`ai_usage_log`) is
  tied to an **outbound HTTP call** to Anthropic, which only the Edge Function can observe, so
  it is written by the function (bolt 038), deliberately not a trigger. Noted so a reader does
  not expect one.
- **ADR candidate for Stage 3**: _storing a per-tenant secret in Supabase Vault, referenced by
  id, decrypted only by a single service-role function_. This is a security approach not in
  the standards, it affects every future AI feature, and it has a real alternative
  (`pgsodium`-encrypted column). Flag for the Stage 3 ADR analysis — not decided here.

### Stories covered

- **001-ai-config-and-usage-tables** → `HouseholdAiConfig`, `AiUsageLogEntry`, `ModelId`,
  `ErrorCode`, `UsageCost`, `DailyCallCount`; the two aggregates; RLS rules (member read,
  owner-only config write, no client write to the log).
- **002-household-key-storage-functions** → `HouseholdKeyVault` service, `OwnerGuard`,
  `VaultSecretRef`, `HouseholdKeySet` / `HouseholdKeyCleared` events, the lockstep invariant,
  `resolve_ai_key` service-role-only.
