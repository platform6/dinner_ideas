---
unit: 002-settings-ai-remediation
intent: 008-claude-proxy-review-remediation
phase: inception
status: complete
created: '2026-08-31T21:00:00Z'
updated: '2026-08-31T21:00:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Settings AI Remediation

> **Post-deploy amendment (2026-09-01, commit `ec41f22` / migration `20260901120000`).** FR-6
> as built kept `updateAiConfig` on a PostgREST `.upsert()`; that `42501`'d on prod (column-only
> grants + `ON CONFLICT DO UPDATE` needs table-level `UPDATE`). Model/limit writes now go
> through `security definer` RPCs `set_ai_model_override` / `set_ai_daily_call_limit`; the
> provenance trigger is unchanged. See `../../deployment/deployment-plan.md` → "Post-deploy fix"
> and `standards/decision-index.md` ADR-6. The `.upsert` / `keeps .upsert` mentions below are
> the as-planned record.

## Purpose

Fix the four settings-client defects from the `007` review: the "Daily call limit" field shows
a stale value, `callClaude` has no timeout so a hung proxy wedges the Test Connection button,
one `useEffect` is dead, and AI-config edits trust the client clock and never record
`updated_by`. Localized frontend changes plus one small `BEFORE INSERT OR UPDATE` trigger.

## Scope

### In Scope

- **FR-5** —
  - `ClaudeAiCard.tsx`: the daily-limit `<Input>` reflects the saved `dailyCallLimit` once the
    `['ai-config']` query resolves (controlled, or render-gated on `config.isSuccess`, or
    keyed to the loaded value).
  - `src/features/ai/api.ts`: `callClaude` bounds its `fetch` with an `AbortController`
    (≈60 s) and maps an abort to `ClaudeError('timeout', …)`.
  - `ClaudeAiCard.tsx`: remove the unmount-only `useEffect(() => () => setKeyInput(''), [])`
    and its misleading comment.
- **FR-6** —
  - `supabase/migrations/<ts>_ai_config_provenance.sql`: `BEFORE INSERT OR UPDATE` trigger on
    `household_ai_config` stamping `updated_by = auth.uid()`, `updated_at = now()`.
  - `src/features/settings/api.ts`: `updateAiConfig` keeps `.upsert(...)`, drops `updated_at`.

### Out of Scope

- Any Edge Function change → unit `001-claude-proxy-hardening`.
- New settings controls, redesign of the card, or a usage/cost view.
- Owner-only enforcement changes — RLS already gates writes; the trigger doesn't touch that.
- Retry logic in `callClaude` (still none in v1).

---

## Assigned Requirements

| FR   | Requirement                                               | Priority |
| ---- | --------------------------------------------------------- | -------- |
| FR-5 | The settings UI reflects saved AI config and never wedges | Should   |
| FR-6 | AI-config writes record server-side provenance            | Should   |

---

## Domain Concepts

### Key Entities

_None new. `household_ai_config` gains a trigger, not a column (`updated_by` / `updated_at`
already exist from `007` FR-1)._

### Key Operations

| Operation               | Description                                                          | Inputs                          | Outputs                            |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| Show saved daily limit  | Bind the input to the resolved query value, not a mount-time default | `['ai-config']` query result    | input shows saved number           |
| Bounded proxy call      | `fetch` the Edge Function with an abort timeout                      | `callClaude` args               | result \| `ClaudeError('timeout')` |
| Stamp config provenance | Trigger sets `updated_by = auth.uid()`, `updated_at = now()`         | any insert/update on the config | row with server provenance         |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 2     |
| Must Have     | 0     |
| Should Have   | 2     |
| Could Have    | 0     |

### Stories

| Story ID                                | Title                                                                              | Priority | Status  |
| --------------------------------------- | ---------------------------------------------------------------------------------- | -------- | ------- |
| 001-settings-ui-reflects-config-no-hang | Daily-limit field shows saved value; Test Connection never hangs; drop dead effect | Should   | Planned |
| 002-ai-config-write-provenance          | Trigger-stamped `updated_by` / `updated_at`; client drops `updated_at`             | Should   | Planned |

---

## Dependencies

### Depends On

| Unit                                 | Reason                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| `007-claude-integration` (committed) | Remediates its `/settings` card, `callClaude`, and config write |

### Depended By

_None._

### External Dependencies

| System             | Purpose                                                      | Risk |
| ------------------ | ------------------------------------------------------------ | ---- |
| Supabase PostgREST | `auth.uid()` available in the trigger context for a JWT call | Low  |

---

## Technical Context

### Suggested Technology

React + Chakra UI v2, TanStack Query, Vitest — all already in `src/features/settings` /
`src/features/ai`. `AbortController` is standard `fetch`. The trigger is plain PL/pgSQL.

### Integration Points

| Integration                  | Type | Protocol                               |
| ---------------------------- | ---- | -------------------------------------- |
| `['ai-config']` query        | DB   | `supabase-js` via `fetchAiConfig`      |
| `claude-proxy` function      | API  | `fetch` + `AbortController`            |
| `household_ai_config` upsert | DB   | `supabase-js.upsert` (trigger-stamped) |

### Data Storage

| Data                  | Type | Volume            | Retention |
| --------------------- | ---- | ----------------- | --------- |
| `household_ai_config` | SQL  | 1 row / household | n/a       |

---

## Constraints

- No change to the `callClaude` return type or the `ClaudeErrorCode` set beyond using the
  existing `'timeout'` code for an abort.
- `supabase/migrations/` append-only.
- The card's existing owner-gating, key set/clear flow, and Test Connection semantics are
  otherwise unchanged.

---

## Success Criteria

### Functional

- [ ] Loading `/settings` as an owner whose saved limit is `5` ⇒ the field shows `5`, not `25`
- [ ] With the proxy stubbed to hang, Test Connection surfaces a timeout within ~60 s and
      leaves its loading state
- [ ] No unmount-only key-clearing `useEffect` remains; entering + saving a key is unchanged
- [ ] After an owner edits model or limit, the row has `updated_by = <owner profile id>` and
      `updated_at` ≈ server now; the client no longer sends `updated_at`

### Non-Functional

- [ ] `007`'s settings tests stay green (same `.upsert` shape minus `updated_at`)

### Quality

- [ ] `vitest` green (new cases + existing); `tsc -b` / `eslint` / `vite build` clean
- [ ] `supabase db reset` + a pgTAP check that the trigger stamps both columns
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                        | Type   | Stories                                                                 | Objective                                                        |
| --------------------------- | ------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 042-settings-ai-remediation | Simple | 001-settings-ui-reflects-config-no-hang, 002-ai-config-write-provenance | The two settings-client fixes + the provenance trigger migration |

Sequence: standalone. Independent of bolts 040 / 041 (no shared files) — can run in parallel
or any time after `007`.

---

## Notes

Smallest unit in the intent. The only cross-surface subtlety: FR-5's `callClaude` abort
timeout (≈60 s) should sit comfortably above FR-4's server-side SDK `timeout` (~⅓ of the Edge
platform limit), so the server's typed `timeout` error is what the user normally sees, and the
client abort is only the backstop for a truly wedged function.
