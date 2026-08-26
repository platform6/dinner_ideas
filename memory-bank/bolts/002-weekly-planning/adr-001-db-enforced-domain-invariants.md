---
bolt: 002-weekly-planning
created: 2026-08-26T18:29:12Z
status: accepted
superseded_by: null
---

# ADR-001: Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement

## Context

`standards/system-architecture.md` already establishes that this app has no custom backend server — it's a client-heavy SPA talking directly to Supabase, with RLS as the only access-control boundary. That decision covers *authorization* ("who can read/write what"), but this bolt surfaces a related, previously undocumented question: where do *business rules* (domain invariants) live when there's no application server to hold them?

The weekly-planning domain has three such invariants: a plan never holds more than 3 selections, a plan can only lock with exactly 3 selections, and a locked plan (and its selections) becomes permanently immutable. These aren't access-control rules — they're true domain logic, but they still can't live in a server-side service layer, because there isn't one. There's also a race-safety requirement: two near-simultaneous "lock" attempts must not both succeed.

## Decision

Enforce domain invariants directly in Postgres, using two mechanisms:

- **Triggers** for state-transition rules that must hold on every write, regardless of which client or code path performs it (max-3 selections, immutability after lock, exactly-3-to-lock).
- **A single-purpose RPC function** (`lock_weekly_plan`) for the one action that needs to be atomic and produce a clear, idempotent result (locking), rather than exposing it as a raw `PATCH` that every caller would need to get right.

## Rationale

Client-side (React) validation is real and present for UX responsiveness, but it is explicitly *not* the source of truth — it's a convenience layer only. The database is the only component every write path (this app today, any future client, any admin/SQL access) must pass through, so it's the only place these invariants can be reliably guaranteed.

### Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Client-side validation only | Simple, fast to build, no SQL/PLpgSQL needed | Any other client, script, or direct DB access could violate the rules; race conditions unguarded | Doesn't hold up without a server — RLS/DB is the only real enforcement boundary in this architecture |
| A minimal custom backend (e.g. a single Edge Function) just for this logic | Familiar imperative code (TypeScript) instead of PL/pgSQL | Reintroduces a server layer this project deliberately avoided (`system-architecture.md`); disproportionate for 3 small rules | Contradicts the existing BaaS-direct architecture decision for no clear benefit at this scale |
| Deferred/declarative constraints only (`CHECK`, `UNIQUE`) | No trigger code to write or maintain | Can't express cross-row invariants (e.g. "count of related rows = 3") or state-transition rules (e.g. "can't go from locked back to anything") declaratively | Insufficient expressiveness for these specific rules |

## Consequences

### Positive

- Invariants hold no matter what calls the database — the current PWA, a future admin tool, or direct SQL.
- Race conditions are handled for free via Postgres's normal row-level locking during concurrent `UPDATE`s.
- Establishes a reusable pattern: future units needing similar rules (state machines, cross-row counts) have working precedent to follow instead of re-deriving the approach.

### Negative

- Business logic is split across two places (PL/pgSQL triggers/functions in `supabase/migrations/`, and TypeScript client-side validation for UX) — a developer must know to look in both.
- PL/pgSQL is less familiar to a TypeScript-first team than application code would be.

### Risks

- If this project ever does add a real backend server, some of this trigger logic would need to be reconciled with (not necessarily replaced by) application-layer logic. Low risk at present — no such plans exist.

## Related

- **Stories**: `002-enforce-exactly-three-immutable` (unit `002-weekly-planning`)
- **Standards**: Extends `standards/system-architecture.md`'s "no backend server" decision to cover business-rule enforcement, not just access control — worth folding into that standard if a similar pattern recurs in a later unit.
- **Previous ADRs**: None (first ADR in this project).
