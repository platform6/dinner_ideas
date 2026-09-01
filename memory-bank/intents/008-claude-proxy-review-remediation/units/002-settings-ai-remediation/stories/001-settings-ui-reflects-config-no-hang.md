---
id: 001-settings-ui-reflects-config-no-hang
unit: 002-settings-ai-remediation
intent: 008-claude-proxy-review-remediation
status: complete
priority: should
created: '2026-08-31T21:00:00Z'
assigned_bolt: 042-settings-ai-remediation
implemented: true
---

# Story: 001-settings-ui-reflects-config-no-hang

## User Story

**As** a household owner on `/settings`
**I want** the daily-limit field to show my saved value and Test Connection to never spin forever
**So that** I can trust what the page tells me and always get an answer from the button

## Context

Three client defects from the `007` review:

- **Stale daily-limit field** (`ClaudeAiCard.tsx:213`): `<Input type="number"
defaultValue={config.data?.dailyCallLimit ?? 25}>` is uncontrolled — `defaultValue` is read
  once on mount, before `['ai-config']` resolves, and later changes are ignored. An owner who
  set 5 sees 25. (Finding 1.)
- **No client timeout** (`src/features/ai/api.ts:71`): `callClaude`'s `fetch` has no
  `AbortController`. A hung `claude-proxy` leaves the promise pending forever; Test Connection
  stays in `loading` with no error. (Finding 8.)
- **Dead effect** (`ClaudeAiCard.tsx:53`): `useEffect(() => () => setKeyInput(''), [])` runs
  only on unmount, when state is discarded anyway; `saveKey.onSuccess` already clears the
  field. The comment implies a security property it doesn't provide. (Finding 10.)

## Acceptance Criteria

- [ ] **Given** an owner whose saved `dailyCallLimit` is `5`, **When** `/settings` loads and
      `['ai-config']` resolves, **Then** the "Daily call limit" field shows `5`, not `25`.
- [ ] **Given** the field, **When** the owner edits it and blurs, **Then** `saveLimit.mutate`
      is still called with the same integer/`>= 0` validation as today.
- [ ] **Given** the field before the query resolves, **When** the card renders, **Then** it
      shows a loading affordance or the resolved value — never a hard-coded `25` that then
      fails to update. (Controlled input, `config.isSuccess` gate, or `key`-on-value — impl
      choice.)
- [ ] **Given** `callClaude`, **When** the `fetch` does not settle within a bounded timeout
      (≈60 s), **Then** the request is aborted via `AbortController` and `callClaude` rejects
      with `ClaudeError('timeout', <message>)`.
- [ ] **Given** Test Connection with the proxy stubbed to hang, **When** the timeout fires,
      **Then** the button leaves `loading` and the card shows the mapped timeout message
      (reusing the existing `timeout` → message path).
- [ ] **Given** a normal fast response, **When** Test Connection runs, **Then** behaviour is
      unchanged (no early abort, same success rendering).
- [ ] **Given** the card, **When** it mounts/unmounts, **Then** there is no unmount-only
      key-clearing `useEffect`; entering a key, saving it, and the clear-on-success behaviour
      are unchanged and still covered by tests.

## Technical Notes

- Field: simplest is a controlled `value` bound to local state seeded from `config.data`
  via `useEffect`/`useState` on `config.data?.dailyCallLimit`, or gate the whole owner-controls
  block on `config.isSuccess`. Keep the `onBlur` → `saveLimit.mutate` path.
- `callClaude`: `const ac = new AbortController(); const t = setTimeout(() => ac.abort(),
CLIENT_TIMEOUT_MS); … fetch(url, { …, signal: ac.signal }) … finally clearTimeout(t)`.
  Map `err.name === 'AbortError'` → `new ClaudeError('timeout', 'The AI service took too long
to respond.')`. `'timeout'` is already in `KNOWN_CODES` / the mapping.
- `CLIENT_TIMEOUT_MS` (≈60 s) sits above FR-4's server SDK `timeout` (~⅓ of the Edge platform
  limit) so the server's typed `timeout` is the normal path and the client abort is the
  backstop.
- Delete lines 53 + comment in `ClaudeAiCard.tsx`.

## Dependencies

### Requires

- None new. Pairs with unit `001` FR-4 (server timeout) but does not depend on it — can land
  independently.

### Enables

- `002-ai-config-write-provenance` shares `ClaudeAiCard.tsx` / `settings/api.ts`; same bolt (042).

## Edge Cases

| Scenario                                                  | Expected Behaviour                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `['ai-config']` query errors                              | Existing error handling on the card; the field is not shown as a false `25`                     |
| Owner clears the field to empty                           | Existing `Number.isInteger(n) && n >= 0` guard — no mutate on invalid                           |
| `callClaude` aborts due to real network drop (not a hang) | Still surfaces as an error; `AbortError` vs network error both map to a shown message           |
| A very slow but legitimate response just under 60 s       | Completes normally; tune `CLIENT_TIMEOUT_MS` if Test Connection ever legitimately approaches it |

## Out of Scope

- Server-side changes (unit `001`).
- Adding retry to `callClaude`.
- Redesigning the card or the daily-limit control.
