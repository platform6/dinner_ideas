---
last_updated: 2026-08-27T05:35:00Z
total_decisions: 2
---

# Decision Index

This index tracks all Architecture Decision Records (ADRs) created during Construction bolts.
Use this to find relevant prior decisions when working on related features.

## How to Use

**For Agents**: Scan the "Read when" fields below to identify decisions relevant to your current task. Before implementing new features, check if existing ADRs constrain or guide your approach. Load the full ADR for matching entries.

**For Humans**: Browse decisions chronologically or search for keywords. Each entry links to the full ADR with complete context, alternatives considered, and consequences.

---

## Decisions

### ADR-1: Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement

- **Status**: accepted
- **Date**: 2026-08-26
- **Bolt**: 002-weekly-planning (weekly-planning)
- **Path**: `bolts/002-weekly-planning/adr-001-db-enforced-domain-invariants.md`
- **Summary**: This app has no backend server, so business-rule enforcement (not just access control) has nowhere to live except the database. Decided to enforce domain invariants (max-3 selections, exactly-3-to-lock, immutability after lock) via Postgres triggers, plus a single-purpose RPC function for the one action that needs atomicity (locking).
- **Read when**: Implementing any domain rule that must hold regardless of caller (state machines, cross-row counts, "exactly N" or "immutable once X" rules) in a unit backed by Supabase with no application server — check whether triggers/RPC functions are the right fit before reaching for client-side-only validation.

### ADR-2: Derived/History Writes on a State Transition Belong in a Trigger, Not the "Normal" RPC

- **Status**: accepted
- **Date**: 2026-08-27
- **Bolt**: 010-weekly-planning (weekly-planning)
- **Path**: `bolts/010-weekly-planning/adr-002-history-writes-belong-in-triggers.md`
- **Summary**: A derived write tied to a state transition (writing `meal_history` when a plan locks) was first designed inside the RPC every client call happens to use — but RLS permits other paths to cause the same transition. Decided to write it from an `AFTER UPDATE` trigger keyed on the transition itself, matching the existing exactly-3-on-lock trigger, so it fires regardless of caller.
- **Read when**: Adding any write (not just validation) that must happen whenever a row transitions between states (e.g. "record X whenever Y gets locked/approved/completed") in a Supabase-direct unit with no application server — check whether the write belongs on the transition (trigger) rather than inside whichever RPC/function is today's normal caller.
