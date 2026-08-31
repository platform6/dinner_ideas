---
id: 003-owner-ai-controls
unit: 002-settings-ui
intent: 007-claude-integration
status: complete
priority: must
created: '2026-08-31T16:35:00Z'
assigned_bolt: 039-settings-ui
implemented: true
---

# Story: 003-owner-ai-controls

## User Story

**As a** household owner
**I want** to set my household's own Claude API key (and optionally its model and daily call
limit)
**So that** my household can use Claude at all — there is no shared key — while those controls
stay invisible and unwritable to non-owner members

## Acceptance Criteria

- [ ] **Given** `useAuth.role === 'owner'`, **Then** the "Claude / AI" card also shows: an
      **API key** section, a **Model** select, and a **Daily call limit** number input
- [ ] **Given** `useAuth.role !== 'owner'`, **Then** none of those three controls render (only
      Test Connection from story 002)
- [ ] **Given** the **API key** section with no key set, **Then** it shows "No key set —
      Claude is off for this household" and a password input + **Save key**
- [ ] **Given** an owner enters a key and presses **Save key**, **Then** it calls
      `supabase.rpc('set_household_ai_key', { p_key })`; on success the section shows
      "Key set ✓" and a **Clear key** button; the entered value is cleared from component
      state immediately and never re-displayed
- [ ] **Given** **Clear key**, **Then** it calls `rpc('clear_household_ai_key')` and the
      section returns to "No key set — Claude is off for this household"
- [ ] **Given** the **Model** select, **Then** options are "Default (Sonnet 5)" +
      `claude-sonnet-5` / `claude-haiku-4-5` / `claude-opus-5`; choosing one does
      `update household_ai_config set model_override = ...` (or `null` for Default)
- [ ] **Given** the **Daily call limit** input, **Then** changing it does
      `update household_ai_config set daily_call_limit = ...` (integer ≥ 0)
- [ ] **Given** the config row does not exist yet, **Then** the first owner write first-touches
      it (upsert) so defaults apply cleanly
- [ ] **Given** a non-owner somehow issues these writes (devtools), **Then** the server (RLS /
      the `security definer` owner check) rejects them — verified by a test that asserts the
      client gate is not the only gate
- [ ] **Given** `src/features/settings/*.test.tsx`, **Then** tests cover: owner sees all three
      controls, non-owner sees none; save-key → "Key set ✓" and state cleared; clear-key →
      "No key set — Claude is off"; model + limit updates issue the right mutation — with
      Supabase mocked

## Technical Notes

- Reads: a `useHouseholdAiConfig` hook selecting
  `model_override, daily_call_limit, key_secret_id is not null as key_set` from
  `household_ai_config` (RLS lets any member read; the controls are still owner-gated in the
  UI).
- Writes: `rpc` for the key (never a table write for key material); plain `update` for
  `model_override` / `daily_call_limit`.
- The password input must have `autocomplete="off"` and be `type="password"`; do not persist
  the value to any store; clear on submit and on unmount.
- Debounce or on-blur the daily-limit write; optimistic UI optional.
- Show a small inline error if a mutation fails (e.g. permission denied) — reuse the app's
  existing toast/inline-error pattern.

## Dependencies

### Requires

- `002-settings-route-and-test-connection` — the card this extends
- `001-claude-proxy-service` — `set_household_ai_key` / `clear_household_ai_key` RPCs,
  `household_ai_config` RLS (owner-only writes)
- `004-account-model` (complete) — `useAuth.role`

### Enables

- A household to run Test Connection (and later features) on its own key

## Edge Cases

| Scenario                                            | Expected Behavior                                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Owner saves an obviously bad key                    | `set` succeeds (no validation of key shape); the next Test Connection returns `upstream_error` → friendly message; owner can Clear |
| `daily_call_limit` set to 0                         | Accepted; Test Connection then returns `rate_limited` — documented as "AI off for this household"                                  |
| Two owners edit concurrently                        | Last write wins on `household_ai_config`; acceptable for v1                                                                        |
| Role changes from owner to member while on the page | Controls disappear on next render / refetch                                                                                        |

## Out of Scope

- Validating the key against Anthropic on save (deferred; Test Connection is the check)
- Per-feature model overrides (only a household-wide default override here)
- Showing usage / cost figures on the card
- Key rotation reminders / expiry handling
