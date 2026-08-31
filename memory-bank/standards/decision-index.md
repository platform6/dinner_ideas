---
last_updated: 2026-08-29T03:50:00Z
total_decisions: 3
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

### ADR-3: One-Time Cutover of Existing Data Into a Single Founding Household

- **Status**: accepted
- **Date**: 2026-08-29
- **Bolt**: 030-household-data-model (household-data-model)
- **Path**: `bolts/030-household-data-model/adr-003-one-founding-household-model-cutover.md`
- **Summary**: Intent 004 replaced the single shared login with a three-tier `auth.users → profiles → households` model and household-scoped RLS, leaving all pre-004 data with a null `household_id`. Decided on a single forward migration that resolves the founding owner by email (`garrett.peter.conn@gmail.com`) and aborts loudly if absent, creates one founding household with a fixed UUID, stamps (not re-seeds) `household_id` onto existing rows, then sets the columns `NOT NULL` — idempotent for dev, forward-only for production.
- **Read when**: Writing a migration that folds pre-existing global/single-tenant data into a new ownership/tenancy model, backfilling a new not-null FK across live tables, or choosing how to pick an owner for legacy data — prefer an explicit lookup with a hard failure over guessing, use a fixed id for idempotency, and stamp existing rows rather than re-seeding. Also relevant when reasoning about the account model, `current_user_household_id()`, or why the `026→030` migrations must ship together.
