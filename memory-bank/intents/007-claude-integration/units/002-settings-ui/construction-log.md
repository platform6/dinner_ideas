---
unit: 002-settings-ui
intent: 007-claude-integration
created: '2026-08-31T19:00:00Z'
last_updated: '2026-08-31T19:35:00Z'
---

# Construction Log: settings-ui

## Original Plan

**From Inception**: 1 bolt planned (2026-08-31)

| Bolt ID         | Stories       | Type                     |
| --------------- | ------------- | ------------------------ |
| 039-settings-ui | 001, 002, 003 | simple-construction-bolt |

Executed as planned, no replanning.

## Replanning History

| Date | Action | Change | Reason | Approved |
| ---- | ------ | ------ | ------ | -------- |
| —    | —      | —      | —      | —        |

## Current Bolt Structure

| Bolt ID         | Stories       | Status       | Changed |
| --------------- | ------------- | ------------ | ------- |
| 039-settings-ui | 001, 002, 003 | ✅ completed | -       |

## Notes

- `src/features/ai/api.ts` (`callClaude` + `ClaudeError`), `src/features/settings/`
  (`api.ts`, `SettingsPage.tsx`, `ClaudeAiCard.tsx`), `/settings` route in `App.tsx`, a
  Settings link in `Layout.tsx` (rail foot + mobile header), `uiIcons.settings`.
- `database.types.ts` regenerated from local (`household_ai_config`, `ai_usage_log`, the key
  RPCs).
- `vite.config.ts` `test.include` scoped to `src/**` so Vitest ignores the Deno function test.
- Verified: `tsc -b`, `eslint`, `vite build` clean; `vitest run` 24 files / 173 tests
  (148 prior + 25 new).

## Decisions

| Date       | Decision                                                           | Rationale                                                                                                      |
| ---------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 2026-08-31 | `fetch` in `callClaude`, not `supabase.functions.invoke`           | precise HTTP status + error-body mapping to `ClaudeErrorCode`; session token from `supabase.auth.getSession()` |
| 2026-08-31 | react-query used inside `ClaudeAiCard` (no separate `hooks.ts`)    | single consumer; `useQuery(['ai-config'])` + 4 `useMutation`s                                                  |
| 2026-08-31 | Settings is a utility link (rail foot / header), not in `navItems` | matches "Store setup" — the tab bar stays 4 items                                                              |
