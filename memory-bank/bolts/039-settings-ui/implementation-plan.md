---
stage: plan
bolt: 039-settings-ui
unit: 002-settings-ui
created: '2026-08-31T19:00:00Z'
---

## Implementation Plan: settings-ui (bolt 039)

`simple-construction-bolt` — client plumbing over the bolt-038 `claude-proxy` contract and the
bolt-037 RPCs. Chakra UI v2, React Router v6, feature-folder convention, Vitest + RTL,
`renderWithProviders`.

### Stories → files

**001-claude-api-client**

- `src/features/ai/api.ts`
  - `ClaudeErrorCode` union: `no_session | no_household | no_api_key | rate_limited |
bad_request | upstream_error | timeout`
  - `class ClaudeError extends Error { code: ClaudeErrorCode }`
  - `callClaude({ feature, system?, messages, model?, maxTokens? }) → { text, model,
usage: { inputTokens, outputTokens }, latencyMs }`
    - `supabase.auth.getSession()`; no session → throw `ClaudeError('no_session')`
    - `fetch(${VITE_SUPABASE_URL}/functions/v1/claude-proxy, { POST, Authorization: Bearer
<access_token>, body: {feature, system, messages, model, max_tokens} })`
    - network throw → `ClaudeError('upstream_error')`
    - `res.status === 401` → `ClaudeError('no_session')`
    - `!res.ok` → map `body.error_code` if in the known set else `upstream_error`; use
      `body.message`
    - 200 but shape wrong → `ClaudeError('upstream_error')`
    - map `usage.input_tokens/output_tokens` → camelCase
- `src/features/ai/api.test.ts` — mock `global.fetch` + `supabase.auth.getSession`; happy
  path, each error code, network error, no session, 401, bad 200 shape.

**002-settings-route-and-test-connection**

- `src/features/settings/api.ts` — `fetchAiConfig()`, `setHouseholdKey(key)`,
  `clearHouseholdKey()`, `updateAiConfig(householdId, patch)` (thin `supabase` wrappers,
  matches `store-config/api.ts` style).
- `src/features/settings/SettingsPage.tsx` — page shell: heading + `<ClaudeAiCard />`. Room
  for more cards later (household `dinners_per_week` is a future intent).
- `src/features/settings/ClaudeAiCard.tsx` — the card. **Test Connection** button (any
  member) → `callClaude({ feature: 'connection_test', messages: [{ role: 'user', content:
'ping' }], maxTokens: 16 })`; loading state; on success `✓ Connected — {model}, {N} ms`; on
  `ClaudeError` a mapped friendly line; button disabled while in flight.
- `src/App.tsx` — `<Route path="/settings" element={<SettingsPage />} />` inside the existing
  `<AuthGate><Layout>` shell.
- `src/shared/components/icons.tsx` — add `settings: Settings` (lucide) to `uiIcons`.
- `src/shared/components/Layout.tsx` — add a **Settings** link: in the desktop rail foot
  (next to "Store setup" / "Log out") and in the mobile header `HStack` (an `IconButton` next
  to "Store setup" / "Log out"). `navItems` (the tab bar / rail body) is unchanged — settings
  is a utility link, like Store setup.

**003-owner-ai-controls**

- Extend `ClaudeAiCard.tsx`: when `useAuth().role === 'owner'`, also render
  - **API key** — `type=password` input + **Save key** / **Clear key**;
    `setHouseholdKey` / `clearHouseholdKey`; shows "Key set ✓" / "No key set — Claude is off
    for this household"; the entered value is cleared from state on submit and on unmount;
    never rendered back.
  - **Model** — `Select` over `['', 'claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5']`
    ('' = "Default (Sonnet 5)") → `updateAiConfig(householdId, { model_override: value ||
null })`.
  - **Daily limit** — number input → `updateAiConfig(householdId, { daily_call_limit: n })`
    on blur.
  - non-owner: none of the three render; a one-line note "Ask a household owner to add a
    Claude API key." The server (RLS + `security definer` owner check) is the real gate.
- `src/features/settings/ClaudeAiCard.test.tsx` — `vi.mock('@/features/ai/api')` +
  `vi.mock('@/features/settings/api')` + a `useAuth` mock. Cases: Test Connection
  loading→success text; each `ClaudeError.code` → its message; button disabled during call;
  owner sees key/model/limit, non-owner sees none; Save key → "Key set ✓" + input cleared;
  Clear key → "No key set"; model + limit changes call `updateAiConfig`.

### Data-model touch

- `src/shared/lib/database.types.ts` regenerated from the local schema (adds
  `household_ai_config`, `ai_usage_log`, `set_/clear_household_ai_key`, `resolve_ai_key`).
  Done at the start of this bolt.

### Out of scope (unchanged from the unit brief)

Streaming; retries; a usage/cost view; validating the key on save (Test Connection is the
check); any AI feature that _uses_ `callClaude` (→ intent 008); other settings cards.

### Risks

- `supabase.functions.invoke` vs raw `fetch`: chose `fetch` for precise status/error mapping.
- `updateAiConfig` uses `upsert` on `household_ai_config` — bolt 037 granted `authenticated`
  column-scoped `insert`/`update` on exactly `household_id, model_override, daily_call_limit,
updated_at, updated_by` and RLS gates it to owners; `key_secret_id` is not in the grant.
