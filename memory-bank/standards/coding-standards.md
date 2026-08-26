# Coding Standards

## Overview

Lightweight, low-friction standards suited to a small solo/personal project — optimized for shipping quickly and consistently rather than enterprise-grade rigor.

## Code Formatting

**Tool**: Prettier (defaults)
**Key Settings**:
- Indentation: 2 spaces
- Semicolons: yes
- Quotes: single

**Enforcement**: Pre-commit hook via `husky` + `lint-staged` — formatting is automatic, never a manual step.

## Linting

**Tool**: ESLint
**Base Config**: `@typescript-eslint/recommended` + `eslint-plugin-react-hooks`
**Strictness**: Balanced (not `strict` mode)

**Key Rules**:
- `any` type: discouraged (warn), not banned — pragmatic over rigorous for a hobby-scale project
- Unused variables: error
- React hooks rules (`rules-of-hooks`, `exhaustive-deps`): error

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `selectedDinners`, `isLoading` |
| Functions | camelCase | `getShoppingList`, `filterDinners` |
| Components | PascalCase | `DinnerCard`, `WeeklyPlanner` |
| Types/Interfaces | PascalCase | `Dinner`, `ShoppingListItem` |
| Constants | UPPER_SNAKE | `MAX_DINNERS_PER_WEEK` |
| React hooks | camelCase with `use` | `useWeeklyPlan`, `useDinners` |

**File Naming**:
- Components: PascalCase (`DinnerCard.tsx`)
- Utilities/hooks: kebab-case (`shopping-list.ts`, `use-dinners.ts`)
- Tests: co-located, `*.test.ts(x)`

## File Organization

**Pattern**: Feature-based

**Structure**:
```text
src/
  features/
    dinners/        # browsable/filterable dinner catalog
    weekly-plan/     # pick-3 flow + shopping list generation
    auth/            # shared household login
  shared/
    components/      # cross-feature UI (buttons, layout)
    lib/             # supabase client, generated DB types
```

**Conventions**:
- Tests: co-located next to the code they cover
- Types: co-located within each feature, shared types in `shared/lib`
- Barrel exports (`index.ts`): only where it meaningfully reduces import noise, not mandatory

## Testing Strategy

**Framework**: Vitest + React Testing Library
**Coverage Target**: No formal percentage — this is a personal-scale app. Focus tests on logic that's genuinely risky to get wrong.

**Test Types**:

| Type | Tool | When to Use |
|------|------|-------------|
| Unit | Vitest | Shopping-list ingredient aggregation/merging, "exactly 3 picks" validation, filter logic |
| Component | React Testing Library | Key interactive flows (selecting a dinner, copying the shopping list) |

**Conventions**:
- Test naming: `describe`/`it('should ...')`
- Mock strategy: mock Supabase client at the boundary; don't mock internal app logic
- Skip exhaustive UI snapshot testing — low value at this scale

## Error Handling

**Pattern**: Plain `try/catch` around Supabase calls — no custom error class hierarchy (not warranted at this scale)

**Custom Errors**: No

**API Errors**: Supabase client errors are caught and mapped to short, user-facing inline messages (e.g. "Couldn't save your picks, try again") — no raw error objects shown in the UI

## Logging

**Tool**: `console.error` / `console.warn` only — no logging service
**Format**: Plain text

**Levels**:

| Level | Usage |
|-------|-------|
| error | Failed Supabase operations, unexpected exceptions |
| warn | Recoverable but unexpected states |

**Rules**:
- Never log: passwords, auth tokens, session data
