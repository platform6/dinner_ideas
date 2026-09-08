---
intent: 016-feeling-lucky
phase: inception
status: context-defined
updated: '2026-09-07T04:10:00Z'
---

# I'm Feeling Lucky — System Context

## System Overview

Client-side only. No migration, no new table, no new query shape, no Edge Function. Everything it
reads is already loaded by the catalog, and everything it writes goes through the selection path
that hand-picking already uses.

## Context Diagram

```mermaid
flowchart TB
    user([Household member])

    subgraph pwa["React PWA"]
        catalog["/dinners — CatalogPage<br/>+ lucky control (NEW)"]
        draw["weighted draw (NEW)<br/>pure, testable, seedable"]
        plan["/plan — current selections"]
    end

    subgraph db["Supabase Postgres (all existing)"]
        dinners[("dinners — is_active")]
        lc[["dinner_last_chosen<br/>view: dinner_id, last_chosen_date"]]
        hh[("households.dinners_per_week<br/>from intent 015")]
        sel[("weekly_plan_selections")]
        trg{{"selection cap trigger<br/>enforces N — intent 015"}}
    end

    user --> catalog
    catalog --> draw
    dinners -.->|candidates| draw
    lc -.->|recency| draw
    hh -.->|N| draw
    plan -.->|already picked| draw
    draw -->|fills empty slots| sel
    sel --> trg
```

## The one piece of real design

**The draw itself should be a pure function** — candidates plus recency in, chosen dinners out —
kept out of the component. That makes it testable with a seeded random source, which matters
because "is this actually random, and actually biased the right way?" is otherwise unfalsifiable.

A component that calls `Math.random()` inline cannot be tested for either property. Inject the
source.

## Why weighted rather than a cutoff

A hard "nothing eaten in the last N weeks" rule is easier to test but runs out of candidates on a
small catalog, and needs an N nobody has a principled value for. Weighting degrades gracefully: as
the eligible pool shrinks, recently-eaten dinners become reachable again instead of the feature
failing.

It must stay a **draw**, though. If pressing twice always gives the same answer, this is a sorted
list wearing a button's clothes — and the user asked for lucky.

## What it must not do

| Thing                  | Why                                                           |
| ---------------------- | ------------------------------------------------------------- |
| Overrule suppression   | `is_active = false` is a user decision (intent 001 FR-7)      |
| Replace existing picks | Intent 009's Clear Picks already owns destructive resetting   |
| Enforce the cap itself | Intent 015's trigger does; this feature must not duplicate it |
| Touch a locked plan    | Intent 012 owns locking; the triggers reject it anyway        |
