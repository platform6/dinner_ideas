---
intent: 001-weekly-dinner-planner
phase: inception
status: context-defined
updated: 2026-08-26T17:25:27Z
---

# Weekly Dinner Planner - System Context

## System Overview

A single-page web app (installable as a PWA) where the wife browses a seeded dinner catalog, filters/sorts it, picks exactly 3 dinners for the week, and gets a category-grouped shopping list she copies and texts to her husband manually — there is no automated SMS/messaging integration. All data lives in Supabase (Postgres), accessed directly from the browser.

## Context Diagram

```mermaid
C4Context
    title System Context - Weekly Dinner Planner

    Person(wife, "Wife", "Browses dinners, picks 3/week, copies shopping list")
    Person(husband, "Husband", "Receives shopping list via text (outside the system)")
    System(app, "Weekly Dinner Planner", "PWA: catalog, filters, weekly picks, shopping list")
    SystemDb_Ext(supabase, "Supabase", "Postgres + Auth + RLS")

    Rel(wife, app, "Uses (browser/PWA)")
    Rel(app, supabase, "Reads/writes dinners, weekly plans, selection history")
    Rel(wife, husband, "Copies & texts shopping list (manual, outside system)")
```

## External Integrations

- **Supabase**: The only external system — provides Postgres (dinner catalog, weekly plans, selection history), Auth (shared household login), and Row Level Security (access enforcement). Accessed directly from the browser via `@supabase/supabase-js`.

No SMS/texting API integration — "text to husband" is a manual clipboard-copy action performed by the user in their own messaging app, not a feature the system automates.

## High-Level Constraints

- No custom backend server — all logic runs client-side; Supabase is the only system boundary.
- Single shared household login (Supabase Auth) — no per-user roles or multi-tenant concerns.
- Must work well as an installed PWA on a phone (primary usage context).

## Key NFR Goals

- Client-side filtering feels instant against a small (tens-of-rows) catalog.
- Access control enforced entirely via Supabase RLS policies.
- No formal uptime/scalability targets — household-scale usage.
