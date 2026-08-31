---
unit: 001-claude-proxy-service
intent: 007-claude-integration
created: '2026-08-31T17:30:00Z'
last_updated: '2026-08-31T18:45:00Z'
---

# Construction Log: claude-proxy-service

## Original Plan

**From Inception**: 2 bolts planned (2026-08-31)

| Bolt ID                  | Stories  | Type                  |
| ------------------------ | -------- | --------------------- |
| 037-claude-proxy-service | 001, 002 | ddd-construction-bolt |
| 038-claude-proxy-service | 003, 004 | ddd-construction-bolt |

Sequence: `037 → 038`. Executed in order, no replanning.

## Replanning History

| Date | Action | Change | Reason | Approved |
| ---- | ------ | ------ | ------ | -------- |
| —    | —      | —      | —      | —        |

## Current Bolt Structure

| Bolt ID                  | Stories  | Status       | Changed |
| ------------------------ | -------- | ------------ | ------- |
| 037-claude-proxy-service | 001, 002 | ✅ completed | -       |
| 038-claude-proxy-service | 003, 004 | ✅ completed | -       |

## Notes

- Run executed autonomously (user goal: "complete remaining bolts; address issues at the
  end") — DDD stage checkpoints collapsed; findings batched to the end-of-run report.
- **ADR-4** created in bolt 037 (per-household Anthropic key in Supabase Vault, service-role
  decrypt). Added to `decision-index.md`.
- **`deno`** was installed (`npm i -g deno`, 2.9.6) to run the bolt-038 function tests.
- **Deferred to end-of-run report**: `supabase functions deploy claude-proxy` + `supabase
secrets set` on prod; a real Anthropic round-trip (needs a household key); confirm prod
  Vault behaviour. Everything runnable locally is green (pgTAP 210, Deno 13, `deno check`).
- **2026-08-31: migration `20260831130000` pushed to prod** (`supabase db push --linked`).
  Verified from a fresh `supabase db dump --linked`: both tables + all 3 functions present;
  RLS enabled; member-read / owner-write policies as designed; `resolve_ai_key` execute is
  `service_role` only; `key_secret_id` is **not** in any client grant (only
  `household_id, model_override, daily_call_limit, updated_at, updated_by` are column-granted
  to `authenticated`). The Edge Function itself is still **not** deployed.

## Decisions

| Date       | Decision                                                                                     | Rationale                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-31 | Column-revoke `key_secret_id` write from `authenticated`; re-grant the other columns         | A per-column `REVOKE` is a no-op while Supabase's table-level `GRANT ALL` stands — prevents an owner repointing the ref at another household's Vault secret (ADR-4) |
| 2026-08-31 | Vault primary path kept (no `pgsodium` fallback)                                             | Smoke test: `postgres` can `vault.create_secret` + read `vault.decrypted_secrets` from a `security definer` function locally                                        |
| 2026-08-31 | `revoke execute … from public, anon, authenticated` on `resolve_ai_key`                      | Supabase default privileges also grant `execute` to the api roles; `revoke … from public` alone is insufficient                                                     |
| 2026-08-31 | `@anthropic-ai/sdk` pinned to `0.122.0`, `@supabase/supabase-js` to `2.112.4` in `deno.json` | reproducible edge build; `deno check` needs a resolvable specifier                                                                                                  |
