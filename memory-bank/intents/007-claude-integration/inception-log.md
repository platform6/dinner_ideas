---
intent: 007-claude-integration
created: '2026-08-31T16:00:00Z'
completed: '2026-08-31T17:15:00Z'
status: complete
---

# Inception Log: claude-integration

## Overview

**Intent**: Introduce the Anthropic (Claude) API as a shared, secured integration layer — a
Supabase Edge Function (`claude-proxy`) that authenticates the caller, resolves a per-household
or shared Anthropic key, enforces a per-household daily call cap, calls Claude
(`@anthropic-ai/sdk`, default `claude-sonnet-5`, non-streaming), and meters every attempt in
`ai_usage_log`. Ships one proof surface — a `/settings` page with a **Test Connection** card —
and no AI product feature. Recipe import (intent 008) is the first real consumer.
**Type**: green-field (new backend surface) + brown-field (new settings route)
**Created**: 2026-08-31

## Artifacts Created

| Artifact       | Status                                   | File                                                                                          |
| -------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Requirements   | ✅ (approved, Checkpoint 2 — 2026-08-31) | requirements.md                                                                               |
| System Context | ✅                                       | system-context.md                                                                             |
| Units          | ✅                                       | units.md + units/001-claude-proxy-service/unit-brief.md + units/002-settings-ui/unit-brief.md |
| Stories        | ✅                                       | units/001-claude-proxy-service/stories/_.md (4) + units/002-settings-ui/stories/_.md (3)      |
| Bolt Plan      | ✅                                       | memory-bank/bolts/037–039/bolt.md (3)                                                         |

## Summary

| Metric                      | Count                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| Functional Requirements     | 10                                                                 |
| Non-Functional Requirements | 5 groups (Security, Reliability, Performance, Cost, Observability) |
| Units                       | 2                                                                  |
| Stories                     | 7                                                                  |
| Bolts Planned               | 3 (037, 038, 039)                                                  |

## Units Breakdown

| Unit                     | Stories      | Bolts    | Priority | Complexity                                           |
| ------------------------ | ------------ | -------- | -------- | ---------------------------------------------------- |
| 001-claude-proxy-service | 4 (all Must) | 037, 038 | Must     | M–L (first Edge Function / external API / Vault use) |
| 002-settings-ui          | 3 (all Must) | 039      | Must     | S–M                                                  |

All 7 stories are Must after the Checkpoint 3 decision (no shared key → the owner key control
is the sole enable path). The softest scope now is the model-override / daily-limit inputs
inside story `002-settings-ui/003`.

## Bolt Sequence

```
037-claude-proxy-service (DB: tables + RLS + key functions)
        │
        ▼
038-claude-proxy-service (Edge Function + docs)
        │
        ▼
039-settings-ui (callClaude + /settings + AI card)
```

## Decision Log

| Date       | Decision                                                                                       | Rationale                                                                                                                                                                               | Approved                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-08-31 | Intent number `007` = claude-integration                                                       | Next free prefix. The 004 doc's forward references to `007-auth-flows` / `008-account-settings` are stale planning notes; those intents were never created and will take later numbers. | Yes (user)                                                                                         |
| 2026-08-31 | Server surface = Supabase Edge Function (`claude-proxy`), not a Netlify function               | Backend is Supabase-centric; the function can verify the Supabase JWT and query RLS tables directly                                                                                     | Yes (implied by stack)                                                                             |
| 2026-08-31 | Scope = plumbing + a `/settings` "Test Connection" card; no AI feature                         | User (Checkpoint 1): "simple to start"; import is a separate later intent                                                                                                               | Yes (user)                                                                                         |
| 2026-08-31 | Key model = shared project key + optional per-household Vault override (owner-set, write-only) | User (Checkpoint 1) chose "shared + per-household override"                                                                                                                             | Yes — **superseded 2026-08-31 at Checkpoint 3 (see below): per-household key only, no shared key** |
| 2026-08-31 | Default model `claude-sonnet-5`, configurable; allowlist sonnet-5 / haiku-4-5 / opus-5         | User (Checkpoint 1) chose "configurable, default Sonnet 5"                                                                                                                              | Yes (user)                                                                                         |
| 2026-08-31 | Guardrails = per-household daily call cap (default 25) + `ai_usage_log` row per attempt        | User (Checkpoint 1) chose "per-household rate limit + usage log"                                                                                                                        | Yes (user)                                                                                         |
| 2026-08-31 | Non-streaming only in v1                                                                       | Test Connection doesn't need it; import can add streaming later                                                                                                                         | Yes (agent, non-blocking)                                                                          |
| 2026-08-31 | **No shared `ANTHROPIC_API_KEY`** — per-household key only (Checkpoint 3)                      | User: "build it as if every household will have their own key ... I'll enter my key as a test at the end"                                                                               | Yes (user)                                                                                         |

## Scope Changes

| Date       | Change                                                                       | Reason                       | Impact                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-31 | Dropped the shared-key path; per-household Vault key is the only enable path | Checkpoint 3 decision (OQ-2) | FR-2 Should→Must; FR-8 owner key control Should→Must; stories `001-cps/002`, `001-cps/003-…`(owner), `002-sui/003` all Should→Must; function loses its env-key code path; `ANTHROPIC_API_KEY` removed from config; no story/bolt count change |

## Ready for Construction

- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete (Checkpoint 3 — 2026-08-31; re-approved after the per-household-key change)

## Next Steps

1. Begin Construction Phase
2. Start with Unit `001-claude-proxy-service`, bolt `037-claude-proxy-service`
3. Execute: `/specsmd-construction-agent --intent="007-claude-integration"`

## Dependencies

```
004-account-model (complete)
        │
        ▼
001-claude-proxy-service   bolt 037 (DB: tables + RLS + Vault key fns)
        │                          │
        │                          ▼
        │                  bolt 038 (Edge Function + docs)
        ▼                          │
002-settings-ui  ──────────────────┘  bolt 039 (callClaude + /settings + AI card)
```
